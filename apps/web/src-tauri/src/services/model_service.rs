use std::sync::Arc;

use chrono::Utc;
use futures_util::StreamExt;
use tauri::State;
use uuid::Uuid;

use crate::error::{VError, VResult};
use crate::models::runtime::{
    CatalogModel, ModelInfo, ModelInstallJob, ModelInstallStatus, OllamaStatus, RuntimeSnapshot,
};
use crate::models::settings::{AppSettings, RuntimeSettings};
use crate::services::runtime_service::{cached_runtime_status, ensure_runtime_ready, probe_ollama};
use crate::state::AppState;
use crate::storage::json_store::{read_json_or_default, write_json_atomic};
use crate::storage::paths::StoragePaths;

pub const DEFAULT_MODEL_ID: &str = "llama3.2:3b";

pub async fn get_runtime_snapshot(paths: &StoragePaths) -> VResult<RuntimeSnapshot> {
    let config: RuntimeSettings = read_json_or_default(paths.runtime_config().as_path());
    let runtime = probe_ollama(paths, &config).await?;
    let installed_models = if runtime.models.is_empty()
        && matches!(
            runtime.status,
            OllamaStatus::Stopped | OllamaStatus::Error | OllamaStatus::Unknown
        ) {
        let cached = cached_runtime_status(paths);
        if cached.models.is_empty() {
            runtime.models.clone()
        } else {
            cached.models
        }
    } else {
        runtime.models.clone()
    };

    Ok(RuntimeSnapshot {
        installed_models,
        runtime,
        selected_model_id: Some(get_selected_model_id(paths)),
    })
}

pub async fn list_installed_models(paths: &StoragePaths) -> VResult<Vec<ModelInfo>> {
    Ok(get_runtime_snapshot(paths).await?.installed_models)
}

pub fn get_selected_model_id(paths: &StoragePaths) -> String {
    let settings: AppSettings = read_json_or_default(paths.settings().as_path());
    normalize_model_id(&settings.default_provider.model_id)
}

pub fn set_selected_model_id(paths: &StoragePaths, model_id: &str) -> VResult<String> {
    let normalized = normalize_model_id(model_id);

    let mut settings: AppSettings = read_json_or_default(paths.settings().as_path());
    settings.default_provider.provider_id = "ollama".into();
    settings.default_provider.model_id = normalized.clone();
    settings.updated_at = Utc::now();
    write_json_atomic(paths.settings().as_path(), &settings)?;

    let mut runtime: RuntimeSettings = read_json_or_default(paths.runtime_config().as_path());
    runtime.default_model = Some(normalized.clone());
    runtime.updated_at = Utc::now();
    write_json_atomic(paths.runtime_config().as_path(), &runtime)?;

    Ok(normalized)
}

pub async fn ensure_model_available(paths: &StoragePaths, model_id: &str) -> VResult<String> {
    let normalized = normalize_model_id(model_id);
    let config = ensure_ollama_available(paths).await?;
    let runtime = probe_ollama(paths, &config).await?;

    if is_model_installed(&runtime.models, &normalized) {
        return Ok(normalized);
    }

    stream_model_pull(&config.ollama_base_url, &normalized, |_, _, _, _, _| Ok(())).await?;
    let _ = probe_ollama(paths, &config).await?;
    Ok(normalized)
}

