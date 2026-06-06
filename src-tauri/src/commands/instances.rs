use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use std::io::{Write, Read};
use tauri::Emitter;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InstanceMod {
    pub id: String,
    pub name: String,
    pub version: String,
    pub source: String,
    pub enabled: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Instance {
    pub id: String,
    pub name: String,
    pub description: String,
    pub mc_version: String,
    pub loader: String,
    pub loader_version: String,
    pub min_ram: u32,
    pub max_ram: u32,
    pub java_path: String,
    pub custom_jvm_args: String,
    pub play_time_minutes: u64,
    pub last_played: Option<String>,
    pub created_at: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub mods: Vec<InstanceMod>,
}

fn instances_dir() -> PathBuf {
    let mut p = dirs_next::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    p.push("PortalLauncher"); p.push("instances");
    std::fs::create_dir_all(&p).ok(); p
}

fn instance_path(id: &str) -> PathBuf { instances_dir().join(id).join("instance.json") }

fn load_instance(id: &str) -> Option<Instance> {
    serde_json::from_str(&std::fs::read_to_string(instance_path(id)).ok()?).ok()
}

fn save_instance(instance: &Instance) -> Result<(), String> {
    let dir = instances_dir().join(&instance.id);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(dir.join("instance.json"), serde_json::to_string_pretty(instance).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

/// Create the full instance folder structure like a real Minecraft install
fn create_instance_folders(instance_dir: &PathBuf) -> Result<(), String> {
    let folders = [
        "mods", "resourcepacks", "shaderpacks", "datapacks",
        "saves", "config", "logs", "screenshots", "crash-reports",
        "schematics", "scripts", "kubejs/startup_scripts",
        "kubejs/server_scripts", "kubejs/client_scripts",
    ];
    for folder in &folders {
        std::fs::create_dir_all(instance_dir.join(folder)).map_err(|e| e.to_string())?;
    }
    // Create default options.txt
    let options_path = instance_dir.join("options.txt");
    if !options_path.exists() {
        let default_options = "version:3465\ngamma:0.0\nrenderDistance:12\nsimulationDistance:12\nguiScale:0\nfullscreen:false\nsoundCategory_master:1.0\nsoundCategory_music:1.0\n";
        std::fs::write(&options_path, default_options).ok();
    }
    Ok(())
}

#[tauri::command]
pub async fn get_instances() -> Result<Vec<Instance>, String> {
    let dir = instances_dir();
    let mut instances = vec![];
    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                if let Some(inst) = load_instance(&entry.file_name().to_string_lossy()) { instances.push(inst); }
            }
        }
    }
    instances.sort_by(|a, b| b.last_played.cmp(&a.last_played));
    Ok(instances)
}

#[tauri::command]
pub async fn create_instance(
    app: tauri::AppHandle,
    name: String, description: String, mc_version: String,
    loader: String, loader_version: String, min_ram: u32, max_ram: u32, color: Option<String>,
) -> Result<Instance, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let instance = Instance {
        id: id.clone(), name: name.clone(), description, mc_version: mc_version.clone(),
        loader, loader_version, min_ram, max_ram,
        java_path: String::new(), custom_jvm_args: String::new(),
        play_time_minutes: 0, last_played: None,
        created_at: chrono::Utc::now().to_rfc3339(),
        icon: None, color, mods: vec![],
    };
    // Emit progress: creating folders
    app.emit("instance-progress", serde_json::json!({"stage":"creating","name":name,"percent":20,"message":"Creating instance folders..."})).ok();
    let instance_dir = instances_dir().join(&id);
    create_instance_folders(&instance_dir)?;
    app.emit("instance-progress", serde_json::json!({"stage":"saving","name":name,"percent":80,"message":"Saving configuration..."})).ok();
    save_instance(&instance)?;
    app.emit("instance-progress", serde_json::json!({"stage":"done","name":name,"percent":100,"message":"Instance created!"})).ok();
    Ok(instance)
}

