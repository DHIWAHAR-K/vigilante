use tauri::State;

use crate::error::{VError, VResult};
use crate::models::mcp::McpConnectorStatus;
use crate::models::settings::AppSettings;
use crate::services::mcp_service::probe_connector;
use crate::state::AppState;
use crate::storage::json_store::read_json_or_default;

#[tauri::command]
pub async fn probe_mcp_connector_cmd(
    state: State<'_, AppState>,
    connector_id: String,
) -> VResult<McpConnectorStatus> {
    let settings: AppSettings = read_json_or_default(state.paths.settings().as_path());
    let connector = settings
        .mcp
        .connectors
        .iter()
        .find(|connector| connector.id == connector_id)
        .cloned()
        .ok_or_else(|| VError::Other(format!("MCP connector not found: {connector_id}")))?;

    let workspace = state.db.get_active_workspace().ok();
    Ok(probe_connector(&state.paths, &connector, workspace.as_ref()).await)
}
