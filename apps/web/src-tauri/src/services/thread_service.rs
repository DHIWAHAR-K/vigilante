use chrono::Utc;
use uuid::Uuid;

use crate::error::{VError, VResult};
use crate::models::index::{ThreadIndex, ThreadIndexEntry};
use crate::models::message::Message;
use crate::models::thread::PersistedThread;
use crate::storage::json_store::{read_json, write_json_atomic};
use crate::storage::paths::StoragePaths;

// ── Read ─────────────────────────────────────────────────────────────────────

/// Load a full thread from disk by ID.
pub fn open_thread(paths: &StoragePaths, id: &Uuid) -> VResult<PersistedThread> {
    let path = paths.thread_file(id);
    read_json(&path).map_err(|_| VError::ThreadNotFound(id.to_string()))
}

// ── Write ─────────────────────────────────────────────────────────────────────

/// Persist a thread to disk and return the index entry derived from it.
/// Callers must also update the in-memory index and call `flush_index`.
pub fn save_thread(paths: &StoragePaths, thread: &PersistedThread) -> VResult<ThreadIndexEntry> {
    write_json_atomic(&paths.thread_file(&thread.id), thread)?;
    Ok(index_entry_from_thread(thread))
}

/// Rename a thread. Updates disk and returns the new index entry.
pub fn rename_thread(
    paths: &StoragePaths,
    id: &Uuid,
    new_title: String,
) -> VResult<ThreadIndexEntry> {
    let mut thread = open_thread(paths, id)?;
    thread.title = new_title;
    thread.updated_at = Utc::now();
    save_thread(paths, &thread)
}

/// Set `archived = true` on a thread.
pub fn archive_thread(paths: &StoragePaths, id: &Uuid) -> VResult<ThreadIndexEntry> {
    let mut thread = open_thread(paths, id)?;
    thread.archived = true;
    thread.updated_at = Utc::now();
    save_thread(paths, &thread)
}

/// Set `archived = false` on a thread.
pub fn unarchive_thread(paths: &StoragePaths, id: &Uuid) -> VResult<ThreadIndexEntry> {
    let mut thread = open_thread(paths, id)?;
    thread.archived = false;
    thread.updated_at = Utc::now();
    save_thread(paths, &thread)
}

/// Permanently delete a thread file (and its attachment directory if present).
/// Returns the thread title for activity logging (best-effort; empty string if not found).
pub fn delete_thread(paths: &StoragePaths, id: &Uuid) -> VResult<String> {
    let title = open_thread(paths, id)
        .map(|t| t.title)
        .unwrap_or_default();

    let path = paths.thread_file(id);
    if path.exists() {
        std::fs::remove_file(&path)?;
    }

    // Remove attachment folder if it exists.
    let attach_dir = paths.attachments_dir().join(id.to_string());
    if attach_dir.exists() {
        std::fs::remove_dir_all(&attach_dir)?;
    }

    tracing::info!(id = %id, title = %title, "Thread deleted");
    Ok(title)
}

/// Append a message to an existing thread.
pub fn add_message(paths: &StoragePaths, thread_id: &Uuid, message: Message) -> VResult<ThreadIndexEntry> {
    let mut thread = open_thread(paths, thread_id)?;
    thread.messages.push(message);
    thread.updated_at = Utc::now();
    save_thread(paths, &thread)
}

/// Update the content of the last assistant message (used while streaming).
/// If no matching message is found, the operation is a no-op.
pub fn update_message_content(
    paths: &StoragePaths,
    thread_id: &Uuid,
    message_id: &Uuid,
    new_content: String,
    is_complete: bool,
) -> VResult<ThreadIndexEntry> {
    let mut thread = open_thread(paths, thread_id)?;
    if let Some(msg) = thread.messages.iter_mut().find(|m| &m.id == message_id) {
        msg.content = new_content;
        msg.is_complete = is_complete;
        msg.updated_at = Utc::now();
    }
    thread.updated_at = Utc::now();
    save_thread(paths, &thread)
}

/// Update `last_opened_at` for a thread.
pub fn touch_thread(paths: &StoragePaths, id: &Uuid) -> VResult<()> {
    let mut thread = open_thread(paths, id)?;
    thread.last_opened_at = Some(Utc::now());
    write_json_atomic(&paths.thread_file(&thread.id), &thread)?;
    Ok(())
}

// ── Index maintenance ────────────────────────────────────────────────────────

/// Persist the in-memory index to `thread-index.json`.
/// Must be called after every mutation that changes the index.
pub fn flush_index(paths: &StoragePaths, index: &ThreadIndex) -> VResult<()> {
    write_json_atomic(paths.thread_index().as_path(), index)
}

/// Derive a lightweight `ThreadIndexEntry` from a full `PersistedThread`.
pub fn index_entry_from_thread(thread: &PersistedThread) -> ThreadIndexEntry {
    let last = thread.messages.iter().rev().find(|m| {
        matches!(
            m.role,
            crate::models::message::MessageRole::Assistant
        )
    });

    let preview = thread.preview();

    let (last_provider_id, last_model_id) = last
        .and_then(|m| m.model_used.as_ref())
        .map(|mu| (Some(mu.provider_id.clone()), Some(mu.model_id.clone())))
        .unwrap_or((None, None));

    ThreadIndexEntry {
        id: thread.id,
        title: thread.title.clone(),
        preview,
        message_count: thread.messages.len() as u32,
        archived: thread.archived,
        pinned: thread.pinned,
        last_provider_id,
        last_model_id,
        created_at: thread.created_at,
        updated_at: thread.updated_at,
    }
}

/// Rebuild the index by scanning all thread files on disk.
/// Expensive — only use as a recovery tool or on first migration.
pub fn rebuild_index(paths: &StoragePaths) -> VResult<ThreadIndex> {
    use crate::models::index::ThreadIndex;
    use crate::storage::json_store::read_json;

    let mut index = ThreadIndex::new();

    let entries = match std::fs::read_dir(paths.threads_dir()) {
        Ok(e) => e,
        Err(_) => return Ok(index),
    };

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        match read_json::<PersistedThread>(&path) {
            Ok(thread) => {
                index.upsert(index_entry_from_thread(&thread));
            }
            Err(e) => {
                tracing::warn!(path = %path.display(), error = %e, "Skipping malformed thread file");
            }
        }
    }

    flush_index(paths, &index)?;
    Ok(index)
}
