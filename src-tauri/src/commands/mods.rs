use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use tauri::Emitter;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InstalledMod {
    pub id: String,
    pub name: String,
    pub version: String,
    pub version_id: String,
    pub source: String,
    pub enabled: bool,
    pub file_name: String,
    pub file_size: u64,
    pub mod_type: String, // "mod" | "resourcepack" | "shaderpack" | "datapack"
    pub update_available: bool,
    pub latest_version: Option<String>,
    pub latest_version_id: Option<String>,
    pub latest_download_url: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModConflict { pub mod_a: String, pub mod_b: String, pub reason: String }

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UpdateResult { pub mod_id: String, pub mod_name: String, pub old_version: String, pub new_version: String, pub success: bool, pub error: Option<String> }

fn instance_base(instance_id: &str) -> PathBuf {
    let mut p = dirs_next::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    p.push("PortalLauncher"); p.push("instances"); p.push(instance_id); p
}

/// Get the correct subfolder for a mod type
fn mod_type_folder(mod_type: &str) -> &'static str {
    match mod_type {
        "resourcepack" | "resourcepacks" => "resourcepacks",
        "shaderpack" | "shaderpacks" | "shader" => "shaderpacks",
        "datapack" | "datapacks" => "datapacks",
        _ => "mods",
    }
}

/// Detect mod type from Modrinth categories / project_type
fn detect_mod_type(categories: &[String], project_type: Option<&str>) -> &'static str {
    if let Some(pt) = project_type {
        match pt {
            "resourcepack" => return "resourcepack",
            "shader" => return "shaderpack",
            "datapack" => return "datapack",
            _ => {}
        }
    }
    for cat in categories {
        if cat.contains("resourcepack") { return "resourcepack"; }
        if cat.contains("shader") { return "shaderpack"; }
        if cat.contains("datapack") { return "datapack"; }
    }
    "mod"
}

fn instance_json_path(id: &str) -> PathBuf { instance_base(id).join("instance.json") }

fn get_instance_meta(id: &str) -> (String, String) {
    let path = instance_json_path(id);
    std::fs::read_to_string(&path).ok()
        .and_then(|d| serde_json::from_str::<serde_json::Value>(&d).ok())
        .map(|v| (v["mc_version"].as_str().unwrap_or("1.20.1").to_string(), v["loader"].as_str().unwrap_or("fabric").to_string()))
        .unwrap_or_else(|| ("1.20.1".to_string(), "fabric".to_string()))
}

fn mods_dir_for(instance_id: &str, mod_type: &str) -> PathBuf {
    let p = instance_base(instance_id).join(mod_type_folder(mod_type));
    std::fs::create_dir_all(&p).ok(); p
}

fn update_instance_mod_list(instance_id: &str, m: &InstalledMod) {
    let path = instance_json_path(instance_id);
    if let Ok(data) = std::fs::read_to_string(&path) {
        if let Ok(mut config) = serde_json::from_str::<serde_json::Value>(&data) {
            let new_mod = serde_json::to_value(m).unwrap_or_default();
            match config["mods"].as_array_mut() {
                Some(arr) => arr.push(new_mod),
                None => config["mods"] = serde_json::json!([new_mod]),
            }
            if let Ok(json) = serde_json::to_string_pretty(&config) { std::fs::write(&path, json).ok(); }
        }
    }
}

#[tauri::command]
pub async fn search_mods(query: String, platform: String, limit: Option<u64>, curseforge_api_key: Option<String>) -> Result<serde_json::Value, String> {
    match platform.as_str() {
        "modrinth" => Ok(serde_json::to_value(super::modrinth::search_modrinth(query, limit, None, None, None, None, Some("relevance".into())).await?).unwrap()),
        "curseforge" => Ok(serde_json::to_value(super::curseforge::search_curseforge(query, limit, None, None, None, None, None, curseforge_api_key.unwrap_or_default()).await?).unwrap()),
        _ => {
            let (mr, cf) = tokio::join!(
                super::modrinth::search_modrinth(query.clone(), limit, None, None, None, None, None),
                super::curseforge::search_curseforge(query, limit, None, None, None, None, None, curseforge_api_key.unwrap_or_default())
            );
            Ok(serde_json::json!({"modrinth":mr.ok(),"curseforge":cf.ok()}))
        }
    }
}

