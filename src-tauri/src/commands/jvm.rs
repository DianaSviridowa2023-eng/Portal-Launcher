use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use tauri::Emitter;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct JavaInfo {
    pub path: String,
    pub version: String,
    pub major_version: u32,
    pub vendor: String,
    pub managed: bool,
}

pub fn java_base_dir() -> PathBuf {
    let mut p = dirs_next::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    p.push("PortalLauncher"); p.push("java");
    std::fs::create_dir_all(&p).ok(); p
}

pub fn find_java(major: u32) -> String {
    // Try JAVA_HOME
    if let Ok(jh) = std::env::var("JAVA_HOME") {
        let bin = if cfg!(windows) { PathBuf::from(&jh).join("bin").join("java.exe") } else { PathBuf::from(&jh).join("bin").join("java") };
        if bin.exists() { return bin.to_string_lossy().to_string(); }
    }
    // System java
    "java".to_string()
}

fn run_java(java_path: &str) -> Option<JavaInfo> {
    let out = std::process::Command::new(java_path).arg("-XshowSettings:all").arg("-version").output().ok()?;
    let text = String::from_utf8_lossy(&out.stderr).to_string() + &String::from_utf8_lossy(&out.stdout);
    // Parse version
    let ver_line = text.lines().find(|l| l.contains("java.version") || l.contains("version \""))?;
    let ver = ver_line.split('"').nth(1).or_else(|| ver_line.split('=').nth(1)).map(|s| s.trim().to_string()).unwrap_or_else(|| "unknown".to_string());
    let major = if ver.starts_with("1.") { ver.split('.').nth(1).and_then(|s| s.parse().ok()).unwrap_or(8) } else { ver.split('.').next().and_then(|s| s.parse().ok()).unwrap_or(0) };
    let vendor = text.lines().find(|l| l.contains("java.vendor =")).and_then(|l| l.split('=').nth(1)).map(|s| s.trim().to_string()).unwrap_or_default();
    Some(JavaInfo { path: java_path.to_string(), version: ver, major_version: major, vendor, managed: false })
}

#[tauri::command]
pub async fn get_java_info(java_path: String) -> Result<JavaInfo, String> {
    let path = if java_path.is_empty() { "java".to_string() } else { java_path };
    run_java(&path).ok_or_else(|| format!("Could not run Java at {}", path))
}

#[tauri::command]
pub async fn get_managed_java_versions() -> Result<Vec<JavaInfo>, String> {
    let base = java_base_dir();
    let mut result = vec![];
    if let Ok(entries) = std::fs::read_dir(&base) {
        for entry in entries.flatten() {
            if !entry.file_type().map(|t| t.is_dir()).unwrap_or(false) { continue; }
            let bin = if cfg!(windows) { entry.path().join("bin").join("java.exe") } else { entry.path().join("bin").join("java") };
            if let Some(mut info) = run_java(&bin.to_string_lossy()) {
                info.managed = true;
                result.push(info);
            }
        }
    }
    // Also add system java if available
    if let Some(sys) = run_java("java") { result.push(sys); }
    Ok(result)
}

