use tauri::State;
use uuid::Uuid;

use crate::error::VResult;
use crate::models::message::Message;
use crate::services::activity_service::log_message_sent;
use crate::services::thread_service::{add_message, flush_index, update_message_content};
use crate::state::AppState;

/// Append a message (user or assistant) to an existing thread.
/// Updates the in-memory index and flushes it.
#[tauri::command]
pub fn add_message_cmd(
    state: State<'_, AppState>,
    thread_id: Uuid,
    message: Message,
) -> VResult<()> {
    let role = format!("{:?}", message.role).to_lowercase();
    let msg_id = message.id;

    let entry = add_message(&state.paths, &thread_id, message)?;

    {
        let mut index = state.thread_index.write();
        index.upsert(entry);
        flush_index(&state.paths, &index)?;
    }

    let _ = log_message_sent(&state.paths, thread_id, msg_id, &role);
    Ok(())
}

/// Overwrite the content of an assistant message (used for streaming updates).
///
/// `is_complete` should be `false` during streaming and `true` on the final chunk.
/// The index is flushed only when `is_complete` is true (preview update).
#[tauri::command]
pub fn update_message_content_cmd(
    state: State<'_, AppState>,
    thread_id: Uuid,
    message_id: Uuid,
    content: String,
    is_complete: bool,
) -> VResult<()> {
    let entry =
        update_message_content(&state.paths, &thread_id, &message_id, content, is_complete)?;

    if is_complete {
        let mut index = state.thread_index.write();
        index.upsert(entry);
        flush_index(&state.paths, &index)?;
    }

    Ok(())
}
