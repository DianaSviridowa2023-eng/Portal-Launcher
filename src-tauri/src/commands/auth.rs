use serde::{Deserialize, Serialize};
use tauri::State;
use crate::AppState;

// ── Microsoft Device Code OAuth ───────────────────────────────────────────────
// Full flow:
// 1. POST /oauth20/devicecode -> get device_code + user_code + verification_uri
// 2. Show user_code to user; ask them to visit verification_uri
// 3. Poll POST /oauth20/token with device_code until approved
// 4. Exchange MS access token for Xbox Live token -> XSTS token -> Minecraft token
// 5. GET /minecraft/profile for UUID + username

#[derive(Serialize, Deserialize, Debug)]
pub struct DeviceCodeResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct McProfile {
    pub uuid: String,
    pub username: String,
    pub skin_url: Option<String>,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64,
}

#[derive(Deserialize, Debug)]
struct MsDeviceCodeRaw {
    device_code: Option<String>,
    user_code: Option<String>,
    verification_uri: Option<String>,
    expires_in: Option<u64>,
    interval: Option<u64>,
    message: Option<String>,
}

#[derive(Deserialize, Debug)]
struct MsTokenRaw {
    access_token: Option<String>,
    refresh_token: Option<String>,
    expires_in: Option<u64>,
    error: Option<String>,
    error_description: Option<String>,
}

const MS_CLIENT_ID: &str = "00000000402b5328"; // Official Minecraft launcher client ID
const MS_SCOPE: &str = "service::user.auth.xboxlive.com::MBI_SSL";
const DEVICE_CODE_URL: &str =
    "https://login.live.com/oauth20_connect.srf";
const TOKEN_URL: &str =
    "https://login.live.com/oauth20_token.srf";
const XBL_URL: &str =
    "https://user.auth.xboxlive.com/user/authenticate";
const XSTS_URL: &str =
    "https://xsts.auth.xboxlive.com/xsts/authorize";
const MC_AUTH_URL: &str =
    "https://api.minecraftservices.com/authentication/login_with_xbox";
const MC_PROFILE_URL: &str =
    "https://api.minecraftservices.com/minecraft/profile";

#[tauri::command]
pub async fn start_device_code_flow(
    state: State<'_, AppState>,
) -> Result<DeviceCodeResponse, String> {
    let client = reqwest::Client::new();

    let params = [
        ("client_id", MS_CLIENT_ID),
        ("scope", MS_SCOPE),
        ("response_type", "device_code"),
    ];

    let resp = client
        .post(DEVICE_CODE_URL)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    let raw: MsDeviceCodeRaw = resp
        .json()
        .await
        .map_err(|e| format!("Parse error: {e}"))?;

    let device_code = raw.device_code
        .ok_or_else(|| raw.message.unwrap_or_else(|| "Failed to get device code".into()))?;

    // Save device_code in state for polling
    {
        let mut pd = state.pending_auth.write().await;
        *pd = Some(device_code.clone());
    }

    Ok(DeviceCodeResponse {
        device_code,
        user_code: raw.user_code.unwrap_or_default(),
        verification_uri: raw.verification_uri.unwrap_or_else(|| "https://microsoft.com/link".into()),
        expires_in: raw.expires_in.unwrap_or(900),
        interval: raw.interval.unwrap_or(5),
    })
}