/// Install a mod and auto-download its dependencies
#[tauri::command]
pub async fn install_mod(
    app: tauri::AppHandle,
    instance_id: String, download_url: String, file_name: String,
    mod_id: String, mod_name: String, mod_version: String, version_id: String,
    source: String, mod_type: Option<String>, project_id: Option<String>,
) -> Result<Vec<InstalledMod>, String> {
    let client = reqwest::Client::builder().user_agent("PortalLauncher/1.1").build().map_err(|e| e.to_string())?;
    let mtype = mod_type.as_deref().unwrap_or("mod");
    let dir = mods_dir_for(&instance_id, mtype);

    app.emit("mod-progress", serde_json::json!({"name":mod_name,"percent":20,"message":"Downloading mod..."})).ok();

    let bytes = client.get(&download_url).send().await.map_err(|e| format!("Download: {e}"))?.bytes().await.map_err(|e| format!("Read: {e}"))?;
    let file_size = bytes.len() as u64;
    std::fs::write(dir.join(&file_name), &bytes).map_err(|e| format!("Write: {e}"))?;

    let installed = InstalledMod {
        id: mod_id, name: mod_name, version: mod_version, version_id: version_id.clone(),
        source: source.clone(), enabled: true, file_name, file_size,
        mod_type: mtype.to_string(),
        update_available: false, latest_version: None, latest_version_id: None, latest_download_url: None,
    };
    update_instance_mod_list(&instance_id, &installed);

    app.emit("mod-progress", serde_json::json!({"name":installed.name,"percent":60,"message":"Checking dependencies..."})).ok();

    // Auto-download dependencies
    let mut all_installed = vec![installed.clone()];
    if source == "modrinth" && !version_id.is_empty() {
        let deps = install_mod_dependencies_internal(&client, &app, &instance_id, &version_id).await.unwrap_or_default();
        all_installed.extend(deps);
    }

    app.emit("mod-progress", serde_json::json!({"name":installed.name,"percent":100,"message":"Installed!"})).ok();
    Ok(all_installed)
}

async fn install_mod_dependencies_internal(client: &reqwest::Client, app: &tauri::AppHandle, instance_id: &str, version_id: &str) -> Result<Vec<InstalledMod>, String> {
    let version_data: serde_json::Value = client.get(&format!("https://api.modrinth.com/v2/version/{}", version_id))
        .send().await.map_err(|e| e.to_string())?.json().await.map_err(|e| e.to_string())?;

    let (mc_version, loader) = get_instance_meta(instance_id);
    let mut installed = vec![];

    if let Some(deps) = version_data["dependencies"].as_array() {
        for dep in deps {
            if dep["dependency_type"].as_str() != Some("required") { continue; }
            let dep_pid = dep["project_id"].as_str().unwrap_or("").to_string();
            let dep_vid = dep["version_id"].as_str().map(|s| s.to_string());
            if dep_pid.is_empty() { continue; }

            // Check if already installed
            let mods_folder = instance_base(instance_id).join("mods");
            let already = std::fs::read_dir(&mods_folder).ok()
                .map(|e| e.count()).unwrap_or(0) > 0; // simplified check

            let dep_version_url = dep_vid.as_ref()
                .map(|vid| format!("https://api.modrinth.com/v2/version/{}", vid))
                .unwrap_or_else(|| format!("https://api.modrinth.com/v2/project/{}/version?game_versions=[\"{}\"]&loaders=[\"{}\"]", dep_pid, mc_version, loader));

            if let Ok(dep_data) = client.get(&dep_version_url).send().await.and_then(|r| async { r.json::<serde_json::Value>().await }).await {
                let dep_ver = if dep_vid.is_some() { dep_data.clone() } else {
                    dep_data.as_array().and_then(|a| a.first()).cloned().unwrap_or(dep_data)
                };

                if let Some(f) = dep_ver["files"].as_array().and_then(|a| a.first()) {
                    let url = f["url"].as_str().unwrap_or("").to_string();
                    let fname = f["filename"].as_str().unwrap_or("").to_string();
                    if url.is_empty() || fname.is_empty() { continue; }

                    let dir = instance_base(instance_id).join("mods");
                    std::fs::create_dir_all(&dir).ok();
                    if dir.join(&fname).exists() { continue; } // already there

                    app.emit("mod-progress", serde_json::json!({"name":fname,"percent":70,"message":format!("Downloading dependency: {}", fname)})).ok();

                    if let Ok(bytes) = client.get(&url).send().await.and_then(|r| async { r.bytes().await }).await {
                        let size = bytes.len() as u64;
                        std::fs::write(dir.join(&fname), &bytes).ok();
                        let dep_mod = InstalledMod {
                            id: dep_pid.clone(),
                            name: dep_ver["name"].as_str().unwrap_or(&dep_pid).to_string(),
                            version: dep_ver["version_number"].as_str().unwrap_or("").to_string(),
                            version_id: dep_ver["id"].as_str().unwrap_or("").to_string(),
                            source: "modrinth".to_string(), enabled: true, file_name: fname,
                            file_size: size, mod_type: "mod".to_string(),
                            update_available: false, latest_version: None, latest_version_id: None, latest_download_url: None,
                        };
                        update_instance_mod_list(instance_id, &dep_mod);
                        installed.push(dep_mod);
                    }
                }
            }
        }
    }
    Ok(installed)
}

