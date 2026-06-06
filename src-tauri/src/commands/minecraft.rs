use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tauri::Emitter;
use super::version_manager::{versions_dir, libraries_dir, assets_dir, build_classpath, get_version_meta};
use super::jvm::{find_java, java_base_dir};

lazy_static::lazy_static! {
    static ref RUNNING: Arc<Mutex<HashMap<String, u32>>> = Arc::new(Mutex::new(HashMap::new()));
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LaunchResult {
    pub success: bool,
    pub pid: Option<u32>,
    pub message: String,
}

fn instance_dir(id: &str) -> PathBuf {
    let mut p = dirs_next::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    p.push("PortalLauncher"); p.push("instances"); p.push(id); p
}

fn get_auth_info() -> (String, String, String) {
    let profile_path = dirs_next::data_local_dir().unwrap_or_else(|| PathBuf::from(".")).join("PortalLauncher").join("auth.json");
    std::fs::read_to_string(&profile_path).ok()
        .and_then(|d| serde_json::from_str::<serde_json::Value>(&d).ok())
        .map(|v| (
            v["username"].as_str().unwrap_or("Player").to_string(),
            v["uuid"].as_str().unwrap_or("00000000-0000-0000-0000-000000000000").to_string(),
            v["access_token"].as_str().unwrap_or("0").to_string(),
        ))
        .unwrap_or_else(|| ("Player".to_string(), "00000000-0000-0000-0000-000000000000".to_string(), "0".to_string()))
}

fn select_java(version_id: &str, loader: &str, custom_java_path: &str) -> String {
    if !custom_java_path.is_empty() && std::path::Path::new(custom_java_path).exists() {
        return custom_java_path.to_string();
    }
    // Determine required Java major version
    let java_major = required_java_version(version_id);

    // Try managed Java first
    let managed = java_base_dir();
    for entry in std::fs::read_dir(&managed).into_iter().flatten().flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.contains(&format!("java{}", java_major)) || name.contains(&format!("jdk-{}", java_major)) {
            let bin = if cfg!(windows) {
                entry.path().join("bin").join("java.exe")
            } else {
                entry.path().join("bin").join("java")
            };
            if bin.exists() { return bin.to_string_lossy().to_string(); }
        }
    }

    find_java(java_major)
}

pub fn required_java_version(version_id: &str) -> u32 {
    // Parse major version from MC version string
    let parts: Vec<u32> = version_id.split('.').filter_map(|p| p.parse().ok()).collect();
    let minor = parts.get(1).copied().unwrap_or(0);
    if minor <= 16 { 8 } else if minor <= 17 { 16 } else if minor <= 20 { 17 } else { 21 }
}

