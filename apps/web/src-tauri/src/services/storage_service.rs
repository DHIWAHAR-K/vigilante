use serde::Serialize;

use crate::error::VResult;
use crate::models::index::ThreadIndex;
use crate::storage::json_store::read_json_or_default;
use crate::storage::migrations::run_migrations;
use crate::storage::paths::StoragePaths;

/// Human-readable info about the storage directory.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageInfo {
    pub base_path: String,
    pub thread_count: usize,
    pub draft_count: usize,
    pub total_size_bytes: u64,
}

/// Full startup sequence for the storage layer.
///
/// 1. Create all required directories.
/// 2. Run schema migrations.
/// 3. Load the thread index into memory.
///
/// Returns the in-memory `ThreadIndex` that should be placed in `AppState`.
pub fn init_storage(paths: &StoragePaths) -> VResult<ThreadIndex> {
    paths.ensure_dirs()?;
    run_migrations(paths)?;

    let index: ThreadIndex = read_json_or_default(paths.thread_index().as_path());
    tracing::info!(
        base = %paths.base.display(),
        threads = index.entries.len(),
        "Storage initialised"
    );
    Ok(index)
}

/// Return current storage statistics.
pub fn get_storage_info(paths: &StoragePaths, index: &ThreadIndex) -> VResult<StorageInfo> {
    let thread_count = index.entries.iter().filter(|e| !e.archived).count();

    let draft_count = std::fs::read_dir(paths.drafts_dir())
        .map(|entries| entries.filter_map(|e| e.ok()).count())
        .unwrap_or(0);

    Ok(StorageInfo {
        base_path: paths.base.display().to_string(),
        thread_count,
        draft_count,
        total_size_bytes: paths.total_size_bytes(),
    })
}
