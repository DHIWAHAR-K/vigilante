use tauri::{AppHandle, State};
use uuid::Uuid;

use crate::error::VResult;
use crate::models::desktop::{DesktopQueryRequest, QuerySubmission, ThreadDetail, ThreadSummary, WebSource};
use crate::models::settings::AppSettings;
use crate::services::chat_service::submit_query;
use crate::services::export_service::{export_thread_json, export_thread_markdown};
use crate::services::activity_service::log_export_created;
use crate::state::AppState;
use crate::storage::json_store::read_json_or_default;

#[tauri::command]
pub fn list_workspace_threads(
    state: State<'_, AppState>,
    workspace_id: Uuid,
) -> VResult<Vec<ThreadSummary>> {
    state.db.list_threads(workspace_id)
}

#[tauri::command]
pub fn open_workspace_thread(
    state: State<'_, AppState>,
    thread_id: Uuid,
) -> VResult<ThreadDetail> {
    state.db.open_thread(thread_id)
}

#[tauri::command]
pub fn archive_workspace_thread(state: State<'_, AppState>, thread_id: Uuid) -> VResult<()> {
    state.db.archive_thread(thread_id)
}

#[tauri::command]
pub fn delete_workspace_thread(state: State<'_, AppState>, thread_id: Uuid) -> VResult<()> {
    state.db.delete_thread(thread_id)
}

#[tauri::command]
pub fn list_thread_sources(state: State<'_, AppState>, thread_id: Uuid) -> VResult<Vec<WebSource>> {
    state.db.list_web_sources(thread_id)
}

#[tauri::command]
pub fn export_workspace_thread(
    state: State<'_, AppState>,
    thread_id: Uuid,
    format: String,
) -> VResult<String> {
    let settings: AppSettings = read_json_or_default(state.paths.settings().as_path());
    let thread = state
        .db
        .build_persisted_thread(thread_id, settings.default_provider)?;

    let path = match format.as_str() {
        "json" => export_thread_json(&state.paths, &thread)?,
        _ => export_thread_markdown(&state.paths, &thread)?,
    };

    let _ = log_export_created(&state.paths, thread_id, &format, &path);
    Ok(path)
}

#[tauri::command]
pub async fn submit_desktop_query(
    app: AppHandle,
    state: State<'_, AppState>,
    request: DesktopQueryRequest,
) -> VResult<QuerySubmission> {
    submit_query(&app, &state.db, &state.paths, request).await
}
