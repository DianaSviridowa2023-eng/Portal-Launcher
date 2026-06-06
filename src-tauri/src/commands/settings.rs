use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use std::collections::HashMap;

fn settings_path() -> PathBuf {
    let mut p = dirs_next::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    p.push("PortalLauncher");
    std::fs::create_dir_all(&p).ok();
    p.push("settings.json");
    p
}

fn load_raw() -> HashMap<String, serde_json::Value> {
    std::fs::read_to_string(settings_path())
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

#[tauri::command]
pub async fn get_all() -> Result<HashMap<String, serde_json::Value>, String> {
    Ok(load_raw())
}

#[tauri::command]
pub async fn set_setting(key: String, value: serde_json::Value) -> Result<(), String> {
    let mut map = load_raw();
    map.insert(key, value);
    let data = serde_json::to_string_pretty(&map).map_err(|e| e.to_string())?;
    std::fs::write(settings_path(), data).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_all_settings(settings: HashMap<String, serde_json::Value>) -> Result<(), String> {
    let data = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    std::fs::write(settings_path(), data).map_err(|e| e.to_string())
}
