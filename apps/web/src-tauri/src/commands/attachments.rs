use tauri::State;
use uuid::Uuid;

use crate::error::VResult;
use crate::models::attachment::AttachmentSummary;
use crate::services::attachment_service::{
    import_attachments, list_attachments, remove_attachment, to_composer_attachments,
};
use crate::services::draft_service::replace_draft_attachments;
use crate::state::AppState;

#[tauri::command]
pub fn import_attachments_cmd(
    state: State<'_, AppState>,
    owner_id: Uuid,
    paths: Vec<String>,
) -> VResult<Vec<AttachmentSummary>> {
    let attachments = import_attachments(&state.paths, &owner_id, paths)?;
    if state.paths.draft_file(&owner_id).exists() {
        let _ = replace_draft_attachments(
            &state.paths,
            &owner_id,
            to_composer_attachments(&attachments),
        )?;
    }
    Ok(attachments)
}

#[tauri::command]
pub fn list_attachments_cmd(
    state: State<'_, AppState>,
    owner_id: Uuid,
) -> VResult<Vec<AttachmentSummary>> {
    list_attachments(&state.paths, &owner_id)
}

#[tauri::command]
pub fn remove_attachment_cmd(
    state: State<'_, AppState>,
    owner_id: Uuid,
    attachment_id: Uuid,
) -> VResult<()> {
    remove_attachment(&state.paths, &owner_id, &attachment_id)?;
    if state.paths.draft_file(&owner_id).exists() {
        let remaining = list_attachments(&state.paths, &owner_id)?;
        let _ = replace_draft_attachments(
            &state.paths,
            &owner_id,
            to_composer_attachments(&remaining),
        )?;
    }
    Ok(())
}
