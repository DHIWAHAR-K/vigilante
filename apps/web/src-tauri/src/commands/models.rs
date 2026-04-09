use tauri::State;
use uuid::Uuid;

use crate::error::VResult;
use crate::models::runtime::{CatalogModel, ModelInfo, ModelInstallJob, RuntimeSnapshot};
use crate::services::model_service;
use crate::state::AppState;

#[tauri::command]
pub async fn get_runtime_snapshot(state: State<'_, AppState>) -> VResult<RuntimeSnapshot> {
    model_service::get_runtime_snapshot(&state.paths, &state.db).await
}

#[tauri::command]
pub fn list_model_catalog() -> Vec<CatalogModel> {
    model_service::list_model_catalog()
}

#[tauri::command]
pub async fn list_installed_models_cmd(state: State<'_, AppState>) -> VResult<Vec<ModelInfo>> {
    model_service::list_installed_models(&state.paths).await
}

#[tauri::command]
pub fn get_selected_model_cmd(state: State<'_, AppState>) -> String {
    model_service::get_selected_model_id(&state.paths)
}

#[tauri::command]
pub fn select_model_cmd(state: State<'_, AppState>, model_id: String) -> VResult<String> {
    model_service::set_selected_model_id(&state.paths, &model_id)
}

#[tauri::command]
pub async fn install_model_cmd(
    state: State<'_, AppState>,
    model_id: String,
) -> VResult<ModelInstallJob> {
    model_service::start_model_install(state, model_id).await
}

#[tauri::command]
pub fn get_install_job_cmd(
    state: State<'_, AppState>,
    job_id: Uuid,
) -> VResult<Option<ModelInstallJob>> {
    model_service::get_model_install_job(state, job_id)
}

#[tauri::command]
pub fn cancel_install_job_cmd(
    state: State<'_, AppState>,
    job_id: Uuid,
) -> VResult<Option<ModelInstallJob>> {
    model_service::cancel_model_install(state, job_id)
}

#[tauri::command]
pub async fn delete_model_cmd(state: State<'_, AppState>, model_id: String) -> VResult<()> {
    model_service::delete_model(&state.paths, &model_id).await
}