#[tauri::command]
pub async fn get_instance_mods(instance_id: String) -> Result<Vec<InstalledMod>, String> {
    let base = instance_base(&instance_id);
    let mut mods = vec![];
    for (folder, mtype) in &[("mods","mod"),("resourcepacks","resourcepack"),("shaderpacks","shaderpack"),("datapacks","datapack")] {
        let dir = base.join(folder);
        if !dir.exists() { continue; }
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                let is_disabled = name.ends_with(".disabled");
                if !name.ends_with(".jar") && !name.ends_with(".zip") && !name.ends_with(".disabled") { continue; }
                let display = name.trim_end_matches(".disabled").trim_end_matches(".jar").trim_end_matches(".zip").to_string();
                mods.push(InstalledMod {
                    id: display.clone(), name: display, version: "unknown".to_string(), version_id: String::new(),
                    source: "manual".to_string(), enabled: !is_disabled, file_name: name, file_size: entry.metadata().map(|m| m.len()).unwrap_or(0),
                    mod_type: mtype.to_string(), update_available: false, latest_version: None, latest_version_id: None, latest_download_url: None,
                });
            }
        }
    }
    Ok(mods)
}

#[tauri::command]
pub async fn toggle_mod(instance_id: String, file_name: String, mod_type: Option<String>, enabled: bool) -> Result<(), String> {
    let dir = mods_dir_for(&instance_id, mod_type.as_deref().unwrap_or("mod"));
    if enabled {
        let disabled = dir.join(format!("{}.disabled", file_name));
        if disabled.exists() { std::fs::rename(&disabled, dir.join(&file_name)).map_err(|e| e.to_string())?; }
    } else {
        let src = dir.join(&file_name);
        if src.exists() { std::fs::rename(&src, dir.join(format!("{}.disabled", file_name))).map_err(|e| e.to_string())?; }
    }
    Ok(())
}

#[tauri::command]
pub async fn remove_mod(instance_id: String, file_name: String, mod_type: Option<String>) -> Result<(), String> {
    let dir = mods_dir_for(&instance_id, mod_type.as_deref().unwrap_or("mod"));
    let path = dir.join(&file_name);
    if path.exists() { std::fs::remove_file(&path).map_err(|e| format!("Remove: {e}"))?; }
    // Also try .disabled variant
    let dis = dir.join(format!("{}.disabled", file_name));
    if dis.exists() { std::fs::remove_file(&dis).ok(); }
    Ok(())
}

#[tauri::command]
pub async fn check_mod_updates(instance_id: String) -> Result<Vec<InstalledMod>, String> {
    let client = reqwest::Client::builder().user_agent("PortalLauncher/1.1").build().map_err(|e| e.to_string())?;
    let (mc_version, loader) = get_instance_meta(&instance_id);
    let mut mods = get_instance_mods(instance_id.clone()).await?;
    let stored: Vec<serde_json::Value> = std::fs::read_to_string(instance_json_path(&instance_id)).ok()
        .and_then(|d| serde_json::from_str::<serde_json::Value>(&d).ok())
        .and_then(|v| v["mods"].as_array().cloned()).unwrap_or_default();

    for m in &mut mods {
        let stored_entry = stored.iter().find(|s| s["file_name"].as_str() == Some(&m.file_name) || s["name"].as_str() == Some(&m.name));
        let project_id = stored_entry.and_then(|s| s["id"].as_str()).unwrap_or("").to_string();
        let current_vid = stored_entry.and_then(|s| s["version_id"].as_str()).unwrap_or("").to_string();
        if project_id.is_empty() { continue; }

        let url = format!("https://api.modrinth.com/v2/project/{}/version?game_versions=[\"{}\"]&loaders=[\"{}\"]", project_id, mc_version, loader);
        if let Ok(resp) = client.get(&url).send().await {
            if let Ok(versions) = resp.json::<serde_json::Value>().await {
                if let Some(latest) = versions.as_array().and_then(|a| a.first()) {
                    let latest_id = latest["id"].as_str().unwrap_or("").to_string();
                    if !latest_id.is_empty() && latest_id != current_vid {
                        m.update_available = true;
                        m.latest_version = latest["version_number"].as_str().map(|s| s.to_string());
                        m.latest_version_id = Some(latest_id);
                        m.latest_download_url = latest["files"].as_array().and_then(|f| f.first()).and_then(|f| f["url"].as_str()).map(|s| s.to_string());
                    }
                }
            }
        }
    }
    Ok(mods)
}