pub async fn start_model_install(
    state: State<'_, AppState>,
    model_id: String,
) -> VResult<ModelInstallJob> {
    let normalized = normalize_model_id(&model_id);
    let config = ensure_ollama_available(&state.paths).await?;
    let runtime = probe_ollama(&state.paths, &config).await?;

    if is_model_installed(&runtime.models, &normalized) {
        return Err(VError::Other(format!(
            "Model {normalized} is already installed"
        )));
    }

    if let Some(existing) = state.db.get_active_model_install_job(&normalized)? {
        return Ok(existing);
    }

    if find_catalog_model(&normalized).is_none() {
        return Err(VError::Other(format!(
            "Model {normalized} is not in the curated local catalog"
        )));
    }

    let now = Utc::now();
    let job = ModelInstallJob {
        id: Uuid::new_v4(),
        model_id: normalized.clone(),
        status: ModelInstallStatus::Queued,
        progress_percent: 0,
        downloaded_bytes: None,
        total_bytes: None,
        message: Some("Queued for installation.".into()),
        error: None,
        created_at: now,
        updated_at: now,
        completed_at: None,
    };
    state.db.upsert_model_install_job(&job)?;

    let job_id = job.id;
    let db = state.db.clone();
    let paths = state.paths.clone();
    let task_registry = Arc::clone(&state.install_tasks);
    let handle = tokio::spawn(async move {
        let mut current = job;
        let result = stream_model_pull(
            &config.ollama_base_url,
            &normalized,
            |status, progress, downloaded_bytes, total_bytes, message| {
                current.status = status;
                current.progress_percent = progress;
                current.downloaded_bytes = downloaded_bytes;
                current.total_bytes = total_bytes;
                current.message = message;
                current.error = None;
                current.updated_at = Utc::now();
                if current.status == ModelInstallStatus::Complete {
                    current.completed_at = Some(Utc::now());
                }
                db.upsert_model_install_job(&current)
            },
        )
        .await;

        if let Err(err) = result {
            current.status = ModelInstallStatus::Failed;
            current.error = Some(err.to_string());
            current.message = Some("Model installation failed.".into());
            current.updated_at = Utc::now();
            current.completed_at = Some(Utc::now());
            let _ = db.upsert_model_install_job(&current);
        } else {
            let _ = probe_ollama(&paths, &config).await;
        }

        task_registry.write().remove(&job_id);
    });
    state.install_tasks.write().insert(job_id, handle);

    state
        .db
        .get_model_install_job(job_id)?
        .ok_or_else(|| VError::Other("Failed to create install job".into()))
}

pub fn get_model_install_job(
    state: State<'_, AppState>,
    job_id: Uuid,
) -> VResult<Option<ModelInstallJob>> {
    state.db.get_model_install_job(job_id)
}

pub fn cancel_model_install(
    state: State<'_, AppState>,
    job_id: Uuid,
) -> VResult<Option<ModelInstallJob>> {
    if let Some(handle) = state.install_tasks.write().remove(&job_id) {
        handle.abort();
    }

    let Some(mut job) = state.db.get_model_install_job(job_id)? else {
        return Ok(None);
    };

    if matches!(
        job.status,
        ModelInstallStatus::Complete | ModelInstallStatus::Failed | ModelInstallStatus::Cancelled
    ) {
        return Ok(Some(job));
    }

    job.status = ModelInstallStatus::Cancelled;
    job.message = Some("Model installation cancelled.".into());
    job.error = None;
    job.updated_at = Utc::now();
    job.completed_at = Some(Utc::now());
    state.db.upsert_model_install_job(&job)?;
    Ok(Some(job))
}

pub async fn delete_model(paths: &StoragePaths, model_id: &str) -> VResult<()> {
    let normalized = normalize_model_id(model_id);
    let config = ensure_ollama_available(paths).await?;
    let client = reqwest::Client::new();
    let response = client
        .delete(format!(
            "{}/api/delete",
            config.ollama_base_url.trim_end_matches('/')
        ))
        .json(&serde_json::json!({ "name": normalized }))
        .send()
        .await?;

    let response_status = response.status();
    if !response_status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(VError::Ollama(format!(
            "Ollama delete error {}: {}",
            response_status, body
        )));
    }

    let selected = get_selected_model_id(paths);
    if selected == normalize_model_id(model_id) {
        let fallback = list_model_catalog()
            .into_iter()
            .find(|entry| entry.id != selected)
            .map(|entry| entry.id)
            .unwrap_or_else(|| DEFAULT_MODEL_ID.into());
        let _ = set_selected_model_id(paths, &fallback);
    }

    let _ = probe_ollama(paths, &config).await?;
    Ok(())
}

