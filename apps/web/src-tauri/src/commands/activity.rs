use tauri::State;

use crate::error::VResult;
use crate::models::activity::ActivityEvent;
use crate::services::activity_service::list_recent_events;
use crate::state::AppState;

/// Return the last `limit` activity events (most-recent last).
/// Defaults to 100 if `limit` is 0.
#[tauri::command]
pub fn list_activity(state: State<'_, AppState>, limit: u32) -> VResult<Vec<ActivityEvent>> {
    let n = if limit == 0 { 100 } else { limit as usize };
    list_recent_events(&state.paths, n)
}

/// Return the most recent export events only.
#[tauri::command]
pub fn export_thread_cmd(
    state: State<'_, AppState>,
    id: uuid::Uuid,
    format: String,
) -> VResult<String> {
    use crate::services::export_service::{export_thread_json, export_thread_markdown};
    use crate::services::thread_service::open_thread;
    use crate::services::activity_service::log_export_created;

    let thread = open_thread(&state.paths, &id)?;

    let path = match format.as_str() {
        "json" => export_thread_json(&state.paths, &thread)?,
        _ => export_thread_markdown(&state.paths, &thread)?,
    };

    let _ = log_export_created(&state.paths, id, &format, &path);
    Ok(path)
}
