use serde::{Serialize, Deserialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Debug)]
pub struct LoaderInstallResult {
    pub success: bool,
    pub loader: String,
    pub version: String,
    pub message: String,
}

fn mc_dir() -> PathBuf {
    let mut p = dirs_next::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    p.push("PortalLauncher"); p.push("minecraft");
    std::fs::create_dir_all(&p).ok();
    p
}

fn find_java() -> String {
    let candidates = ["java", "C:/Program Files/Java/jdk-17/bin/java.exe",
        "C:/Program Files/Eclipse Adoptium/jdk-17.0.13.11-hotspot/bin/java.exe"];
    for c in candidates {
        if std::path::Path::new(c).exists() || c == "java" { return c.to_string(); }
    }
    "java".to_string()
}

async fn download_bytes(client: &reqwest::Client, url: &str) -> Result<bytes::Bytes, String> {
    client.get(url).send().await
        .map_err(|e| format!("GET {url}: {e}"))?.bytes().await
        .map_err(|e| format!("read: {e}"))
}

/// Install Fabric loader
#[tauri::command]
pub async fn install_fabric(mc_version: String, loader_version: String, instance_dir: String) -> Result<LoaderInstallResult, String> {
    let client = reqwest::Client::builder().user_agent("PortalLauncher/1.0.0").build().map_err(|e| e.to_string())?;

    let lv = if loader_version.is_empty() {
        let meta: serde_json::Value = client.get("https://meta.fabricmc.net/v2/versions/loader")
            .send().await.map_err(|e| e.to_string())?.json().await.map_err(|e| e.to_string())?;
        meta.as_array().and_then(|a| a.first())
            .and_then(|v| v["version"].as_str()).unwrap_or("0.16.9").to_string()
    } else { loader_version };

    let installer_url = "https://maven.fabricmc.net/net/fabricmc/fabric-installer/1.0.1/fabric-installer-1.0.1.jar";
    let jar_path = mc_dir().join("fabric-installer.jar");
    std::fs::write(&jar_path, &download_bytes(&client, installer_url).await?).map_err(|e| e.to_string())?;

    let status = std::process::Command::new(find_java())
        .args(&["-jar", &jar_path.to_string_lossy(), "client",
            "-mcversion", &mc_version, "-loader", &lv,
            "-dir", &instance_dir, "-noprofile"])
        .status().map_err(|e| format!("Run: {e}"))?;

    std::fs::remove_file(&jar_path).ok();
    Ok(LoaderInstallResult {
        success: status.success(), loader: "fabric".into(), version: lv,
        message: if status.success() { "Fabric installed successfully".into() } else { "Fabric installation failed".into() },
    })
}

/// Install Forge loader
#[tauri::command]
pub async fn install_forge(mc_version: String, forge_version: String, instance_dir: String) -> Result<LoaderInstallResult, String> {
    let client = reqwest::Client::builder().user_agent("PortalLauncher/1.0.0").build().map_err(|e| e.to_string())?;

    let full_ver = if forge_version.contains('-') { forge_version.clone() }
        else { format!("{}-{}", mc_version, forge_version) };

    let installer_url = format!(
        "https://maven.minecraftforge.net/net/minecraftforge/forge/{v}/forge-{v}-installer.jar",
        v = full_ver
    );
    let jar_path = mc_dir().join(format!("forge-{}-installer.jar", full_ver));
    std::fs::write(&jar_path, &download_bytes(&client, &installer_url).await?)
        .map_err(|e| e.to_string())?;

    let status = std::process::Command::new(find_java())
        .args(&["-jar", &jar_path.to_string_lossy(), "--installClient", &instance_dir])
        .status().map_err(|e| format!("Run: {e}"))?;

    std::fs::remove_file(&jar_path).ok();
    Ok(LoaderInstallResult {
        success: status.success(), loader: "forge".into(), version: full_ver,
        message: if status.success() { "Forge installed".into() } else { "Forge installation failed".into() },
    })
}

/// Install Quilt loader
#[tauri::command]
pub async fn install_quilt(mc_version: String, loader_version: String, instance_dir: String) -> Result<LoaderInstallResult, String> {
    let client = reqwest::Client::builder().user_agent("PortalLauncher/1.0.0").build().map_err(|e| e.to_string())?;

    let lv = if loader_version.is_empty() {
        // Get latest Quilt loader version
        let meta: serde_json::Value = client.get("https://meta.quiltmc.org/v3/versions/loader")
            .send().await.map_err(|e| e.to_string())?.json().await.map_err(|e| e.to_string())?;
        meta.as_array().and_then(|a| a.first())
            .and_then(|v| v["version"].as_str()).unwrap_or("0.26.4").to_string()
    } else { loader_version };

    let installer_url = "https://quiltmc.org/api/v1/download-latest-installer/java-universal";
    let jar_path = mc_dir().join("quilt-installer.jar");
    std::fs::write(&jar_path, &download_bytes(&client, installer_url).await?).map_err(|e| e.to_string())?;

    let status = std::process::Command::new(find_java())
        .args(&["-jar", &jar_path.to_string_lossy(), "install", "client",
            &mc_version, &lv, "--install-dir", &instance_dir])
        .status().map_err(|e| format!("Run: {e}"))?;

    std::fs::remove_file(&jar_path).ok();
    Ok(LoaderInstallResult {
        success: status.success(), loader: "quilt".into(), version: lv,
        message: if status.success() { "Quilt installed".into() } else { "Quilt installation failed".into() },
    })
}