pub fn list_model_catalog() -> Vec<CatalogModel> {
    vec![
        catalog_model(
            "llama3.2:1b",
            "Llama 3.2 1B",
            "Meta",
            "Compact everyday chat model.",
            "1B",
            0.9,
            8192,
            &["recommended", "fast", "small"],
            4,
        ),
        catalog_model(
            "llama3.2:3b",
            "Llama 3.2 3B",
            "Meta",
            "Balanced default for most local research sessions.",
            "3B",
            2.0,
            8192,
            &["recommended", "balanced"],
            8,
        ),
        catalog_model(
            "llama3.1:8b",
            "Llama 3.1 8B",
            "Meta",
            "Stronger general reasoning with moderate hardware needs.",
            "8B",
            4.9,
            131072,
            &["smart", "general"],
            12,
        ),
        catalog_model(
            "llama3.1:70b",
            "Llama 3.1 70B",
            "Meta",
            "High-quality large model for top-end local systems.",
            "70B",
            42.0,
            131072,
            &["large", "high_quality"],
            48,
        ),
        catalog_model(
            "qwen2.5:0.5b",
            "Qwen 2.5 0.5B",
            "Qwen",
            "Fast lightweight multilingual assistant.",
            "0.5B",
            0.5,
            131072,
            &["fast", "multilingual", "small"],
            4,
        ),
        catalog_model(
            "qwen2.5:1.5b",
            "Qwen 2.5 1.5B",
            "Qwen",
            "Low-memory multilingual model for smaller devices.",
            "1.5B",
            1.1,
            131072,
            &["fast", "multilingual"],
            6,
        ),
        catalog_model(
            "qwen2.5:3b",
            "Qwen 2.5 3B",
            "Qwen",
            "Reliable multilingual research assistant.",
            "3B",
            2.2,
            131072,
            &["recommended", "multilingual"],
            8,
        ),
        catalog_model(
            "qwen2.5:7b",
            "Qwen 2.5 7B",
            "Qwen",
            "Stronger general-purpose Qwen model.",
            "7B",
            4.5,
            131072,
            &["smart", "multilingual"],
            12,
        ),
        catalog_model(
            "qwen2.5:14b",
            "Qwen 2.5 14B",
            "Qwen",
            "High-capacity Qwen model for heavier workloads.",
            "14B",
            8.5,
            131072,
            &["large", "multilingual"],
            16,
        ),
        catalog_model(
            "qwen2.5:32b",
            "Qwen 2.5 32B",
            "Qwen",
            "Large multilingual model for workstations.",
            "32B",
            19.0,
            131072,
            &["large"],
            32,
        ),
        catalog_model(
            "qwen2.5:72b",
            "Qwen 2.5 72B",
            "Qwen",
            "Very large multilingual model for maximum local quality.",
            "72B",
            43.0,
            131072,
            &["large", "high_quality"],
            48,
        ),
        catalog_model(
            "qwen2.5-coder:0.5b",
            "Qwen 2.5 Coder 0.5B",
            "Qwen",
            "Tiny coding assistant for quick edits.",
            "0.5B",
            0.5,
            32768,
            &["code", "small"],
            4,
        ),
        catalog_model(
            "qwen2.5-coder:1.5b",
            "Qwen 2.5 Coder 1.5B",
            "Qwen",
            "Low-memory coding model.",
            "1.5B",
            1.1,
            32768,
            &["code", "fast"],
            6,
        ),
        catalog_model(
            "qwen2.5-coder:3b",
            "Qwen 2.5 Coder 3B",
            "Qwen",
            "Balanced coding model for local development.",
            "3B",
            2.2,
            32768,
            &["code", "recommended"],
            8,
        ),
        catalog_model(
            "qwen2.5-coder:7b",
            "Qwen 2.5 Coder 7B",
            "Qwen",
            "Stronger code generation and review model.",
            "7B",
            4.7,
            32768,
            &["code", "smart"],
            12,
        ),
        catalog_model(
            "qwen2.5-coder:14b",
            "Qwen 2.5 Coder 14B",
            "Qwen",
            "High-capacity coding model for bigger local machines.",
            "14B",
            8.7,
            32768,
            &["code", "large"],
            16,
        ),
        catalog_model(
            "qwen2.5-coder:32b",
            "Qwen 2.5 Coder 32B",
            "Qwen",
            "Large local code model for workstations.",
            "32B",
            19.0,
            32768,
            &["code", "large"],
            32,
        ),
        catalog_model(
            "qwen3:0.6b",
            "Qwen 3 0.6B",
            "Qwen",
            "Fast current-generation Qwen model.",
            "0.6B",
            0.6,
            32768,
            &["fast", "thinking"],
            4,
        ),
        catalog_model(
            "qwen3:1.7b",
            "Qwen 3 1.7B",
            "Qwen",
            "Light reasoning-capable local model.",
            "1.7B",
            1.3,
            32768,
            &["thinking", "fast"],
            6,
        ),
        catalog_model(
            "qwen3:4b",
            "Qwen 3 4B",
            "Qwen",
            "Strong compact reasoning model.",
            "4B",
            2.6,
            32768,
            &["thinking", "recommended"],
            10,
        ),
        catalog_model(
            "qwen3:8b",
            "Qwen 3 8B",
            "Qwen",
            "General-purpose reasoning model for stronger systems.",
            "8B",
            5.0,
            32768,
            &["thinking", "smart"],
            12,
        ),
        catalog_model(
            "qwen3:14b",
            "Qwen 3 14B",
            "Qwen",
            "Higher-quality reasoning model.",
            "14B",
            8.8,
            32768,
            &["thinking", "large"],
            16,
        ),
        catalog_model(
            "qwen3:30b",
            "Qwen 3 30B",
            "Qwen",
            "Large reasoning-focused model for workstations.",
            "30B",
            18.0,
            32768,
            &["thinking", "large"],
            28,
        ),
        catalog_model(
            "deepseek-r1:1.5b",
            "DeepSeek R1 1.5B",
            "DeepSeek",
            "Small reasoning-focused model.",
            "1.5B",
            1.2,
            32768,
            &["thinking", "small"],
            6,
        ),
        catalog_model(
            "deepseek-r1:7b",
            "DeepSeek R1 7B",
            "DeepSeek",
            "Reasoning model for everyday hardware.",
            "7B",
            4.6,
            32768,
            &["thinking", "recommended"],
            12,
        ),
        catalog_model(
            "deepseek-r1:8b",
            "DeepSeek R1 8B",
            "DeepSeek",
            "Reasoning-heavy model with moderate memory use.",
            "8B",
            5.1,
            32768,
            &["thinking", "smart"],
            12,
        ),
        catalog_model(
            "deepseek-r1:14b",
            "DeepSeek R1 14B",
            "DeepSeek",
            "Higher-capacity local reasoning model.",
            "14B",
            8.7,
            32768,
            &["thinking", "large"],
            16,
        ),
        catalog_model(
            "deepseek-r1:32b",
            "DeepSeek R1 32B",
            "DeepSeek",
            "Large reasoning model for advanced local setups.",
            "32B",
            19.0,
            32768,
            &["thinking", "large"],
            32,
        ),
        catalog_model(
            "gemma3:1b",
            "Gemma 3 1B",
            "Google",
            "Very small Gemma model for fast local responses.",
            "1B",
            0.8,
            32768,
            &["fast", "small"],
            4,
        ),
        catalog_model(
            "gemma3:4b",
            "Gemma 3 4B",
            "Google",
            "Balanced Gemma model for local chat and retrieval.",
            "4B",
            2.6,
            32768,
            &["recommended", "general"],
            10,
        ),
    ]
}

