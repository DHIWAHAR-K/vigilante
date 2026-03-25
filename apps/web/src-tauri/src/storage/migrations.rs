use chrono::Utc;

use crate::error::VResult;
use crate::models::settings::SchemaVersion;
use crate::storage::json_store::{read_json_or_default, write_json_atomic};
use crate::storage::paths::StoragePaths;

/// Increment this constant each time the on-disk schema changes.
/// Run a corresponding migration branch in `run_migrations`.
pub const CURRENT_SCHEMA_VERSION: u32 = 1;

/// Entry point called once at startup, before any other storage access.
///
/// 1. Read (or create) `schema-version.json`.
/// 2. If the stored version is behind `CURRENT_SCHEMA_VERSION`, run each
///    migration in order.
/// 3. Write the updated version back to disk.
///
/// If the version in the file is *ahead* of what this binary knows, we log a
/// warning and continue — the user may have downgraded the app.
pub fn run_migrations(paths: &StoragePaths) -> VResult<()> {
    let stored: SchemaVersion = read_json_or_default(paths.schema_version().as_path());

    if stored.version > CURRENT_SCHEMA_VERSION {
        tracing::warn!(
            stored = stored.version,
            current = CURRENT_SCHEMA_VERSION,
            "Data directory schema is newer than this binary — some features may not work correctly"
        );
        return Ok(());
    }

    if stored.version == CURRENT_SCHEMA_VERSION {
        tracing::debug!(version = CURRENT_SCHEMA_VERSION, "Schema is up to date");
        return Ok(());
    }

    tracing::info!(
        from = stored.version,
        to = CURRENT_SCHEMA_VERSION,
        "Running schema migrations"
    );

    // Apply migrations in order.
    // Each branch must be idempotent — the app may crash mid-migration and restart.
    //
    // Example for future version bump:
    //   if stored.version < 2 { migrate_v1_to_v2(paths)?; }
    //   if stored.version < 3 { migrate_v2_to_v3(paths)?; }
    //
    // Currently we are at version 1 (the initial schema), so there are no
    // upgrade paths to run — we just stamp the version file.

    let new_version = SchemaVersion {
        version: CURRENT_SCHEMA_VERSION,
        migrated_at: Utc::now(),
    };
    write_json_atomic(paths.schema_version().as_path(), &new_version)?;

    tracing::info!(
        version = CURRENT_SCHEMA_VERSION,
        "Schema migration complete"
    );
    Ok(())
}