/// Install NeoForge loader
#[tauri::command]
pub async fn install_neoforge(mc_version: String, neoforge_version: String, instance_dir: String) -> Result<LoaderInstallResult, String> {
    let client = reqwest::Client::builder().user_agent("PortalLauncher/1.0.0").build().map_err(|e| e.to_string())?;

    // Get version from NeoForge API if not specified
    let nfv = if neoforge_version.is_empty() {
        // NeoForge version format: mc_version without "1." prefix + .neoforge_build
        // e.g. for 1.20.1 -> "20.1.x"
        let meta_url = format!("https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml");
        let xml = client.get(&meta_url).send().await.map_err(|e| e.to_string())?.text().await.map_err(|e| e.to_string())?;
        // Find latest version for this MC version
        let mc_short = mc_version.trim_start_matches("1.").to_string();
        xml.lines()
            .filter(|l| l.contains("<version>") && l.contains(&mc_short))
            .filter_map(|l| {
                let s = l.find("<version>")? + 9;
                let e = l.find("</version>")?;
                Some(l[s..e].to_string())
            })
            .last()
            .unwrap_or_else(|| format!("{}.0", mc_version.trim_start_matches("1.")))
    } else { neoforge_version };

    let installer_url = format!(
        "https://maven.neoforged.net/releases/net/neoforged/neoforge/{v}/neoforge-{v}-installer.jar",
        v = nfv
    );
    let jar_path = mc_dir().join(format!("neoforge-{}-installer.jar", nfv));
    match download_bytes(&client, &installer_url).await {
        Ok(bytes) => {
            std::fs::write(&jar_path, &bytes).map_err(|e| e.to_string())?;
        }
        Err(e) => return Ok(LoaderInstallResult {
            success: false, loader: "neoforge".into(), version: nfv,
            message: format!("Download failed: {}", e),
        })
    }

    let status = std::process::Command::new(find_java())
        .args(&["-jar", &jar_path.to_string_lossy(), "--installClient", &instance_dir])
        .status().map_err(|e| format!("Run: {e}"))?;

    std::fs::remove_file(&jar_path).ok();
    Ok(LoaderInstallResult {
        success: status.success(), loader: "neoforge".into(), version: nfv,
        message: if status.success() { "NeoForge installed successfully".into() } else { "NeoForge installation failed. Check that Java is installed.".into() },
    })
}

/// Get available Fabric loader versions for a given MC version
#[tauri::command]
pub async fn get_fabric_versions(mc_version: String) -> Result<Vec<serde_json::Value>, String> {
    let client = reqwest::Client::builder().user_agent("PortalLauncher/1.0.0").build().map_err(|e| e.to_string())?;
    let url = format!("https://meta.fabricmc.net/v2/versions/loader/{}", mc_version);
    let data: serde_json::Value = client.get(&url).send().await.map_err(|e| e.to_string())?.json().await.map_err(|e| e.to_string())?;
    Ok(data.as_array().cloned().unwrap_or_default())
}

/// Get available Forge versions for a given MC version
#[tauri::command]
pub async fn get_forge_versions(mc_version: String) -> Result<Vec<String>, String> {
    let client = reqwest::Client::builder().user_agent("PortalLauncher/1.0.0").build().map_err(|e| e.to_string())?;
    let url = "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json";
    let data: serde_json::Value = client.get(url).send().await.map_err(|e| e.to_string())?.json().await.map_err(|e| e.to_string())?;
    let mut versions = vec![];
    if let Some(promos) = data["promos"].as_object() {
        for (key, val) in promos {
            if key.starts_with(&mc_version) {
                if let Some(v) = val.as_str() { versions.push(v.to_string()); }
            }
        }
    }
    Ok(versions)
}

/// Get available NeoForge versions for a given MC version
#[tauri::command]
pub async fn get_neoforge_versions(mc_version: String) -> Result<Vec<String>, String> {
    let client = reqwest::Client::builder().user_agent("PortalLauncher/1.0.0").build().map_err(|e| e.to_string())?;
    let url = "https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml";
    let xml = client.get(url).send().await.map_err(|e| e.to_string())?.text().await.map_err(|e| e.to_string())?;
    let mc_short = mc_version.trim_start_matches("1.").to_string();
    let versions: Vec<String> = xml.lines()
        .filter(|l| l.contains("<version>") && l.contains(&mc_short))
        .filter_map(|l| {
            let s = l.find("<version>")? + 9;
            let e = l.find("</version>")?;
            Some(l[s..e].to_string())
        })
        .collect();
    Ok(versions)
}