#[tauri::command]
pub async fn update_all_mods(app: tauri::AppHandle, instance_id: String) -> Result<Vec<UpdateResult>, String> {
    let client = reqwest::Client::builder().user_agent("PortalLauncher/1.1").build().map_err(|e| e.to_string())?;
    let mods = check_mod_updates(instance_id.clone()).await?;
    let updatable: Vec<_> = mods.iter().filter(|m| m.update_available).collect();
    let total = updatable.len();
    let mut results = vec![];

    for (i, m) in updatable.iter().enumerate() {
        let url = match &m.latest_download_url { Some(u) => u.clone(), None => continue };
        let new_ver = m.latest_version.clone().unwrap_or_default();
        app.emit("mod-progress", serde_json::json!({"name":m.name,"percent":(i*100/total.max(1)) as u8,"message":format!("Updating {} ({}/{})", m.name, i+1, total)})).ok();

        let dir = mods_dir_for(&instance_id, &m.mod_type);
        match client.get(&url).send().await.and_then(|r| async { r.bytes().await }).await {
            Ok(bytes) => {
                std::fs::remove_file(dir.join(&m.file_name)).ok();
                let new_fname = format!("{}-{}.jar", m.name.replace(' ', "-"), new_ver);
                std::fs::write(dir.join(&new_fname), &bytes).ok();
                results.push(UpdateResult { mod_id: m.id.clone(), mod_name: m.name.clone(), old_version: m.version.clone(), new_version: new_ver, success: true, error: None });
            }
            Err(e) => results.push(UpdateResult { mod_id: m.id.clone(), mod_name: m.name.clone(), old_version: m.version.clone(), new_version: new_ver, success: false, error: Some(e.to_string()) }),
        }
    }
    app.emit("mod-progress", serde_json::json!({"name":"All","percent":100,"message":format!("{} mods updated", results.iter().filter(|r| r.success).count())})).ok();
    Ok(results)
}

#[tauri::command]
pub async fn detect_mod_conflicts(instance_id: String) -> Result<Vec<ModConflict>, String> {
    let mods = get_instance_mods(instance_id).await?;
    let mut conflicts = vec![];
    for i in 0..mods.len() {
        for j in (i+1)..mods.len() {
            let (a, b) = (&mods[i], &mods[j]);
            let (na, nb) = (a.name.to_lowercase().replace(['-','_',' '], ""), b.name.to_lowercase().replace(['-','_',' '], ""));
            if na == nb { conflicts.push(ModConflict { mod_a: a.name.clone(), mod_b: b.name.clone(), reason: "Duplicate mod installed twice".to_string() }); }
        }
    }
    let known: &[(&str, &str, &str)] = &[
        ("optifine","sodium","OptiFine and Sodium are incompatible — use Iris+Sodium instead"),
        ("optifine","rubidium","OptiFine and Rubidium are incompatible"),
        ("journeymap","xaeros","JourneyMap and Xaero's conflict — use one minimap only"),
    ];
    let names: Vec<_> = mods.iter().map(|m| m.name.to_lowercase().replace(['-','_',' '], "")).collect();
    for (a, b, reason) in known {
        if names.iter().any(|n| n.contains(a)) && names.iter().any(|n| n.contains(b)) {
            conflicts.push(ModConflict {
                mod_a: mods.iter().find(|m| m.name.to_lowercase().replace(['-','_',' '], "").contains(a)).map(|m| m.name.clone()).unwrap_or_else(|| a.to_string()),
                mod_b: mods.iter().find(|m| m.name.to_lowercase().replace(['-','_',' '], "").contains(b)).map(|m| m.name.clone()).unwrap_or_else(|| b.to_string()),
                reason: reason.to_string(),
            });
        }
    }
    Ok(conflicts)
}

#[tauri::command]
pub async fn check_mod_compatibility(instance_id: String, project_id: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder().user_agent("PortalLauncher/1.1").build().map_err(|e| e.to_string())?;
    let (mc_version, loader) = get_instance_meta(&instance_id);
    let url = format!("https://api.modrinth.com/v2/project/{}/version?game_versions=[\"{}\"]&loaders=[\"{}\"]", project_id, mc_version, loader);
    let resp: serde_json::Value = client.get(&url).send().await.map_err(|e| e.to_string())?.json().await.map_err(|e| e.to_string())?;
    let compatible = resp.as_array().map(|a| !a.is_empty()).unwrap_or(false);
    Ok(serde_json::json!({"compatible":compatible,"mc_version":mc_version,"loader":loader,"latest_compatible_version":resp.as_array().and_then(|a| a.first()).cloned(),"message":if compatible { format!("Compatible with MC {} ({})", mc_version, loader) } else { format!("NOT compatible with MC {} ({})", mc_version, loader) }}))
}
