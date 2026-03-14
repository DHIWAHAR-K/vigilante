use chrono::Utc;
use reqwest::Client;
use serde::Deserialize;
use std::path::{Path, PathBuf};
use std::time::Duration;
use tokio::time::sleep;

use crate::error::{VError, VResult};
use crate::models::runtime::{
    EnsureReadyResult, ModelInfo, OllamaRuntimeStatus, OllamaStatus, StartOutcome,
};
use crate::models::settings::RuntimeSettings;
use crate::storage::json_store::{read_json_or_default, write_json_atomic_compact};
use crate::storage::paths::StoragePaths;

// ── Ollama REST types (internal only) ────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct OllamaVersionResponse {
    version: String,
}

#[derive(Debug, Deserialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaModelEntry>,
}

#[derive(Debug, Deserialize)]
struct OllamaModelEntry {
    name: String,
    size: u64,
    modified_at: Option<String>,
    details: Option<OllamaModelDetails>,
}

#[derive(Debug, Deserialize)]
struct OllamaModelDetails {
    family: Option<String>,
    parameter_size: Option<String>,
    quantization_level: Option<String>,
}

// ── Binary detection ──────────────────────────────────────────────────────────

/// Locate the `ollama` binary by checking `PATH` and known macOS install locations.
///
/// On macOS, Ollama ships a CLI at one of these paths depending on how it was
/// installed (official .dmg, Homebrew, or direct download).  We avoid shelling
/// out to `which` so this function is synchronous and has no subprocess overhead.
pub fn find_ollama_binary() -> Option<PathBuf> {
    // Walk $PATH entries first — works for Homebrew, nix, and custom installs.
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in path_var.split(':') {
            let candidate = Path::new(dir).join("ollama");
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }

    // Fallback: hard-coded macOS locations that may not be in the GUI app's $PATH.
    let fixed = [
        "/usr/local/bin/ollama",       // Homebrew (Intel)
        "/opt/homebrew/bin/ollama",    // Homebrew (Apple Silicon)
        "/usr/bin/ollama",             // system-wide install
        "/Applications/Ollama.app/Contents/Resources/ollama", // official .app bundle
    ];

    for path in &fixed {
        let p = Path::new(path);
        if p.is_file() {
            return Some(p.to_path_buf());
        }
    }

    None
}

// ── Probing ───────────────────────────────────────────────────────────────────

/// Probe the local Ollama instance.
///
/// 1. `GET {base_url}/api/version` — establishes reachability + reads version.
/// 2. `GET {base_url}/api/tags`    — lists installed models.
///
/// When the HTTP connection fails the function checks whether the Ollama binary
/// exists on disk to distinguish `Stopped` (installed, not running) from
/// `NotInstalled` (binary absent).
///
/// The result is written to `cache/runtime-status.json` and returned.
pub async fn probe_ollama(
    paths: &StoragePaths,
    config: &RuntimeSettings,
) -> VResult<OllamaRuntimeStatus> {
    let timeout = Duration::from_millis(config.connection_timeout_ms);
    let client = Client::builder()
        .timeout(timeout)
        .build()
        .map_err(VError::Http)?;

    let base = config.ollama_base_url.trim_end_matches('/');

    let version_res = client
        .get(format!("{}/api/version", base))
        .send()
        .await;

    let (status, version, models) = match version_res {
        // Connection refused / timeout — determine installed vs missing.
        Err(_) => {
            let status = if find_ollama_binary().is_some() {
                OllamaStatus::Stopped
            } else {
                OllamaStatus::NotInstalled
            };
            (status, None, Vec::new())
        }
        // Reachable but returned a non-2xx.
        Ok(resp) if !resp.status().is_success() => (OllamaStatus::Error, None, Vec::new()),
        // Healthy response — read version + model list.
        Ok(resp) => {
            let version_str = resp
                .json::<OllamaVersionResponse>()
                .await
                .map(|v| v.version)
                .ok();

            let models = list_models_from_client(&client, base)
                .await
                .unwrap_or_default();

            let status = if models.is_empty() {
                OllamaStatus::Available
            } else {
                OllamaStatus::Running
            };

            (status, version_str, models)
        }
    };

    let result = OllamaRuntimeStatus {
        status,
        version,
        models,
        base_url: config.ollama_base_url.clone(),
        probed_at: Utc::now(),
    };

    // Write to cache — non-fatal on failure.
    let _ = write_json_atomic_compact(paths.runtime_status_cache().as_path(), &result);

    Ok(result)
}

/// Return the cached runtime status without probing Ollama.
/// Returns a default `Unknown` status when no cache exists yet.
pub fn cached_runtime_status(paths: &StoragePaths) -> OllamaRuntimeStatus {
    read_json_or_default(paths.runtime_status_cache().as_path())
}

// ── Process management ────────────────────────────────────────────────────────

/// Spawn `ollama serve` as a detached background process.
///
/// stdout/stderr are discarded — Ollama logs to its own file on macOS
/// (`~/.ollama/logs/`).  We intentionally do NOT wait for the child: this
/// function returns as soon as the OS has accepted the spawn request.  Use
/// `wait_for_ollama_ready` to confirm the server is accepting connections.
pub async fn start_ollama(binary: &Path) -> VResult<()> {
    tokio::process::Command::new(binary)
        .arg("serve")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        // Detach from our process group so the Ollama server survives if the
        // parent window is hidden or the Tauri shell is torn down temporarily.
        .spawn()
        .map_err(|e| VError::Ollama(format!("Failed to spawn ollama serve: {}", e)))?;

    Ok(())
}

