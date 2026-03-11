use chrono::Utc;
use reqwest::Client;
use serde::Deserialize;
use std::time::Duration;

use crate::error::{VError, VResult};
use crate::models::runtime::{ModelInfo, OllamaRuntimeStatus, OllamaStatus};
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

// ── Public API ────────────────────────────────────────────────────────────────

/// Probe the local Ollama instance.
///
/// 1. GET `{base_url}/api/version` — establishes reachability + version.
/// 2. GET `{base_url}/api/tags`   — lists installed models.
///
/// Result is written to `cache/runtime-status.json` and returned.
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

    // Step 1: version check
    let version_res = client
        .get(format!("{}/api/version", base))
        .send()
        .await;

    let (status, version, models) = match version_res {
        Err(_) => (OllamaStatus::Stopped, None, Vec::new()),
        Ok(resp) if !resp.status().is_success() => (OllamaStatus::Error, None, Vec::new()),
        Ok(resp) => {
            let version_str = resp
                .json::<OllamaVersionResponse>()
                .await
                .map(|v| v.version)
                .ok();

            // Step 2: model list
            let models = list_models_from_client(&client, base).await.unwrap_or_default();
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

    // Write to cache (non-fatal if it fails).
    let _ = write_json_atomic_compact(paths.runtime_status_cache().as_path(), &result);

    Ok(result)
}

/// Read the cached runtime status without probing Ollama.
/// Returns the cached value or a default Unknown status if no cache exists.
pub fn cached_runtime_status(paths: &StoragePaths) -> OllamaRuntimeStatus {
    read_json_or_default(paths.runtime_status_cache().as_path())
}

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
