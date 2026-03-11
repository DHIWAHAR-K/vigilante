use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;

use serde::de::DeserializeOwned;
use serde::Serialize;
use tempfile::NamedTempFile;

use crate::error::{VError, VResult};

// ── Atomic JSON read / write ─────────────────────────────────────────────────

/// Read and deserialise a JSON file.
/// Returns `VError::Io` if the file does not exist, `VError::Json` if malformed.
pub fn read_json<T: DeserializeOwned>(path: &Path) -> VResult<T> {
    let bytes = fs::read(path)?;
    let value = serde_json::from_slice(&bytes)?;
    Ok(value)
}

/// Read a JSON file, returning `default` if the file is absent or malformed.
/// Logs a warning on decode failure so we never silently swallow schema issues.
pub fn read_json_or_default<T: DeserializeOwned + Default>(path: &Path) -> T {
    match fs::read(path) {
        Err(_) => T::default(),
        Ok(bytes) => match serde_json::from_slice(&bytes) {
            Ok(v) => v,
            Err(e) => {
                tracing::warn!(path = %path.display(), error = %e, "JSON decode failed, using default");
                T::default()
            }
        },
    }
}

/// Write a value as pretty-printed JSON using an atomic write pattern:
///   1. Serialise to a `NamedTempFile` in the same directory.
///   2. `flush()` to ensure all bytes are in the OS buffer.
///   3. `persist()` which calls `rename()` — atomic on all POSIX systems.
///
/// This means we never truncate the target file before the new content is ready,
/// so a crash or panic mid-write cannot produce a partial/corrupt file.
pub fn write_json_atomic<T: Serialize>(path: &Path, value: &T) -> VResult<()> {
    let dir = path.parent().ok_or(VError::InvalidPath)?;
    fs::create_dir_all(dir)?;

    let mut tmp = NamedTempFile::new_in(dir)?;
    serde_json::to_writer_pretty(&mut tmp, value)?;
    tmp.flush()?;
    tmp.persist(path).map_err(|e| VError::Io(e.error))?;
    Ok(())
}

/// Write a value as compact JSON using the same atomic pattern.
/// Use this for cache files where pretty-printing wastes space.
pub fn write_json_atomic_compact<T: Serialize>(path: &Path, value: &T) -> VResult<()> {
    let dir = path.parent().ok_or(VError::InvalidPath)?;
    fs::create_dir_all(dir)?;

    let mut tmp = NamedTempFile::new_in(dir)?;
    serde_json::to_writer(&mut tmp, value)?;
    tmp.flush()?;
    tmp.persist(path).map_err(|e| VError::Io(e.error))?;
    Ok(())
}

// ── JSONL helpers (append-only activity log) ─────────────────────────────────

/// Append one value as a single JSON line to a JSONL file.
///
/// Opens in append mode so concurrent processes can write safely (POSIX append
/// writes are atomic up to PIPE_BUF). Each call writes exactly one line.
pub fn append_jsonl<T: Serialize>(path: &Path, value: &T) -> VResult<()> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)?;
    serde_json::to_writer(&mut file, value)?;
    file.write_all(b"\n")?;
    Ok(())
}

/// Read all valid JSONL entries from a file, skipping blank lines and
/// lines that fail to parse (with a warning). Never panics.
pub fn read_jsonl<T: DeserializeOwned>(path: &Path) -> VResult<Vec<T>> {
    let content = match fs::read_to_string(path) {
        Ok(s) => s,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(e) => return Err(VError::Io(e)),
    };

    let mut items = Vec::new();
    for (line_no, line) in content.lines().enumerate() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        match serde_json::from_str::<T>(trimmed) {
            Ok(v) => items.push(v),
            Err(e) => {
                tracing::warn!(line = line_no + 1, error = %e, "Skipping malformed JSONL line");
            }
        }
    }
    Ok(items)
}

/// Read the last `n` valid JSONL entries (most-recent-first is NOT guaranteed;
/// call `.iter().rev()` if needed).
pub fn read_jsonl_tail<T: DeserializeOwned>(path: &Path, n: usize) -> VResult<Vec<T>> {
    let all: Vec<T> = read_jsonl(path)?;
    let start = all.len().saturating_sub(n);
    Ok(all.into_iter().skip(start).collect())
}