/// Poll `GET {base_url}/api/version` until Ollama responds 2xx or we time out.
///
/// Returns `true` if the server became healthy within `max_attempts * interval`.
pub async fn wait_for_ollama_ready(
    base: &str,
    max_attempts: u32,
    interval: Duration,
    connect_timeout: Duration,
) -> bool {
    let client = match Client::builder().timeout(connect_timeout).build() {
        Ok(c) => c,
        Err(_) => return false,
    };

    for attempt in 1..=max_attempts {
        match client.get(format!("{}/api/version", base)).send().await {
            Ok(resp) if resp.status().is_success() => {
                tracing::info!(attempt, "Ollama became healthy");
                return true;
            }
            _ => {
                tracing::debug!(attempt, max_attempts, "Ollama not yet ready, retrying…");
                sleep(interval).await;
            }
        }
    }

    false
}

// ── High-level orchestration ──────────────────────────────────────────────────

/// The main entry point called by the frontend on app launch.
///
/// State machine:
///   1. Probe current state.
///   2. If already Running or Available → return immediately (AlreadyRunning).
///   3. If NotInstalled (probe confirms binary absent) → return NotInstalled.
///   4. If Stopped / Unknown / Error → locate binary → if absent: NotInstalled.
///   5. Spawn `ollama serve`; poll up to 30 s / 500 ms per tick.
///   6. Re-probe to capture the final model list and version.
///   7. Return EnsureReadyResult with the final status + what we did.
pub async fn ensure_runtime_ready(
    paths: &StoragePaths,
    config: &RuntimeSettings,
) -> VResult<EnsureReadyResult> {
    // ── 1. Fast probe ────────────────────────────────────────────────────────
    let probe = probe_ollama(paths, config).await?;

    match probe.status {
        // Already operational — nothing to do.
        OllamaStatus::Running | OllamaStatus::Available => {
            return Ok(EnsureReadyResult {
                runtime: probe,
                start_attempted: false,
                start_outcome: Some(StartOutcome::AlreadyRunning),
            });
        }
        // Probe already confirmed the binary is missing.
        OllamaStatus::NotInstalled => {
            return Ok(EnsureReadyResult {
                runtime: probe,
                start_attempted: false,
                start_outcome: Some(StartOutcome::NotInstalled),
            });
        }
        // Stopped / Unknown / Error — attempt recovery below.
        _ => {}
    }

    // ── 2. Locate binary ─────────────────────────────────────────────────────
    let Some(binary) = find_ollama_binary() else {
        // Binary absent — build a NotInstalled status and cache it.
        let not_installed = OllamaRuntimeStatus {
            status: OllamaStatus::NotInstalled,
            version: None,
            models: Vec::new(),
            base_url: config.ollama_base_url.clone(),
            probed_at: Utc::now(),
        };
        let _ = write_json_atomic_compact(paths.runtime_status_cache().as_path(), &not_installed);
        return Ok(EnsureReadyResult {
            runtime: not_installed,
            start_attempted: false,
            start_outcome: Some(StartOutcome::NotInstalled),
        });
    };

    // ── 3. Launch `ollama serve` ──────────────────────────────────────────────
    tracing::info!(binary = %binary.display(), "Starting Ollama");
    if let Err(e) = start_ollama(&binary).await {
        tracing::error!("Failed to start Ollama: {}", e);
        // Return current probe status plus Failed outcome; don't propagate the
        // error — the frontend should show a degraded state, not crash.
        return Ok(EnsureReadyResult {
            runtime: probe,
            start_attempted: true,
            start_outcome: Some(StartOutcome::Failed),
        });
    }

    // ── 4. Poll until healthy (30 s budget, 500 ms ticks) ────────────────────
    let base = config.ollama_base_url.trim_end_matches('/');
    let healthy = wait_for_ollama_ready(
        base,
        60,                             // max_attempts
        Duration::from_millis(500),     // poll interval
        Duration::from_millis(2_000),   // per-request connect timeout
    )
    .await;

    if !healthy {
        tracing::warn!("Ollama did not become ready within 30 s");
        let timeout_status = OllamaRuntimeStatus {
            status: OllamaStatus::Stopped,
            version: None,
            models: Vec::new(),
            base_url: config.ollama_base_url.clone(),
            probed_at: Utc::now(),
        };
        let _ = write_json_atomic_compact(
            paths.runtime_status_cache().as_path(),
            &timeout_status,
        );
        return Ok(EnsureReadyResult {
            runtime: timeout_status,
            start_attempted: true,
            start_outcome: Some(StartOutcome::Timeout),
        });
    }

    // ── 5. Re-probe for version + model list ─────────────────────────────────
    let final_status = probe_ollama(paths, config).await?;
    tracing::info!(status = ?final_status.status, "Ollama ready");

    Ok(EnsureReadyResult {
        runtime: final_status,
        start_attempted: true,
        start_outcome: Some(StartOutcome::Started),
    })
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async fn list_models_from_client(client: &Client, base: &str) -> VResult<Vec<ModelInfo>> {
    let resp = client
        .get(format!("{}/api/tags", base))
        .send()
        .await?
        .json::<OllamaTagsResponse>()
        .await?;

    let models = resp
        .models
        .into_iter()
        .map(|m| {
            let modified_at = m
                .modified_at
                .as_deref()
                .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
                .map(|d| d.with_timezone(&Utc));

            ModelInfo {
                id: m.name.clone(),
                name: m.name,
                size_bytes: m.size,
                modified_at,
                family: m.details.as_ref().and_then(|d| d.family.clone()),
                parameter_size: m.details.as_ref().and_then(|d| d.parameter_size.clone()),
                quantization: m.details.as_ref().and_then(|d| d.quantization_level.clone()),
            }
        })
        .collect();

    Ok(models)
}
