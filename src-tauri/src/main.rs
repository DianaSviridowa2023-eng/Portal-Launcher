#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

pub mod api;
pub mod commands;
pub mod models;
pub mod services;
pub mod utils;

use std::sync::Arc;
use tokio::sync::RwLock;

pub struct AppState { pub pending_auth: Arc<RwLock<Option<String>>> }
impl AppState { pub fn new() -> Self { Self { pending_auth: Arc::new(RwLock::new(None)) } } }

fn main() {
    env_logger::init();
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::auth::start_device_code_flow,
            commands::auth::poll_for_token,
            commands::auth::refresh_token,
            commands::token_manager::store_tokens,
            commands::token_manager::get_stored_refresh_token,
            commands::token_manager::delete_stored_tokens,
            commands::instances::get_instances,
            commands::instances::create_instance,
            commands::instances::update_instance,
            commands::instances::delete_instance,
            commands::instances::duplicate_instance,
            commands::instances::open_instance_folder,
            commands::instances::export_instance_zip,
            commands::instances::import_instance_zip,
            commands::instances::import_modrinth_pack,
            commands::instances::backup_instance,
            commands::instances::list_backups,
            commands::minecraft::launch_instance,
            commands::minecraft::kill_instance,
            commands::version_manager::get_installed_versions,
            commands::version_manager::get_available_versions,
            commands::version_manager::download_minecraft_version,
            commands::version_manager::delete_minecraft_version,
            commands::loader_installer::install_forge,
            commands::loader_installer::install_fabric,
            commands::loader_installer::install_quilt,
            commands::loader_installer::install_neoforge,
            commands::loader_installer::get_fabric_versions,
            commands::loader_installer::get_forge_versions,
            commands::loader_installer::get_neoforge_versions,
            commands::mods::search_mods,
            commands::mods::install_mod,
            commands::mods::get_instance_mods,
            commands::mods::toggle_mod,
            commands::mods::remove_mod,
            commands::mods::check_mod_updates,
            commands::mods::update_all_mods,
            commands::mods::detect_mod_conflicts,
            commands::mods::check_mod_compatibility,
            commands::modrinth::search_modrinth,
            commands::curseforge::search_curseforge,
            commands::skins::get_current_skin,
            commands::skins::upload_skin,
            commands::friends::get_friends,
            commands::friends::add_friend,
            commands::friends::remove_friend,
            commands::friends::join_friend_world,
            commands::chat::send_message,
            commands::chat::get_messages,
            commands::chat::delete_message,
            commands::chat::mark_messages_read,
            commands::chat::flush_offline_queue,
            commands::voice::start_voice_message_upload,
            commands::voice::list_voice_messages,
            commands::voice::delete_voice_message,
            commands::webrtc_signaling::send_offer,
            commands::webrtc_signaling::send_answer,
            commands::webrtc_signaling::poll_signaling,
            commands::webrtc_signaling::send_ice_candidate,
            commands::webrtc_signaling::poll_ice_candidates,
            commands::webrtc_signaling::clear_signaling,
            commands::audio::list_audio_devices,
            commands::jvm::get_java_info,
            commands::jvm::download_java,
            commands::jvm::get_managed_java_versions,
            commands::files::open_folder,
            commands::files::read_file_bytes,
            commands::files::write_file_bytes,
            commands::settings::get_all,
            commands::settings::set_setting,
            commands::settings::save_all_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