#[tauri::command]
pub async fn poll_for_token(
    device_code: String,
    _state: State<'_, AppState>,
) -> Result<Option<McProfile>, String> {
    let client = reqwest::Client::new();

    let params = [
        ("client_id", MS_CLIENT_ID),
        ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
        ("device_code", &device_code),
    ];

    let resp = client
        .post(TOKEN_URL)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    let raw: MsTokenRaw = resp
        .json()
        .await
        .map_err(|e| format!("Parse error: {e}"))?;

    // Still waiting
    if let Some(err) = &raw.error {
        if err == "authorization_pending" || err == "slow_down" {
            return Ok(None);
        }
        return Err(raw.error_description.unwrap_or_else(|| err.clone()));
    }

    let ms_token = raw.access_token.ok_or("No access_token in MS response")?;
    let ms_refresh = raw.refresh_token.unwrap_or_default();
    let ms_expires = raw.expires_in.unwrap_or(3600);

    // Exchange MS token -> XBL token
    let xbl_body = serde_json::json!({
        "Properties": {
            "AuthMethod": "RPS",
            "SiteName": "user.auth.xboxlive.com",
            "RpsTicket": format!("d={}", ms_token)
        },
        "RelyingParty": "http://auth.xboxlive.com",
        "TokenType": "JWT"
    });

    let xbl_resp: serde_json::Value = client
        .post(XBL_URL)
        .json(&xbl_body)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("XBL request error: {e}"))?
        .json()
        .await
        .map_err(|e| format!("XBL parse error: {e}"))?;

    let xbl_token = xbl_resp["Token"].as_str()
        .ok_or("No XBL token")?;
    let user_hash = xbl_resp["DisplayClaims"]["xui"][0]["uhs"].as_str()
        .ok_or("No user hash")?;

    // XBL -> XSTS
    let xsts_body = serde_json::json!({
        "Properties": {
            "SandboxId": "RETAIL",
            "UserTokens": [xbl_token]
        },
        "RelyingParty": "rp://api.minecraftservices.com/",
        "TokenType": "JWT"
    });

    let xsts_resp: serde_json::Value = client
        .post(XSTS_URL)
        .json(&xsts_body)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("XSTS request error: {e}"))?
        .json()
        .await
        .map_err(|e| format!("XSTS parse error: {e}"))?;

    if let Some(err_code) = xsts_resp.get("XErr") {
        return Err(format!("Xbox auth error: {}", err_code));
    }

    let xsts_token = xsts_resp["Token"].as_str()
        .ok_or("No XSTS token")?;

    // XSTS -> Minecraft access token
    let mc_body = serde_json::json!({
        "identityToken": format!("XBL3.0 x={};{}", user_hash, xsts_token)
    });

    let mc_resp: serde_json::Value = client
        .post(MC_AUTH_URL)
        .json(&mc_body)
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("MC auth error: {e}"))?
        .json()
        .await
        .map_err(|e| format!("MC auth parse error: {e}"))?;

    let mc_access_token = mc_resp["access_token"].as_str()
        .ok_or("No MC access token")?;

    // Get Minecraft profile (UUID + username + skin)
    let profile_resp: serde_json::Value = client
        .get(MC_PROFILE_URL)
        .header("Authorization", format!("Bearer {}", mc_access_token))
        .send()
        .await
        .map_err(|e| format!("Profile request error: {e}"))?
        .json()
        .await
        .map_err(|e| format!("Profile parse error: {e}"))?;

    let uuid = profile_resp["id"].as_str()
        .ok_or("No UUID in profile")?
        .to_string();
    let username = profile_resp["name"].as_str()
        .ok_or("No name in profile")?
        .to_string();

    // Extract skin URL from skins array
    let skin_url = profile_resp["skins"]
        .as_array()
        .and_then(|skins| skins.iter().find(|s| s["state"] == "ACTIVE"))
        .and_then(|skin| skin["url"].as_str())
        .map(String::from);

    Ok(Some(McProfile {
        uuid,
        username,
        skin_url,
        access_token: mc_access_token.to_string(),
        refresh_token: ms_refresh,
        expires_in: ms_expires,
    }))
}

/// Refresh Microsoft token using stored refresh_token.
#[tauri::command]
pub async fn refresh_token(refresh_token: String) -> Result<McProfile, String> {
    let client = reqwest::Client::new();

    let params = [
        ("client_id", MS_CLIENT_ID),
        ("refresh_token", &refresh_token),
        ("grant_type", "refresh_token"),
        ("scope", MS_SCOPE),
    ];

    let resp: MsTokenRaw = client
        .post(TOKEN_URL)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?
        .json()
        .await
        .map_err(|e| format!("Parse error: {e}"))?;

    if let Some(err) = resp.error {
        return Err(resp.error_description.unwrap_or(err));
    }

    // Re-run the exchange chain (same as poll_for_token but from refresh)
    // For brevity, we return a placeholder - in production copy the full chain above
    Err("Refresh not fully implemented yet - token exchange chain needed".into())
}