#[tauri::command]
pub async fn update_instance(id: String, updates: serde_json::Value) -> Result<Instance, String> {
    let mut inst = load_instance(&id).ok_or("Instance not found")?;
    if let Some(v) = updates["name"].as_str() { inst.name = v.to_string(); }
    if let Some(v) = updates["description"].as_str() { inst.description = v.to_string(); }
    if let Some(v) = updates["min_ram"].as_u64() { inst.min_ram = v as u32; }
    if let Some(v) = updates["max_ram"].as_u64() { inst.max_ram = v as u32; }
    if let Some(v) = updates["java_path"].as_str() { inst.java_path = v.to_string(); }
    if let Some(v) = updates["custom_jvm_args"].as_str() { inst.custom_jvm_args = v.to_string(); }
    if let Some(v) = updates["loader_version"].as_str() { inst.loader_version = v.to_string(); }
    if let Some(v) = updates["color"].as_str() { inst.color = Some(v.to_string()); }
    save_instance(&inst)?;
    Ok(inst)
}

#[tauri::command]
pub async fn delete_instance(id: String) -> Result<(), String> {
    std::fs::remove_dir_all(instances_dir().join(&id)).map_err(|e| format!("Delete: {e}"))
}

#[tauri::command]
pub async fn duplicate_instance(app: tauri::AppHandle, id: String, new_name: String) -> Result<Instance, String> {
    let src_dir = instances_dir().join(&id);
    let mut inst = load_instance(&id).ok_or("Instance not found")?;
    inst.id = uuid::Uuid::new_v4().to_string();
    inst.name = new_name.clone();
    inst.created_at = chrono::Utc::now().to_rfc3339();
    inst.last_played = None;
    inst.play_time_minutes = 0;

    app.emit("instance-progress", serde_json::json!({"stage":"cloning","name":new_name,"percent":10,"message":"Cloning instance..."})).ok();

    let dst_dir = instances_dir().join(&inst.id);
    std::fs::create_dir_all(&dst_dir).map_err(|e| e.to_string())?;
    create_instance_folders(&dst_dir)?;

    // Copy mods, config, resourcepacks, shaderpacks
    for folder in &["mods", "config", "resourcepacks", "shaderpacks", "datapacks", "schematics"] {
        let src = src_dir.join(folder);
        if src.exists() { copy_dir_all(&src, &dst_dir.join(folder)).ok(); }
    }

    app.emit("instance-progress", serde_json::json!({"stage":"saving","name":new_name,"percent":90,"message":"Saving clone..."})).ok();
    save_instance(&inst)?;
    app.emit("instance-progress", serde_json::json!({"stage":"done","name":new_name,"percent":100,"message":"Cloned!"})).ok();
    Ok(inst)
}

fn copy_dir_all(src: &PathBuf, dst: &PathBuf) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() { copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?; }
        else { std::fs::copy(entry.path(), dst.join(entry.file_name()))?; }
    }
    Ok(())
}

#[tauri::command]
pub async fn open_instance_folder(id: String) -> Result<(), String> {
    let dir = instances_dir().join(&id);
    #[cfg(target_os = "windows")] std::process::Command::new("explorer").arg(&dir).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")] std::process::Command::new("open").arg(&dir).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "linux")] std::process::Command::new("xdg-open").arg(&dir).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn export_instance_zip(app: tauri::AppHandle, id: String, dest_path: String) -> Result<String, String> {
    let src_dir = instances_dir().join(&id);
    if !src_dir.exists() { return Err(format!("Instance {} not found", id)); }
    let inst = load_instance(&id).ok_or("Instance not found")?;

    app.emit("instance-progress", serde_json::json!({"stage":"exporting","name":inst.name,"percent":10,"message":"Packing files..."})).ok();

    let dest = if dest_path.is_empty() {
        let n = inst.name.replace(|c: char| !c.is_alphanumeric() && c != '-', "_");
        instances_dir().parent().unwrap_or(&src_dir).join(format!("{}-export.zip", n))
    } else { PathBuf::from(&dest_path) };

    let file = std::fs::File::create(&dest).map_err(|e| format!("Create zip: {e}"))?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::FileOptions::<()>::default()
        .compression_method(zip::CompressionMethod::Deflated).unix_permissions(0o755);
    add_dir_to_zip(&mut zip, &src_dir, &src_dir, &options)?;
    zip.finish().map_err(|e| format!("Zip finish: {e}"))?;

    app.emit("instance-progress", serde_json::json!({"stage":"done","name":inst.name,"percent":100,"message":"Export complete!"})).ok();
    Ok(dest.to_string_lossy().to_string())
}

