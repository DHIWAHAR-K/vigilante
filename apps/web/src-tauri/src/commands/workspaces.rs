use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

use crate::error::{VError, VResult};
use crate::models::workspace::{CreateWorkspaceRequest, Workspace, WorkspaceContextItem};
use crate::services::workspace_service::lookup_context_items;
use crate::state::AppState;

#[tauri::command]
pub fn list_workspaces(state: State<'_, AppState>) -> VResult<Vec<Workspace>> {
    state.db.list_workspaces()
}

#[tauri::command]
pub fn get_active_workspace(state: State<'_, AppState>) -> VResult<Workspace> {
    state.db.get_active_workspace()
}

#[tauri::command]
pub fn create_workspace_cmd(
    state: State<'_, AppState>,
    request: CreateWorkspaceRequest,
) -> VResult<Workspace> {
    state.db.create_workspace(request)
}

#[tauri::command]
pub fn set_active_workspace_cmd(state: State<'_, AppState>, id: Uuid) -> VResult<Workspace> {
    state.db.set_active_workspace(id)
}

#[tauri::command]
pub fn lookup_context_items_cmd(
    state: State<'_, AppState>,
    workspace_id: Uuid,
    query: String,
) -> VResult<Vec<WorkspaceContextItem>> {
    lookup_context_items(&state.db, workspace_id, &query)
}

#[tauri::command]
pub async fn pick_workspace_directory_cmd(app: AppHandle) -> VResult<Option<String>> {
    let Some(path) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };

    let path = path
        .into_path()
        .map_err(|err| VError::Other(format!("Failed to resolve selected folder: {err}")))?;

    Ok(Some(path.display().to_string()))
}

#[tauri::command]
pub async fn pick_attachment_files_cmd(app: AppHandle) -> VResult<Vec<String>> {
    let Some(paths) = app.dialog().file().blocking_pick_files() else {
        return Ok(Vec::new());
    };

    paths
        .into_iter()
        .map(|path| {
            path.into_path()
                .map(|resolved| resolved.display().to_string())
                .map_err(|err| VError::Other(format!("Failed to resolve selected file: {err}")))
        })
        .collect()
}
