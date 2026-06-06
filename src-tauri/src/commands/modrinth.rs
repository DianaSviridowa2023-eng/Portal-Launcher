use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModrinthMod {
    pub project_id: String,
    pub title: String,
    pub description: String,
    pub author: String,
    pub downloads: u64,
    pub follows: u64,
    pub icon_url: Option<String>,
    pub categories: Vec<String>,
    pub versions: Vec<String>,
    pub game_versions: Vec<String>,
    pub loaders: Vec<String>,
    pub date_modified: String,
    pub color: Option<i64>,
    pub slug: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ModrinthSearchResult {
    pub hits: Vec<ModrinthMod>,
    pub total_hits: u64,
    pub offset: u64,
    pub limit: u64,
}

fn parse_hit(h: &serde_json::Value) -> ModrinthMod {
    let arr = |key: &str| -> Vec<String> {
        h[key].as_array().map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect()).unwrap_or_default()
    };
    ModrinthMod {
        project_id: h["project_id"].as_str().unwrap_or("").to_string(),
        title: h["title"].as_str().unwrap_or("").to_string(),
        description: h["description"].as_str().unwrap_or("").to_string(),
        author: h["author"].as_str().unwrap_or("").to_string(),
        downloads: h["downloads"].as_u64().unwrap_or(0),
        follows: h["follows"].as_u64().unwrap_or(0),
        icon_url: h["icon_url"].as_str().map(String::from),
        categories: arr("categories"),
        versions: arr("versions"),
        game_versions: arr("game_versions"),
        loaders: arr("loaders"),
        date_modified: h["date_modified"].as_str().unwrap_or("").to_string(),
        color: h["color"].as_i64(),
        slug: h["slug"].as_str().unwrap_or("").to_string(),
    }
}

fn urlencode(s: &str) -> String {
    s.chars().map(|c| match c {
        'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
        ' ' => "+".to_string(),
        _ => format!("%{:02X}", c as u32),
    }).collect()
}

#[tauri::command]
pub async fn search_modrinth(
    query: String,
    limit: Option<u64>,
    offset: Option<u64>,
    categories: Option<Vec<String>>,
    versions: Option<Vec<String>>,
    loaders: Option<Vec<String>>,
    sort: Option<String>,
) -> Result<ModrinthSearchResult, String> {
    let client = reqwest::Client::builder()
        .user_agent("PortalLauncher/1.0.0 (contact@portalrolls.dev)")
        .build().map_err(|e| e.to_string())?;

    let limit = limit.unwrap_or(20).min(100);
    let offset = offset.unwrap_or(0);
    let index = match sort.as_deref() {
        Some("Downloads") => "downloads",
        Some("Stars") | Some("Follows") => "follows",
        Some("Updated") => "updated",
        Some("Newest") => "newest",
        _ => "relevance",
    };

    let mut facet_groups: Vec<Vec<String>> = vec![];
    if let Some(cats) = &categories {
        let filtered: Vec<_> = cats.iter().filter(|c| *c != "All").map(|c| format!("\"categories:{}\"", c.to_lowercase())).collect();
        if !filtered.is_empty() { facet_groups.push(filtered); }
    }
    if let Some(vers) = &versions {
        let filtered: Vec<_> = vers.iter().filter(|v| *v != "All").map(|v| format!("\"versions:{}\"", v)).collect();
        if !filtered.is_empty() { facet_groups.push(filtered); }
    }
    if let Some(ldr) = &loaders {
        let filtered: Vec<_> = ldr.iter().filter(|l| *l != "All").map(|l| format!("\"categories:{}\"", l.to_lowercase())).collect();
        if !filtered.is_empty() { facet_groups.push(filtered); }
    }

    let mut url = format!(
        "https://api.modrinth.com/v2/search?query={}&limit={}&offset={}&index={}",
        urlencode(&query), limit, offset, index
    );
    if !facet_groups.is_empty() {
        let facets: Vec<String> = facet_groups.iter().map(|g| format!("[{}]", g.join(","))).collect();
        url.push_str(&format!("&facets=[{}]", facets.join(",")));
    }

    let resp: serde_json::Value = client.get(&url).send().await
        .map_err(|e| format!("Network error: {e}"))?.json().await
        .map_err(|e| format!("Parse error: {e}"))?;

    let hits: Vec<ModrinthMod> = resp["hits"].as_array().unwrap_or(&vec![]).iter().map(parse_hit).collect();
    Ok(ModrinthSearchResult {
        total_hits: resp["total_hits"].as_u64().unwrap_or(hits.len() as u64),
        offset: resp["offset"].as_u64().unwrap_or(offset),
        limit: resp["limit"].as_u64().unwrap_or(limit),
        hits,
    })
}