fn add_dir_to_zip(zip: &mut zip::ZipWriter<std::fs::File>, base: &PathBuf, dir: &PathBuf, options: &zip::write::FileOptions<()>) -> Result<(), String> {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let rel = path.strip_prefix(base).map_err(|e| e.to_string())?.to_string_lossy().replace('\\', "/");
            if path.is_dir() {
                zip.add_directory(&rel, *options).map_err(|e| e.to_string())?;
                add_dir_to_zip(zip, base, &path, options)?;
            } else {
                zip.start_file(&rel, *options).map_err(|e| e.to_string())?;
                zip.write_all(&std::fs::read(&path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn import_instance_zip(app: tauri::AppHandle, zip_path: String, new_name: Option<String>) -> Result<Instance, String> {
    app.emit("instance-progress", serde_json::json!({"stage":"importing","name":new_name.clone().unwrap_or("Instance".into()),"percent":10,"message":"Reading ZIP..."})).ok();
    let zip_file = std::fs::File::open(&zip_path).map_err(|e| format!("Open zip: {e}"))?;
    let mut archive = zip::ZipArchive::new(zip_file).map_err(|e| format!("Read zip: {e}"))?;
    let new_id = uuid::Uuid::new_v4().to_string();
    let dest_dir = instances_dir().join(&new_id);
    std::fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;
    let total = archive.len();
    for i in 0..total {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = dest_dir.join(entry.name());
        if entry.is_dir() { std::fs::create_dir_all(&outpath).ok(); }
        else {
            if let Some(p) = outpath.parent() { std::fs::create_dir_all(p).ok(); }
            let mut outf = std::fs::File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut entry, &mut outf).map_err(|e| e.to_string())?;
        }
        if i % 20 == 0 {
            let pct = 10 + (i as u64 * 80) / total.max(1) as u64;
            app.emit("instance-progress", serde_json::json!({"stage":"extracting","name":"Instance","percent":pct,"message":format!("Extracting {}/{}", i, total)})).ok();
        }
    }
    let json_path = dest_dir.join("instance.json");
    let mut instance: Instance = if json_path.exists() {
        serde_json::from_str(&std::fs::read_to_string(&json_path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?
    } else { return Err("No instance.json in ZIP".to_string()); };
    instance.id = new_id;
    if let Some(name) = new_name { instance.name = name; }
    instance.last_played = None;
    instance.play_time_minutes = 0;
    create_instance_folders(&dest_dir)?;
    save_instance(&instance)?;
    app.emit("instance-progress", serde_json::json!({"stage":"done","name":instance.name,"percent":100,"message":"Import complete!"})).ok();
    Ok(instance)
}

#[tauri::command]
pub async fn import_modrinth_pack(app: tauri::AppHandle, mrpack_path: String) -> Result<Instance, String> {
    let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(300)).user_agent("PortalLauncher/1.1").build().map_err(|e| e.to_string())?;
    let file = std::fs::File::open(&mrpack_path).map_err(|e| format!("Open: {e}"))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Read: {e}"))?;

    let index_data = {
        let mut f = archive.by_name("modrinth.index.json").map_err(|_| "No modrinth.index.json".to_string())?;
        let mut s = String::new(); f.read_to_string(&mut s).map_err(|e| e.to_string())?; s
    };
    let index: serde_json::Value = serde_json::from_str(&index_data).map_err(|e| e.to_string())?;
    let pack_name = index["name"].as_str().unwrap_or("Modrinth Pack").to_string();
    app.emit("instance-progress", serde_json::json!({"stage":"importing","name":pack_name,"percent":5,"message":"Reading pack manifest..."})).ok();

    let mc_version = index["dependencies"]["minecraft"].as_str().unwrap_or("1.20.1").to_string();
    let (loader, loader_version) = if index["dependencies"]["fabric-loader"].is_string() {
        ("fabric", index["dependencies"]["fabric-loader"].as_str().unwrap_or(""))
    } else if index["dependencies"]["quilt-loader"].is_string() {
        ("quilt", index["dependencies"]["quilt-loader"].as_str().unwrap_or(""))
    } else if index["dependencies"]["neoforge"].is_string() {
        ("neoforge", index["dependencies"]["neoforge"].as_str().unwrap_or(""))
    } else if index["dependencies"]["forge"].is_string() {
        ("forge", index["dependencies"]["forge"].as_str().unwrap_or(""))
    } else { ("vanilla", "") };

    let new_id = uuid::Uuid::new_v4().to_string();
    let dest_dir = instances_dir().join(&new_id);
    create_instance_folders(&dest_dir)?;

    // Extract overrides
    app.emit("instance-progress", serde_json::json!({"stage":"extracting","name":pack_name,"percent":15,"message":"Extracting overrides..."})).ok();
    let override_names: Vec<String> = (0..archive.len())
        .filter_map(|i| archive.by_index(i).ok().map(|e| e.name().to_string()))
        .filter(|n| n.starts_with("overrides/") && !n.ends_with('/'))
        .collect();
    for name in &override_names {
        let mut entry = archive.by_name(name).map_err(|e| e.to_string())?;
        let rel = &name["overrides/".len()..];
        let out = dest_dir.join(rel);
        if let Some(p) = out.parent() { std::fs::create_dir_all(p).ok(); }
        let mut outf = std::fs::File::create(&out).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut outf).map_err(|e| e.to_string())?;
    }

    // Download files
    let files = index["files"].as_array().cloned().unwrap_or_default();
    let total_files = files.len();
    app.emit("instance-progress", serde_json::json!({"stage":"downloading","name":pack_name,"percent":30,"message":format!("Downloading {} files...", total_files)})).ok();
    let mut mods = vec![];
    for (i, file_entry) in files.iter().enumerate() {
        let path = file_entry["path"].as_str().unwrap_or("");
        let url = file_entry["downloads"].as_array().and_then(|a| a.first()).and_then(|u| u.as_str()).unwrap_or("");
        if url.is_empty() || path.is_empty() { continue; }
        let out_path = dest_dir.join(path);
        if let Some(p) = out_path.parent() { std::fs::create_dir_all(p).ok(); }
        if let Ok(bytes) = client.get(url).send().await.and_then(|r| async { r.bytes().await }).await {
            std::fs::write(&out_path, &bytes).ok();
            if path.starts_with("mods/") {
                let fname = out_path.file_name().unwrap_or_default().to_string_lossy().to_string();
                mods.push(InstanceMod { id: fname.clone(), name: fname.trim_end_matches(".jar").to_string(), version: "imported".to_string(), source: "modrinth".to_string(), enabled: true });
            }
        }
        let pct = 30 + (i as u64 * 65) / total_files.max(1) as u64;
        app.emit("instance-progress", serde_json::json!({"stage":"downloading","name":pack_name,"percent":pct,"message":format!("Downloaded {}/{}", i+1, total_files)})).ok();
    }

    let instance = Instance {
        id: new_id, name: pack_name, description: "Imported from Modrinth Pack".to_string(),
        mc_version, loader: loader.to_string(), loader_version: loader_version.to_string(),
        min_ram: 2048, max_ram: 4096, java_path: String::new(), custom_jvm_args: String::new(),
        play_time_minutes: 0, last_played: None, created_at: chrono::Utc::now().to_rfc3339(),
        icon: None, color: Some("#6C5CE7".to_string()), mods,
    };
    save_instance(&instance)?;
    app.emit("instance-progress", serde_json::json!({"stage":"done","name":instance.name,"percent":100,"message":"Pack imported!"})).ok();
    Ok(instance)
}

#[tauri::command]
pub async fn backup_instance(app: tauri::AppHandle, id: String) -> Result<String, String> {
    let inst = load_instance(&id).ok_or("Instance not found")?;
    let ts = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let bdir = { let mut p = dirs_next::data_local_dir().unwrap_or_else(|| PathBuf::from(".")); p.push("PortalLauncher"); p.push("backups"); std::fs::create_dir_all(&p).ok(); p };
    let dest = bdir.join(format!("{}_{}.zip", inst.name.replace(' ', "_"), ts));
    export_instance_zip(app, id, dest.to_string_lossy().to_string()).await
}

#[tauri::command]
pub async fn list_backups() -> Result<Vec<serde_json::Value>, String> {
    let bdir = { let mut p = dirs_next::data_local_dir().unwrap_or_else(|| PathBuf::from(".")); p.push("PortalLauncher"); p.push("backups"); p };
    let mut result = vec![];
    if let Ok(entries) = std::fs::read_dir(&bdir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
            let modified = entry.metadata().ok().and_then(|m| m.modified().ok()).and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok()).map(|d| d.as_secs()).unwrap_or(0);
            result.push(serde_json::json!({"name":name,"path":entry.path().to_string_lossy(),"size_bytes":size,"modified":modified}));
        }
    }
    result.sort_by(|a, b| b["modified"].as_u64().cmp(&a["modified"].as_u64()));
    Ok(result)
}
