use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CfAuthor { pub name: String }
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CfLogo { pub thumbnail_url: String }
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CfCategory { pub name: String }
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CfFileIndex { pub game_version: String, pub mod_loader_type: u32 }
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CurseforgeMod {
    pub id: u64,
    pub name: String,
    pub summary: String,
    pub authors: Vec<CfAuthor>,
    pub download_count: u64,
    pub thumbs_up_count: u64,
    pub logo: Option<CfLogo>,
    pub categories: Vec<CfCategory>,
    pub latest_files_indexes: Vec<CfFileIndex>,
    pub date_modified: String,
    pub slug: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CfPagination { pub total_count: u64 }
#[derive(Serialize, Deserialize, Debug)]
pub struct CurseforgeSearchResult {
    pub data: Vec<CurseforgeMod>,
    pub pagination: CfPagination,
}

fn parse_mod(m: &serde_json::Value) -> CurseforgeMod {
    CurseforgeMod {
        id: m["id"].as_u64().unwrap_or(0),
        name: m["name"].as_str().unwrap_or("").to_string(),
        summary: m["summary"].as_str().unwrap_or("").to_string(),
        authors: m["authors"].as_array().map(|a| a.iter().map(|au| CfAuthor {
            name: au["name"].as_str().unwrap_or("").to_string()
        }).collect()).unwrap_or_default(),
        download_count: m["downloadCount"].as_u64().unwrap_or(0),
        thumbs_up_count: m["thumbsUpCount"].as_u64().unwrap_or(0),
        logo: m["logo"]["thumbnailUrl"].as_str().map(|u| CfLogo { thumbnail_url: u.to_string() }),
        categories: m["categories"].as_array().map(|a| a.iter().map(|c| CfCategory {
            name: c["name"].as_str().unwrap_or("").to_string()
        }).collect()).unwrap_or_default(),
        latest_files_indexes: m["latestFilesIndexes"].as_array().map(|a| a.iter().map(|f| CfFileIndex {
            game_version: f["gameVersion"].as_str().unwrap_or("").to_string(),
            mod_loader_type: f["modLoaderType"].as_u64().unwrap_or(0) as u32,
        }).collect()).unwrap_or_default(),
        date_modified: m["dateModified"].as_str().unwrap_or("").to_string(),
        slug: m["slug"].as_str().unwrap_or("").to_string(),
    }
}

#[tauri::command]
pub async fn search_curseforge(
    query: String,
    limit: Option<u64>,
    offset: Option<u64>,
    category_id: Option<u64>,
    game_version: Option<String>,
    mod_loader_type: Option<u32>,
    sort_field: Option<u32>,
    api_key: String,
) -> Result<CurseforgeSearchResult, String> {
    if api_key.is_empty() {
        return Err("CurseForge API key not configured. Please add it in Settings → API Keys.".into());
    }

    let client = reqwest::Client::builder()
        .user_agent("PortalLauncher/1.0.0")
        .build().map_err(|e| e.to_string())?;

    let limit = limit.unwrap_or(20).min(50);
    let offset = offset.unwrap_or(0);

    let mut req = client.get("https://api.curseforge.com/v1/mods/search")
        .header("x-api-key", &api_key)
        .query(&[
            ("gameId", "432"),        // 432 = Minecraft
            ("classId", "6"),         // 6 = Mods
            ("pageSize", &limit.to_string()),
            ("index", &offset.to_string()),
            ("searchFilter", &query),
            ("sortField", &sort_field.unwrap_or(2).to_string()), // 2=Popularity
            ("sortOrder", "desc"),
        ]);

    if let Some(cat) = category_id { req = req.query(&[("categoryId", cat.to_string())]); }
    if let Some(ver) = &game_version { if ver != "All" { req = req.query(&[("gameVersion", ver.as_str())]); } }
    if let Some(ldr) = mod_loader_type { req = req.query(&[("modLoaderType", ldr.to_string())]); }

    let resp: serde_json::Value = req.send().await
        .map_err(|e| format!("Network error: {e}"))?.json().await
        .map_err(|e| format!("Parse error: {e}"))?;

    let data: Vec<CurseforgeMod> = resp["data"].as_array().unwrap_or(&vec![]).iter().map(parse_mod).collect();
    let total_count = resp["pagination"]["totalCount"].as_u64().unwrap_or(data.len() as u64);

    Ok(CurseforgeSearchResult { data, pagination: CfPagination { total_count } })
}
