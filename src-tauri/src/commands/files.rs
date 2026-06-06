use serde::{Serialize, Deserialize};

#[tauri::command]
pub async fn open_folder(path: String) -> Result<(), String> {
    if path.is_empty() { return Err("Empty path".into()); }
    let p = std::path::Path::new(&path);
    if !p.exists() { std::fs::create_dir_all(p).map_err(|e| e.to_string())?; }

    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer").arg(&path).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    std::process::Command::new("open").arg(&path).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open").arg(&path).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FileFilter { pub name: String, pub extensions: Vec<String> }

#[tauri::command]
pub async fn pick_file(filters: Option<Vec<FileFilter>>) -> Result<Option<String>, String> {
    // File picking is handled by Tauri's dialog plugin on the frontend.
    // This stub exists for completeness; the actual call goes through
    // @tauri-apps/plugin-dialog on the JS side.
    Ok(None)
}

#[tauri::command]
pub async fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| format!("Read error: {e}"))
}

#[tauri::command]
pub async fn write_file_bytes(path: String, data: Vec<u8>) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, &data).map_err(|e| format!("Write error: {e}"))
}
