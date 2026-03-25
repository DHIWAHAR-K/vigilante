use parking_lot::RwLock;

use crate::models::index::ThreadIndex;
use crate::services::database_service::AppDatabase;
use crate::storage::paths::StoragePaths;

/// Global application state managed by Tauri.
///
/// Registered once at startup via `tauri::Builder::manage(AppState::new(paths))`.
/// Every command handler receives `tauri::State<'_, AppState>`.
pub struct AppState {
    /// All resolved filesystem paths for the Vigilante data directory.
    pub paths: StoragePaths,

    /// SQLite-backed desktop app state for workspaces, threads, and messages.
    pub db: AppDatabase,

    /// In-memory mirror of `thread-index.json`.
    /// Using `parking_lot::RwLock` for cheap concurrent reads (sidebar polling).
    /// Writers must also persist changes to disk via `thread_service::flush_index`.
    pub thread_index: RwLock<ThreadIndex>,
}

impl AppState {
    pub fn new(paths: StoragePaths, thread_index: ThreadIndex, db: AppDatabase) -> Self {
        Self {
            paths,
            db,
            thread_index: RwLock::new(thread_index),
        }
    }
}
