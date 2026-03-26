use std::collections::HashMap;
use std::sync::Arc;

use parking_lot::RwLock;
use tokio::task::JoinHandle;
use uuid::Uuid;

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

    /// Active background model install tasks keyed by install job id.
    pub install_tasks: Arc<RwLock<HashMap<Uuid, JoinHandle<()>>>>,
}

impl AppState {
    pub fn new(paths: StoragePaths, thread_index: ThreadIndex, db: AppDatabase) -> Self {
        Self {
            paths,
            db,
            thread_index: RwLock::new(thread_index),
            install_tasks: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}