pub fn find_catalog_model(model_id: &str) -> Option<CatalogModel> {
    let normalized = normalize_model_id(model_id);
    list_model_catalog()
        .into_iter()
        .find(|entry| entry.id == normalized)
}

pub fn normalize_model_id(model_id: &str) -> String {
    match model_id.trim() {
        "" => DEFAULT_MODEL_ID.into(),
        "llama3.2" | "llama3.2:latest" => "llama3.2:3b".into(),
        other => other.to_string(),
    }
}

async fn ensure_ollama_available(paths: &StoragePaths) -> VResult<RuntimeSettings> {
    let config: RuntimeSettings = read_json_or_default(paths.runtime_config().as_path());
    let ensured = ensure_runtime_ready(paths, &config).await?;
    if ensured.runtime.status == OllamaStatus::Running
        || ensured.runtime.status == OllamaStatus::Available
    {
        Ok(config)
    } else {
        Err(VError::Ollama(format!(
            "Ollama is not ready ({:?})",
            ensured.runtime.status
        )))
    }
}

fn is_model_installed(installed: &[ModelInfo], model_id: &str) -> bool {
    let normalized = normalize_model_id(model_id);
    installed
        .iter()
        .any(|model| normalize_model_id(&model.id) == normalized)
}

async fn stream_model_pull<F>(base_url: &str, model_id: &str, mut on_progress: F) -> VResult<()>
where
    F: FnMut(ModelInstallStatus, u8, Option<u64>, Option<u64>, Option<String>) -> VResult<()>,
{
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/pull", base_url.trim_end_matches('/')))
        .json(&serde_json::json!({
            "name": model_id,
            "stream": true,
        }))
        .send()
        .await?;

    let response_status = response.status();
    if !response_status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(VError::Ollama(format!(
            "Ollama pull error {}: {}",
            response_status, body
        )));
    }

    let mut success = false;
    let mut buffer = String::new();
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let bytes = chunk?;
        buffer.push_str(&String::from_utf8_lossy(&bytes));

        while let Some(newline_idx) = buffer.find('\n') {
            let line = buffer[..newline_idx].trim().to_string();
            buffer = buffer[newline_idx + 1..].to_string();
            if line.is_empty() {
                continue;
            }

            let value: serde_json::Value = match serde_json::from_str(&line) {
                Ok(value) => value,
                Err(_) => continue,
            };

            if let Some(error) = value.get("error").and_then(|item| item.as_str()) {
                return Err(VError::Ollama(error.to_string()));
            }

            let message = value
                .get("status")
                .and_then(|item| item.as_str())
                .map(|item| item.to_string());
            let downloaded_bytes = value.get("completed").and_then(|item| item.as_u64());
            let total_bytes = value.get("total").and_then(|item| item.as_u64());
            let progress_percent = match (downloaded_bytes, total_bytes) {
                (Some(downloaded), Some(total)) if total > 0 => {
                    ((downloaded.saturating_mul(100) / total).min(100)) as u8
                }
                _ => 0,
            };

            let status = match message.as_deref() {
                Some("success") => {
                    success = true;
                    ModelInstallStatus::Complete
                }
                Some(value) if value.contains("verifying") || value.contains("writing") => {
                    ModelInstallStatus::Verifying
                }
                _ => ModelInstallStatus::Downloading,
            };

            let progress_percent = if status == ModelInstallStatus::Complete {
                100
            } else {
                progress_percent
            };

            on_progress(
                status,
                progress_percent,
                downloaded_bytes,
                total_bytes,
                message,
            )?;
        }
    }

    if success {
        Ok(())
    } else {
        Err(VError::Ollama(format!(
            "Model pull for {model_id} ended without a success status"
        )))
    }
}

fn catalog_model(
    id: &str,
    name: &str,
    family: &str,
    description: &str,
    parameter_size: &str,
    size_gb: f64,
    context_window: u32,
    tags: &[&str],
    min_memory_gb: u32,
) -> CatalogModel {
    CatalogModel {
        id: id.into(),
        name: name.into(),
        description: description.into(),
        family: Some(family.into()),
        size_bytes: gib(size_gb),
        parameter_size: parameter_size.into(),
        quantization: "Q4_K_M".into(),
        context_window,
        tags: tags.iter().map(|tag| (*tag).to_string()).collect(),
        supports_cpu: min_memory_gb <= 16,
        supports_apple_silicon: min_memory_gb <= 64,
        supports_nvidia: min_memory_gb <= 48,
        min_memory_gb: Some(min_memory_gb),
    }
}

fn gib(size: f64) -> u64 {
    (size * 1024.0 * 1024.0 * 1024.0) as u64
}