#[tauri::command]
pub async fn download_java(app: tauri::AppHandle, major_version: u32) -> Result<String, String> {
    let emit = |pct: u8, msg: &str| {
        app.emit("java-download", serde_json::json!({"percent":pct,"message":msg,"version":major_version})).ok();
    };

    emit(5, "Fetching Java release info...");

    let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(600)).user_agent("PortalLauncher/1.1").build().map_err(|e| e.to_string())?;
    let (os, arch, ext) = if cfg!(target_os = "windows") { ("windows", "x64", "zip") }
        else if cfg!(target_os = "macos") { ("mac", if cfg!(target_arch = "aarch64") { "aarch64" } else { "x64" }, "tar.gz") }
        else { ("linux", "x64", "tar.gz") };

    let feature_ver = match major_version { 8 => 8, 11 => 11, 17 => 17, 21 => 21, v => v };

    // Try Adoptium Temurin API
    let api_url = format!(
        "https://api.adoptium.net/v3/assets/latest/{}/hotspot?os={}&architecture={}&image_type=jdk",
        feature_ver, os, arch
    );
    let releases: serde_json::Value = client.get(&api_url).send().await.map_err(|e| format!("Adoptium: {e}"))?.json().await.map_err(|e| format!("Parse: {e}"))?;

    let release = releases.as_array().and_then(|a| a.first()).ok_or("No Java release found")?;
    let bin = release["binary"].as_object().ok_or("No binary")?;
    let pkg = bin["package"].as_object().ok_or("No package")?;
    let download_url = pkg["link"].as_str().ok_or("No download link")?.to_string();
    let file_name = pkg["name"].as_str().ok_or("No filename")?.to_string();
    let actual_version = release["version"]["semver"].as_str().unwrap_or("").to_string();

    emit(10, &format!("Downloading Java {}...", actual_version));

    let resp = client.get(&download_url).send().await.map_err(|e| format!("Download: {e}"))?;
    let total = resp.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut data: Vec<u8> = Vec::with_capacity(total as usize);
    let mut stream = resp;

    use tokio::io::AsyncReadExt;
    let bytes = stream.bytes().await.map_err(|e| e.to_string())?;
    downloaded = bytes.len() as u64;
    data = bytes.to_vec();
    emit(60, "Extracting Java...");

    let base = java_base_dir();
    let dir_name = format!("java{}-{}", major_version, actual_version.replace('.', "_"));
    let dest = base.join(&dir_name);
    std::fs::create_dir_all(&dest).map_err(|e| e.to_string())?;

    if file_name.ends_with(".zip") {
        use std::io::Cursor;
        let cursor = Cursor::new(&data);
        let mut archive = zip::ZipArchive::new(cursor).map_err(|e| format!("ZIP read: {e}"))?;
        let total_files = archive.len();
        for i in 0..total_files {
            let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
            let name = entry.name().to_string();
            // Strip top-level dir
            let rel = name.splitn(2, '/').nth(1).unwrap_or(&name);
            if rel.is_empty() { continue; }
            let out = dest.join(rel);
            if entry.is_dir() { std::fs::create_dir_all(&out).ok(); }
            else {
                if let Some(p) = out.parent() { std::fs::create_dir_all(p).ok(); }
                std::fs::write(&out, {let mut buf=vec![]; use std::io::Read; entry.read_to_end(&mut buf).ok(); buf}).ok();
            }
            if i % 50 == 0 { emit(60 + (i as u8 * 35 / total_files.max(1) as u8), &format!("Extracting {}/{}", i, total_files)); }
        }
    } else {
        // tar.gz
        use flate2::read::GzDecoder;
        use tar::Archive;
        use std::io::Read;
        let gz = GzDecoder::new(std::io::Cursor::new(&data));
        let mut archive = Archive::new(gz);
        let entries_v: Result<Vec<_>, _> = archive.entries().map_err(|e| e.to_string())?.collect();
        let entries_v = entries_v.map_err(|e| e.to_string())?;
        let total_f = entries_v.len();

        // Re-create for iteration
        let gz2 = GzDecoder::new(std::io::Cursor::new(&data));
        let mut archive2 = Archive::new(gz2);
        for (i, entry) in archive2.entries().map_err(|e| e.to_string())?.enumerate() {
            let mut e = entry.map_err(|e| e.to_string())?;
            let path = e.path().map_err(|e| e.to_string())?.to_path_buf();
            let rel: PathBuf = path.components().skip(1).collect();
            if rel.as_os_str().is_empty() { continue; }
            let out = dest.join(&rel);
            if let Some(p) = out.parent() { std::fs::create_dir_all(p).ok(); }
            e.unpack(&out).ok();
            // Set executable bits on unix
            #[cfg(unix)] {
                use std::os::unix::fs::PermissionsExt;
                if let Ok(mode) = e.header().mode() {
                    std::fs::set_permissions(&out, std::fs::Permissions::from_mode(mode)).ok();
                }
            }
            if i % 50 == 0 { emit(60 + (i as u8 * 35 / total_f.max(1) as u8), &format!("Extracting {}/{}", i, total_f)); }
        }
    }

    let java_bin = if cfg!(windows) { dest.join("bin").join("java.exe") } else { dest.join("bin").join("java") };
    if !java_bin.exists() { return Err(format!("Java binary not found after extraction: {}", java_bin.display())); }

    emit(100, &format!("Java {} installed!", actual_version));
    Ok(java_bin.to_string_lossy().to_string())
}
