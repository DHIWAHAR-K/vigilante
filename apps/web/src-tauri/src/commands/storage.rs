use tauri::State;

use crate::error::VResult;
use crate::services::storage_service::{get_storage_info, StorageInfo};
use crate::state::AppState;

/// Return the absolute path to the Vigilante data directory.
#[tauri::command]
pub fn get_storage_path(state: State<'_, AppState>) -> String {
    state.paths.base.display().to_string()
}

/// Return aggregated storage statistics (path, thread count, total size).
#[tauri::command]
pub fn get_storage_info_cmd(state: State<'_, AppState>) -> VResult<StorageInfo> {
    let index = state.thread_index.read();
    get_storage_info(&state.paths, &index)
}
