use chrono::Utc;
use tauri::State;

use crate::error::VResult;
use crate::models::activity::ActivityEvent;
use crate::models::settings::{AppSettings, RuntimeSettings};
use crate::services::activity_service::log_event;
use crate::services::runtime_service::normalize_runtime_config;
use crate::state::AppState;
use crate::storage::json_store::{read_json_or_default, write_json_atomic};
use uuid::Uuid;

/// Return the current app settings (creates defaults if the file doesn't exist).
#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> AppSettings {
    read_json_or_default(state.paths.settings().as_path())
}

/// Overwrite app settings with the provided value and return the saved copy.
#[tauri::command]
pub fn update_settings(state: State<'_, AppState>, settings: AppSettings) -> VResult<AppSettings> {
    let mut s = settings;
    s.updated_at = Utc::now();
    write_json_atomic(state.paths.settings().as_path(), &s)?;
    let _ = log_event(
        &state.paths,
        ActivityEvent::SettingsUpdated {
            event_id: Uuid::new_v4(),
            timestamp: Utc::now(),
        },
    );
    Ok(s)
}

/// Return the current Ollama runtime configuration.
#[tauri::command]
pub fn get_runtime_config(state: State<'_, AppState>) -> RuntimeSettings {
    normalize_runtime_config(read_json_or_default(state.paths.runtime_config().as_path()))
}

/// Overwrite the runtime configuration.
#[tauri::command]
pub fn update_runtime_config(
    state: State<'_, AppState>,
    config: RuntimeSettings,
) -> VResult<RuntimeSettings> {
    let mut c = normalize_runtime_config(config);
    c.updated_at = Utc::now();
    write_json_atomic(state.paths.runtime_config().as_path(), &c)?;
    Ok(c)
}
