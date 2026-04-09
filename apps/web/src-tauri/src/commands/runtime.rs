use tauri::State;

use crate::error::VResult;
use crate::models::runtime::{EnsureReadyResult, ModelInfo, OllamaRuntimeStatus};
use crate::services::activity_service::log_runtime_checked;
use crate::services::runtime_service::{
    cached_runtime_status, ensure_runtime_ready as svc_ensure_ready, find_ollama_binary,
    normalize_runtime_config, probe_ollama, start_ollama,
};
use crate::state::AppState;
use crate::storage::json_store::read_json_or_default;

// ── Command surface — three tiers ─────────────────────────────────────────────
//
//  Tier 1 — instant, no I/O
//    get_cached_runtime_status   → read cache file; never blocks; use for initial UI render
//
//  Tier 2 — network probe, no process management
//    probe_runtime               → HTTP probe only; use for periodic background refresh
//
//  Tier 3 — full lifecycle (probe + start + poll)
//    ensure_runtime_ready        → THE primary command; call on app launch AND on "Try Again"
//
//  Supplemental
//    list_models                 → cache read; convenience wrapper
//    start_ollama_if_installed   → fire-and-forget spawn; not normally needed by the UI

// ── Tier 1: instant cache read ────────────────────────────────────────────────

/// Return the cached Ollama status written by the last probe or ensure call.
/// Returns an `Unknown` status when no cache exists yet (first ever launch).
/// Zero I/O — safe to call synchronously during initial UI render.
#[tauri::command]
pub fn get_cached_runtime_status(state: State<'_, AppState>) -> OllamaRuntimeStatus {
    cached_runtime_status(&state.paths)
}

/// Return the cached model list without any network call.
#[tauri::command]
pub fn list_models(state: State<'_, AppState>) -> Vec<ModelInfo> {
    cached_runtime_status(&state.paths).models
}

// ── Tier 2: network probe, no side effects ────────────────────────────────────

/// Raw HTTP probe — returns the current Ollama status without managing processes.
///
/// Use this for **periodic background refresh** (e.g. every 30 s while the app
/// is running) to detect if Ollama stopped after a successful startup.
///
/// Distinguishes `not_installed` (binary absent on disk) from `stopped` (binary
/// found but process not responding).  Writes result to the status cache.
///
/// **Do NOT call this on app launch or on "Try Again" — use `ensure_runtime_ready`
/// which also starts Ollama automatically.**
#[tauri::command]
pub async fn probe_runtime(state: State<'_, AppState>) -> VResult<OllamaRuntimeStatus> {
    let config = normalize_runtime_config(read_json_or_default(state.paths.runtime_config().as_path()));
    let result = probe_ollama(&state.paths, &config).await?;
    let _ = log_runtime_checked(&state.paths, &format!("{:?}", result.status));
    Ok(result)
}

// ── Tier 3: full lifecycle ────────────────────────────────────────────────────

/// **Primary startup command.** Call this on app launch and on every "Try Again".
///
/// Full state machine:
///   1. Probe Ollama over HTTP.
///   2. Already `running` or `available` → return immediately (`already_running`).
///   3. `not_installed` confirmed by probe → return immediately (`not_installed`).
///   4. `stopped` / `unknown` / `error` → find binary on disk.
///      a. Binary absent → return `not_installed`.
///      b. Binary found → spawn `ollama serve` → poll up to 30 s.
///         i.  Becomes healthy → re-probe for version + models → return `started`.
///         ii. Still not healthy → return `timeout`.
///         iii.Spawn itself failed → return `failed`.
///
/// Frontend reacts to `startOutcome`:
///   `already_running` | `started`   → proceed; app is operational
///   `not_installed`                  → show "Install Ollama" screen
///   `timeout`                        → show warning + "Try Again" button
///   `failed`                         → show error detail + "Try Again" button
#[tauri::command]
pub async fn ensure_runtime_ready(state: State<'_, AppState>) -> VResult<EnsureReadyResult> {
    let config = normalize_runtime_config(read_json_or_default(state.paths.runtime_config().as_path()));
    let result = svc_ensure_ready(&state.paths, &config).await?;
    let _ = log_runtime_checked(&state.paths, &format!("{:?}", result.runtime.status));
    Ok(result)
}

// ── Supplemental ──────────────────────────────────────────────────────────────

/// Spawn `ollama serve` if the binary is present on disk, then return immediately.
///
/// Returns `true` when the process was successfully launched, `false` when the
/// binary is not found.  Does NOT wait for health — follow up with
/// `ensure_runtime_ready` or `probe_runtime` to confirm readiness.
///
/// Exposed for edge-case UI needs (e.g. a settings page "Start Ollama" button).
/// Normal launch flow should use `ensure_runtime_ready` instead.
#[tauri::command]
pub async fn start_ollama_if_installed(state: State<'_, AppState>) -> VResult<bool> {
    match find_ollama_binary() {
        None => Ok(false),
        Some(binary) => {
            let config = normalize_runtime_config(read_json_or_default(state.paths.runtime_config().as_path()));
            start_ollama(&binary, &state.paths, &config).await?;
            Ok(true)
        }
    }
}
