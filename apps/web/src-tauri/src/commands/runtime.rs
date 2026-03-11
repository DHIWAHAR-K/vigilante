use tauri::State;

use crate::error::VResult;
use crate::models::runtime::{ModelInfo, OllamaRuntimeStatus};
use crate::services::activity_service::log_runtime_checked;
use crate::services::runtime_service::{cached_runtime_status, probe_ollama};
use crate::state::AppState;
use crate::storage::json_store::read_json_or_default;

/// Probe the local Ollama instance and return the result.
/// Writes the result to `cache/runtime-status.json` for the next cold read.
#[tauri::command]
pub async fn check_runtime(state: State<'_, AppState>) -> VResult<OllamaRuntimeStatus> {
    let config = read_json_or_default(state.paths.runtime_config().as_path());
    let result = probe_ollama(&state.paths, &config).await?;
    let _ = log_runtime_checked(&state.paths, &format!("{:?}", result.status));
    Ok(result)
}

/// Return the cached Ollama status without probing (fast, used for cold start).
#[tauri::command]
pub fn get_cached_runtime_status(state: State<'_, AppState>) -> OllamaRuntimeStatus {
    cached_runtime_status(&state.paths)
}

/// Return the cached model list without probing.
#[tauri::command]
pub fn list_models(state: State<'_, AppState>) -> Vec<ModelInfo> {
    cached_runtime_status(&state.paths).models
}