#[tauri::command]
pub async fn launch_instance(app: tauri::AppHandle, instance_id: String) -> Result<LaunchResult, String> {
    let instance_dir = instance_dir(&instance_id);
    let cfg_path = instance_dir.join("instance.json");
    let cfg: serde_json::Value = std::fs::read_to_string(&cfg_path)
        .map_err(|_| format!("Instance {} not found. Create it first.", instance_id))
        .and_then(|d| serde_json::from_str(&d).map_err(|e| e.to_string()))?;

    let mc_version = cfg["mc_version"].as_str().unwrap_or("").to_string();
    let loader = cfg["loader"].as_str().unwrap_or("vanilla").to_string();
    let min_ram = cfg["min_ram"].as_u64().unwrap_or(1024);
    let max_ram = cfg["max_ram"].as_u64().unwrap_or(4096);
    let custom_java = cfg["java_path"].as_str().unwrap_or("").to_string();
    let jvm_args_str = cfg["custom_jvm_args"].as_str().unwrap_or("").to_string();

    if mc_version.is_empty() { return Err("Minecraft version not set on this instance.".into()); }

    app.emit("launch-status", serde_json::json!({"instance_id": instance_id,"status":"preparing","message":"Preparing launch..."})).ok();

    // Check if version is downloaded
    let vdir = versions_dir().join(&mc_version);
    if !vdir.join(format!("{}.jar", mc_version)).exists() {
        app.emit("launch-status", serde_json::json!({"instance_id":instance_id,"status":"downloading","message":"Downloading Minecraft..."})).ok();
        super::version_manager::download_minecraft_version(app.clone(), mc_version.clone()).await?;
    }

    let java_path = select_java(&mc_version, &loader, &custom_java);
    if java_path.is_empty() || java_path == "java" {
        let java_major = required_java_version(&mc_version);
        app.emit("launch-status", serde_json::json!({"instance_id":instance_id,"status":"java_missing","message":format!("Java {} not found. Downloading...",&java_major)})).ok();
        super::jvm::download_java(app.clone(), java_major).await.ok();
    }
    let java_exe = select_java(&mc_version, &loader, &custom_java);
    let java_bin = if java_exe.is_empty() { "java".to_string() } else { java_exe };

    app.emit("launch-status", serde_json::json!({"instance_id":instance_id,"status":"classpath","message":"Building classpath..."})).ok();

    let mut classpath = build_classpath(&mc_version)?;

    // If loader is forge/fabric/neoforge, check for loader jars
    let loader_jar = instance_dir.join(format!("{}-loader.jar", loader));
    if loader_jar.exists() && loader != "vanilla" {
        let sep = if cfg!(windows) { ";" } else { ":" };
        classpath = format!("{}{}{}", loader_jar.to_string_lossy(), sep, classpath);
    }

    let (main_class, asset_index, extra_jvm_args) = get_version_meta(&mc_version)?;
    let natives_dir = versions_dir().join(&mc_version).join("natives");
    std::fs::create_dir_all(&natives_dir).ok();

    // Extract natives
    let vj_path = vdir.join(format!("{}.json", mc_version));
    if let Ok(data) = std::fs::read_to_string(&vj_path) {
        if let Ok(vj) = serde_json::from_str::<serde_json::Value>(&data) {
            let os_cls = super::version_manager::get_os_name();
            let natives_key = format!("natives-{}", os_cls);
            if let Some(libs) = vj["libraries"].as_array() {
                for lib in libs {
                    if !super::version_manager::check_library_rules(lib) { continue; }
                    if let Some(classifiers) = lib["downloads"]["classifiers"].as_object() {
                        if let Some(nat) = classifiers.get(&natives_key) {
                            let lib_path = libraries_dir().join(nat["path"].as_str().unwrap_or(""));
                            if lib_path.exists() { extract_natives(&lib_path, &natives_dir); }
                        }
                    }
                }
            }
        }
    }

    let (username, uuid, access_token) = get_auth_info();
    let assets_dir_path = assets_dir();

    // Determine asset mode (virtual or new style)
    let asset_mode = check_asset_mode(&mc_version);
    let resource_path = if asset_mode == "virtual" {
        assets_dir_path.join("virtual").join(&asset_index).to_string_lossy().to_string()
    } else {
        assets_dir_path.to_string_lossy().to_string()
    };

    std::fs::create_dir_all(&instance_dir).ok();
    std::fs::create_dir_all(instance_dir.join("logs")).ok();

    let mut cmd_args: Vec<String> = vec![
        format!("-Xms{}m", min_ram),
        format!("-Xmx{}m", max_ram),
        format!("-Djava.library.path={}", natives_dir.to_string_lossy()),
        "-Dfile.encoding=UTF-8".to_string(),
        "-Dstdout.encoding=UTF-8".to_string(),
        format!("-Dminecraft.launcher.brand=PortalLauncher"),
        format!("-Dminecraft.launcher.version=1.2"),
    ];
    cmd_args.extend(extra_jvm_args);
    if !jvm_args_str.is_empty() {
        cmd_args.extend(jvm_args_str.split_whitespace().map(|s| s.to_string()));
    }

    cmd_args.push("-cp".to_string());
    cmd_args.push(classpath);
    cmd_args.push(main_class);

    // Game args
    cmd_args.extend(vec![
        "--username".to_string(), username,
        "--version".to_string(), mc_version.clone(),
        "--gameDir".to_string(), instance_dir.to_string_lossy().to_string(),
        "--assetsDir".to_string(), resource_path,
        "--assetIndex".to_string(), asset_index,
        "--uuid".to_string(), uuid,
        "--accessToken".to_string(), access_token,
        "--clientId".to_string(), "PortalLauncher".to_string(),
        "--xuid".to_string(), "0".to_string(),
        "--userType".to_string(), "msa".to_string(),
        "--versionType".to_string(), "release".to_string(),
    ]);

    app.emit("launch-status", serde_json::json!({"instance_id":instance_id,"status":"launching","message":"Launching Minecraft..."})).ok();

    let mut cmd = std::process::Command::new(&java_bin);
    cmd.args(&cmd_args);
    cmd.current_dir(&instance_dir);
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    let child = cmd.spawn().map_err(|e| format!("Failed to start Java: {e}. Java path: {}", java_bin))?;
    let pid = child.id();

    RUNNING.lock().unwrap().insert(instance_id.clone(), pid);

    let app2 = app.clone();
    let iid = instance_id.clone();
    tokio::task::spawn_blocking(move || {
        let output = child.wait_with_output();
        RUNNING.lock().unwrap().remove(&iid);
        match output {
            Ok(out) => {
                let code = out.status.code().unwrap_or(-1);
                app2.emit("launch-status", serde_json::json!({"instance_id":iid,"status":if code==0{"stopped"}else{"crashed"},"exit_code":code,"message":if code==0{"Game closed"}else{format!("Crashed with code {}", code).as_str()}})).ok();
            }
            Err(e) => { app2.emit("launch-status", serde_json::json!({"instance_id":iid,"status":"error","message":format!("Process error: {e}")})).ok(); }
        }
        // Update last_played in instance.json
        let cfg_p = instance_dir.join("instance.json");
        if let Ok(data) = std::fs::read_to_string(&cfg_p) {
            if let Ok(mut v) = serde_json::from_str::<serde_json::Value>(&data) {
                v["last_played"] = serde_json::Value::String(chrono::Utc::now().to_rfc3339());
                if let Ok(j) = serde_json::to_string_pretty(&v) { std::fs::write(&cfg_p, j).ok(); }
            }
        }
    });

    Ok(LaunchResult { success: true, pid: Some(pid), message: format!("Minecraft {} launched (PID {})", mc_version, pid) })
}

