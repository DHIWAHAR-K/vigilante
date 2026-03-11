use tauri::State;
use uuid::Uuid;

use crate::error::VResult;
use crate::models::index::ThreadIndexEntry;
use crate::models::thread::PersistedThread;
use crate::services::activity_service::{
    log_thread_archived, log_thread_deleted, log_thread_opened, log_thread_renamed,
    log_thread_unarchived,
};
use crate::services::thread_service::{
    archive_thread, delete_thread, flush_index, open_thread, rename_thread, touch_thread,
    unarchive_thread,
};
use crate::state::AppState;

/// Return the full sidebar thread list (active threads, sorted newest first).
/// Reads from the in-memory index — never touches individual thread files.
#[tauri::command]
pub fn list_threads(state: State<'_, AppState>) -> Vec<ThreadIndexEntry> {
    let index = state.thread_index.read();
    index.active_sorted().into_iter().cloned().collect()
}

/// Return archived threads sorted newest first.
#[tauri::command]
pub fn list_archived_threads(state: State<'_, AppState>) -> Vec<ThreadIndexEntry> {
    let index = state.thread_index.read();
    index.archived_sorted().into_iter().cloned().collect()
}

/// Load the full content of a thread from disk and update `last_opened_at`.
#[tauri::command]
pub fn open_thread_cmd(state: State<'_, AppState>, id: Uuid) -> VResult<PersistedThread> {
    let thread = open_thread(&state.paths, &id)?;
    let _ = touch_thread(&state.paths, &id);
    let _ = log_thread_opened(&state.paths, id);
    Ok(thread)
}

/// Rename a thread, update index.
#[tauri::command]
pub fn rename_thread_cmd(
    state: State<'_, AppState>,
    id: Uuid,
    title: String,
) -> VResult<ThreadIndexEntry> {
    let old_title = {
        let index = state.thread_index.read();
        index
            .entries
            .iter()
            .find(|e| e.id == id)
            .map(|e| e.title.clone())
            .unwrap_or_default()
    };

    let entry = rename_thread(&state.paths, &id, title.clone())?;

    {
        let mut index = state.thread_index.write();
        index.upsert(entry.clone());
        flush_index(&state.paths, &index)?;
    }

    let _ = log_thread_renamed(&state.paths, id, old_title, title);
    Ok(entry)
}

/// Archive a thread (keeps the file, removes from default sidebar list).
#[tauri::command]
pub fn archive_thread_cmd(state: State<'_, AppState>, id: Uuid) -> VResult<ThreadIndexEntry> {
    let entry = archive_thread(&state.paths, &id)?;

    {
        let mut index = state.thread_index.write();
        index.upsert(entry.clone());
        flush_index(&state.paths, &index)?;
    }

    let _ = log_thread_archived(&state.paths, id);
    Ok(entry)
}

/// Unarchive a thread (restores to default sidebar list).
#[tauri::command]
pub fn unarchive_thread_cmd(state: State<'_, AppState>, id: Uuid) -> VResult<ThreadIndexEntry> {
    let entry = unarchive_thread(&state.paths, &id)?;

    {
        let mut index = state.thread_index.write();
        index.upsert(entry.clone());
        flush_index(&state.paths, &index)?;
    }

    let _ = log_thread_unarchived(&state.paths, id);
    Ok(entry)
}

/// Permanently delete a thread file + attachment folder.
#[tauri::command]
pub fn delete_thread_cmd(state: State<'_, AppState>, id: Uuid) -> VResult<()> {
    delete_thread(&state.paths, &id)?;

    {
        let mut index = state.thread_index.write();
        index.remove(&id);
        flush_index(&state.paths, &index)?;
    }

    let _ = log_thread_deleted(&state.paths, id);
    Ok(())
}
