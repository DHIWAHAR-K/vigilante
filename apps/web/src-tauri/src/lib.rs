pub mod commands;
pub mod error;
pub mod models;
pub mod services;
pub mod state;
pub mod storage;

use tauri::Manager;
use services::storage_service::init_storage;
use services::database_service::AppDatabase;
use state::AppState;
use storage::paths::StoragePaths;

/// Build and run the Tauri application.
///
/// This function is the single entry point shared by `main.rs` (desktop) and
/// any future mobile targets.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // ── Plugins ─────────────────────────────────────────────────────────
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        // ── Global state ─────────────────────────────────────────────────────
        .setup(|app| {
            // Initialise tracing.
            tracing_subscriber::fmt()
                .with_env_filter(
                    tracing_subscriber::EnvFilter::try_from_default_env()
                        .unwrap_or_else(|_| "vigilante=info".into()),
                )
                .init();

            // Resolve the OS-native app local data directory.
            let base = app
                .path()
                .app_local_data_dir()
                .expect("Failed to resolve app local data directory");

            tracing::info!(base = %base.display(), "Vigilante data directory");

            let paths = StoragePaths::new(base);

            // Run directory creation + schema migrations.
            let thread_index = init_storage(&paths)
                .expect("Failed to initialise local storage");
            let db = AppDatabase::open(paths.database().as_path())
                .expect("Failed to initialise SQLite storage");
            db.import_legacy_json_threads(&paths)
                .expect("Failed to import legacy thread data");

            // Log app start event (best-effort — don't block startup).
            let _ = services::activity_service::log_app_started(
                &paths,
                storage::migrations::CURRENT_SCHEMA_VERSION,
            );

            // Register AppState as managed Tauri state.
            app.manage(AppState::new(paths, thread_index, db));

            Ok(())
        })
        // ── Commands ─────────────────────────────────────────────────────────
        .invoke_handler(tauri::generate_handler![
            // storage
            commands::storage::get_storage_path,
            commands::storage::get_storage_info_cmd,
            // desktop workspaces + chat
            commands::workspaces::list_workspaces,
            commands::workspaces::get_active_workspace,
            commands::workspaces::create_workspace_cmd,
            commands::workspaces::set_active_workspace_cmd,
            commands::workspaces::lookup_context_items_cmd,
            commands::workspaces::pick_workspace_directory_cmd,
            commands::chat::list_workspace_threads,
            commands::chat::open_workspace_thread,
            commands::chat::archive_workspace_thread,
            commands::chat::delete_workspace_thread,
            commands::chat::list_thread_sources,
            commands::chat::export_workspace_thread,
            commands::chat::submit_desktop_query,
            // settings
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::get_runtime_config,
            commands::settings::update_runtime_config,
            // threads
            commands::threads::list_threads,
            commands::threads::list_archived_threads,
            commands::threads::open_thread_cmd,
            commands::threads::rename_thread_cmd,
            commands::threads::archive_thread_cmd,
            commands::threads::unarchive_thread_cmd,
            commands::threads::delete_thread_cmd,
            // drafts
            commands::drafts::create_draft_cmd,
            commands::drafts::save_draft_cmd,
            commands::drafts::discard_draft_cmd,
            commands::drafts::promote_draft_cmd,
            // messages
            commands::messages::add_message_cmd,
            commands::messages::update_message_content_cmd,
            // runtime — see commands/runtime.rs for full tier documentation
            commands::runtime::get_cached_runtime_status,  // tier 1: instant cache
            commands::runtime::list_models,                 // tier 1: instant cache
            commands::runtime::probe_runtime,               // tier 2: HTTP probe only
            commands::runtime::ensure_runtime_ready,        // tier 3: launch + auto-start
            commands::runtime::start_ollama_if_installed,   // supplemental: fire-and-forget
            // activity + export
            commands::activity::list_activity,
            commands::activity::export_thread_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Vigilante");
}