fn check_asset_mode(version_id: &str) -> String {
    let vj = versions_dir().join(version_id).join(format!("{}.json", version_id));
    std::fs::read_to_string(&vj).ok()
        .and_then(|d| serde_json::from_str::<serde_json::Value>(&d).ok())
        .and_then(|v| {
            let ai = &v["assetIndex"];
            if ai["totalSize"].is_null() { Some("virtual".to_string()) } else { None }
        })
        .unwrap_or_else(|| "new".to_string())
}

fn extract_natives(jar_path: &PathBuf, natives_dir: &PathBuf) {
    if let Ok(data) = std::fs::read(jar_path) {
        use std::io::Read;
        if let Ok(mut archive) = zip::ZipArchive::new(std::io::Cursor::new(data)) {
            for i in 0..archive.len() {
                if let Ok(mut entry) = archive.by_index(i) {
                    let name = entry.name().to_string();
                    if name.ends_with(".so") || name.ends_with(".dll") || name.ends_with(".dylib") {
                        let out = natives_dir.join(name.split('/').last().unwrap_or(&name));
                        if !out.exists() {
                            if let Ok(mut f) = std::fs::File::create(&out) {
                                std::io::copy(&mut entry, &mut f).ok();
                            }
                        }
                    }
                }
            }
        }
    }
}

#[tauri::command]
pub async fn kill_instance(instance_id: String) -> Result<(), String> {
    let pid = { RUNNING.lock().unwrap().remove(&instance_id) };
    if let Some(pid) = pid {
        #[cfg(unix)] unsafe { libc::kill(pid as i32, libc::SIGTERM); }
        #[cfg(windows)] { std::process::Command::new("taskkill").args(&["/PID", &pid.to_string(), "/F"]).spawn().ok(); }
    }
    Ok(())
}
