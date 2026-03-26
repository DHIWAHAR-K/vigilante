use tauri::State;
use uuid::Uuid;

use crate::error::VResult;
use crate::models::message::Message;
use crate::models::settings::ProviderConfig;
use crate::models::thread::{DraftContextItem, DraftThread, PersistedThread};
use crate::services::activity_service::{log_message_sent, log_thread_created};
use crate::services::draft_service::{
    create_draft, discard_draft, get_draft, promote_draft, save_draft,
};
use crate::services::thread_service::flush_index;
use crate::state::AppState;

/// Create a new ephemeral draft with the given provider configuration.
/// Returns the draft (including its `id`) for the frontend to track.
#[tauri::command]
pub fn create_draft_cmd(
    state: State<'_, AppState>,
    provider: ProviderConfig,
) -> VResult<DraftThread> {
    create_draft(&state.paths, provider)
}

#[tauri::command]
pub fn get_draft_cmd(state: State<'_, AppState>, id: Uuid) -> VResult<DraftThread> {
    get_draft(&state.paths, &id)
}

/// Save the current composer text + context to the draft file (call this debounced on input).
#[tauri::command]
pub fn save_draft_cmd(
    state: State<'_, AppState>,
    id: Uuid,
    input_text: String,
    context_items: Vec<DraftContextItem>,
) -> VResult<DraftThread> {
    save_draft(&state.paths, &id, input_text, context_items)
}

/// Discard a draft (e.g. user pressed Escape or closed a new-chat panel).
#[tauri::command]
pub fn discard_draft_cmd(state: State<'_, AppState>, id: Uuid) -> VResult<()> {
    discard_draft(&state.paths, &id)
}

/// Promote a draft to a persisted thread by sending the first message.
///
/// This is the canonical "first send" path:
///   1. Draft → PersistedThread (file written, draft removed).
///   2. Index updated + flushed.
///   3. Activity events logged.
///
/// Returns the full `PersistedThread` so the frontend can navigate to it.
#[tauri::command]
pub fn promote_draft_cmd(
    state: State<'_, AppState>,
    draft_id: Uuid,
    first_message: Message,
) -> VResult<PersistedThread> {
    let msg_id = first_message.id;
    let (thread, entry) = promote_draft(&state.paths, &draft_id, first_message)?;

    {
        let mut index = state.thread_index.write();
        index.upsert(entry);
        flush_index(&state.paths, &index)?;
    }

    let _ = log_thread_created(&state.paths, thread.id, thread.title.clone());
    let _ = log_message_sent(&state.paths, thread.id, msg_id, "user");

    Ok(thread)
}
