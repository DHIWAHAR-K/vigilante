'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, PlugZap, RefreshCw, Save, X } from 'lucide-react';

import {
  type AppSettings,
  type McpConnectorConfig,
  type McpConnectorStatus,
  type McpEnvironmentVariable,
  type ModelInfo,
  type OllamaRuntimeStatusInfo,
  type RuntimeSettings,
  type StorageInfo,
  ensureRuntimeReady,
  getCachedRuntimeStatus,
  getRuntimeConfig,
  getSettings,
  getStorageInfo,
  listRuntimeModels,
  probeMcpConnector,
  probeRuntime,
  updateRuntimeConfig,
  updateSettings,
} from '@/lib/desktop/client';
import { cn } from '@/lib/utils';

export interface DesktopSettingsSnapshot {
  settings: AppSettings;
  runtime: RuntimeSettings;
  runtimeStatus: OllamaRuntimeStatusInfo;
  runtimeModels: ModelInfo[];
  storageInfo: StorageInfo | null;
}

interface DesktopSettingsPanelProps {
  embedded?: boolean;
  onClose: () => void;
  onSaved?: (snapshot: DesktopSettingsSnapshot) => void;
}

function runtimeLabel(status: OllamaRuntimeStatusInfo | null) {
  switch (status?.status) {
    case 'running':
      return 'Running';
    case 'available':
      return 'No models';
    case 'stopped':
      return 'Stopped';
    case 'not_installed':
      return 'Not installed';
    case 'error':
      return 'Error';
    default:
      return 'Unknown';
  }
}

function formatModelSize(sizeBytes: number) {
  if (sizeBytes >= 1024 ** 3) {
    return `${(sizeBytes / 1024 ** 3).toFixed(1)} GB`;
  }
  if (sizeBytes >= 1024 ** 2) {
    return `${(sizeBytes / 1024 ** 2).toFixed(1)} MB`;
  }
  return `${sizeBytes} B`;
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatArgs(args: string[]) {
  return args.join('\n');
}

function parseArgs(value: string) {
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatRoots(roots: string[]) {
  return roots.join('\n');
}

function parseRoots(value: string) {
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatEnv(env: McpEnvironmentVariable[]) {
  return env
    .map((item) => {
      if (item.value) return `${item.key}=${item.value}`;
      if (item.sourceEnv) return `${item.key}<-${item.sourceEnv}`;
      return item.key;
    })
    .join('\n');
}

function parseEnv(value: string): McpEnvironmentVariable[] {
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (entry.includes('<-')) {
        const [key, sourceEnv] = entry.split('<-', 2);
        return {
          key: key.trim(),
          value: null,
          sourceEnv: sourceEnv.trim() || null,
        };
      }

      if (entry.includes('=')) {
        const [key, literal] = entry.split('=', 2);
        return {
          key: key.trim(),
          value: literal.trim() || null,
          sourceEnv: null,
        };
      }

      return {
        key: entry,
        value: null,
        sourceEnv: null,
      };
    });
}

export function DesktopSettingsPanel({
  embedded = false,
  onClose,
  onSaved,
}: DesktopSettingsPanelProps) {
  const [settingsDraft, setSettingsDraft] = useState<AppSettings | null>(null);
  const [runtimeDraft, setRuntimeDraft] = useState<RuntimeSettings | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<OllamaRuntimeStatusInfo | null>(null);
  const [runtimeModels, setRuntimeModels] = useState<ModelInfo[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [runtimeBusy, setRuntimeBusy] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mcpStatuses, setMcpStatuses] = useState<Record<string, McpConnectorStatus | null>>({});
  const [probingConnectorId, setProbingConnectorId] = useState<string | null>(null);

  const selectedModelId =
    runtimeDraft?.defaultModel ?? settingsDraft?.defaultProvider.modelId ?? 'llama3.2:3b';

  useEffect(() => {
    void hydrate();
  }, []);

  const enabledConnectorCount = useMemo(
    () => settingsDraft?.mcp.connectors.filter((connector) => connector.enabled).length ?? 0,
    [settingsDraft],
  );

  async function hydrate() {
    try {
      const [settings, runtime, cachedStatus, models, storage] = await Promise.all([
        getSettings(),
        getRuntimeConfig(),
        getCachedRuntimeStatus(),
        listRuntimeModels(),
        getStorageInfo(),
      ]);

      setSettingsDraft(settings);
      setRuntimeDraft({
        ...runtime,
        defaultModel: runtime.defaultModel ?? settings.defaultProvider.modelId,
      });
      setRuntimeStatus(cachedStatus);
      setRuntimeModels(models.length > 0 ? models : cachedStatus.models);
      setStorageInfo(storage);
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Failed to load settings.');
    }
  }

  async function handleProbeRuntime() {
    setRuntimeBusy(true);
    setPanelError(null);
    setNotice(null);
    try {
      const status = await probeRuntime();
      setRuntimeStatus(status);
      setRuntimeModels(status.models);
      setNotice(`Runtime probe: ${runtimeLabel(status)}`);
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Failed to probe runtime.');
    } finally {
      setRuntimeBusy(false);
    }
  }

  async function handleEnsureRuntime() {
    setRuntimeBusy(true);
    setPanelError(null);
    setNotice(null);
    try {
      const result = await ensureRuntimeReady();
      setRuntimeStatus(result.runtime);
      setRuntimeModels(result.runtime.models);
      setNotice(
        result.startOutcome
          ? `Runtime status: ${result.startOutcome.replaceAll('_', ' ')}`
          : 'Runtime checked.',
      );
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Failed to ensure runtime.');
    } finally {
      setRuntimeBusy(false);
    }
  }

  function updateConnector(
    connectorId: string,
    updater: (connector: McpConnectorConfig) => McpConnectorConfig,
  ) {
    setSettingsDraft((current) =>
      current
        ? {
            ...current,
            mcp: {
              ...current.mcp,
              connectors: current.mcp.connectors.map((connector) =>
                connector.id === connectorId ? updater(connector) : connector,
              ),
            },
          }
        : current,
    );
  }

  async function handleProbeConnector(connectorId: string) {
    setProbingConnectorId(connectorId);
    setPanelError(null);
    setNotice(null);
    try {
      const status = await probeMcpConnector(connectorId);
      setMcpStatuses((current) => ({ ...current, [connectorId]: status }));
      setNotice(
        status.available
          ? `${status.name} connector is reachable.`
          : `${status.name} connector probe failed.`,
      );
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Failed to probe MCP connector.');
    } finally {
      setProbingConnectorId(null);
    }
  }

  async function handleSave() {
    if (!settingsDraft || !runtimeDraft) return;

    setSaveBusy(true);
    setPanelError(null);
    setNotice(null);

    const effectiveModel = runtimeDraft.defaultModel ?? settingsDraft.defaultProvider.modelId;
    const nextSettings: AppSettings = {
      ...settingsDraft,
      defaultProvider: {
        ...settingsDraft.defaultProvider,
        providerId: 'ollama',
        modelId: effectiveModel,
      },
    };
    const nextRuntime: RuntimeSettings = {
      ...runtimeDraft,
      defaultModel: effectiveModel,
    };

    try {
      const [savedSettings, savedRuntime, storage] = await Promise.all([
        updateSettings(nextSettings),
        updateRuntimeConfig(nextRuntime),
        getStorageInfo(),
      ]);

      const nextSnapshot: DesktopSettingsSnapshot = {
        settings: savedSettings,
        runtime: savedRuntime,
        runtimeStatus: runtimeStatus ?? (await getCachedRuntimeStatus()),
        runtimeModels,
        storageInfo: storage,
      };

      setSettingsDraft(savedSettings);
      setRuntimeDraft(savedRuntime);
      setStorageInfo(storage);
      setNotice('Settings saved.');
      onSaved?.(nextSnapshot);
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Failed to save settings.');
    } finally {
      setSaveBusy(false);
    }
  }

  const panel = (
    <motion.div
      initial={{ opacity: 0, x: embedded ? 0 : 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: embedded ? 0 : 28 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn(
        'overflow-y-auto px-5 py-5',
        embedded
          ? 'h-full w-full bg-bg-base'
          : 'h-full w-full max-w-[540px] border-l border-border-subtle bg-bg-surface',
      )}
      onClick={(event) => event.stopPropagation()}
    >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.26em] text-text-muted">Desktop</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-text-primary">
              Settings
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Runtime, retrieval, and MCP connectors for local research workflows.
            </p>
          </div>
          <button onClick={onClose} className="desktop-icon-button" title="Close settings">
            <X className="h-4 w-4" />
          </button>
        </div>

        <AnimatePresence>
          {panelError && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
            >
              {panelError}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-4 rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-text-primary"
            >
              {notice}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 space-y-6">
          <section className="desktop-card !p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text-primary">Appearance</p>
                <p className="mt-1 text-xs text-text-muted">
                  Theme and layout defaults saved locally on this machine.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Theme</span>
                <select
                  value={settingsDraft?.appearance.theme ?? 'system'}
                  onChange={(event) =>
                    setSettingsDraft((current) =>
                      current
                        ? {
                            ...current,
                            appearance: {
                              ...current.appearance,
                              theme: event.target.value as AppSettings['appearance']['theme'],
                            },
                          }
                        : current,
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-border-subtle bg-bg-base px-3 py-2 text-sm outline-none"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Font Size</span>
                <select
                  value={settingsDraft?.appearance.fontSize ?? 'medium'}
                  onChange={(event) =>
                    setSettingsDraft((current) =>
                      current
                        ? {
                            ...current,
                            appearance: {
                              ...current.appearance,
                              fontSize: event.target.value as AppSettings['appearance']['fontSize'],
                            },
                          }
                        : current,
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-border-subtle bg-bg-base px-3 py-2 text-sm outline-none"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </label>
            </div>

            <label className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-bg-base px-4 py-3">
              <div>
                <p className="text-sm text-text-primary">Compact sidebar</p>
                <p className="mt-1 text-xs text-text-muted">
                  Collapse the desktop sidebar by default on wide screens.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settingsDraft?.appearance.sidebarCollapsed ?? false}
                onChange={(event) =>
                  setSettingsDraft((current) =>
                    current
                      ? {
                          ...current,
                          appearance: {
                            ...current.appearance,
                            sidebarCollapsed: event.target.checked,
                          },
                        }
                      : current,
                  )
                }
              />
            </label>
          </section>

          <section className="desktop-card !p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text-primary">Ollama runtime</p>
                <p className="mt-1 text-xs text-text-muted">
                  {runtimeLabel(runtimeStatus)} · {runtimeStatus?.baseUrl ?? 'http://127.0.0.1:11434'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleProbeRuntime()}
                  disabled={runtimeBusy}
                  className="desktop-pill disabled:opacity-40"
                >
                  {runtimeBusy ? 'Busy' : 'Probe'}
                </button>
                <button
                  onClick={() => void handleEnsureRuntime()}
                  disabled={runtimeBusy}
                  className="desktop-pill disabled:opacity-40"
                >
                  Ensure
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Base URL</span>
                <input
                  value={runtimeDraft?.ollamaBaseUrl ?? ''}
                  onChange={(event) =>
                    setRuntimeDraft((current) =>
                      current ? { ...current, ollamaBaseUrl: event.target.value } : current,
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-border-subtle bg-bg-base px-3 py-2 text-sm outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
                  Connection timeout (ms)
                </span>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  value={runtimeDraft?.connectionTimeoutMs ?? 5000}
                  onChange={(event) =>
                    setRuntimeDraft((current) =>
                      current
                        ? {
                            ...current,
                            connectionTimeoutMs:
                              Number.parseInt(event.target.value, 10) || current.connectionTimeoutMs,
                          }
                        : current,
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-border-subtle bg-bg-base px-3 py-2 text-sm outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Default model</span>
                {runtimeModels.length > 0 ? (
                  <select
                    value={selectedModelId}
                    onChange={(event) => {
                      const modelId = event.target.value;
                      setRuntimeDraft((current) =>
                        current ? { ...current, defaultModel: modelId } : current,
                      );
                      setSettingsDraft((current) =>
                        current
                          ? {
                              ...current,
                              defaultProvider: {
                                ...current.defaultProvider,
                                providerId: 'ollama',
                                modelId,
                              },
                            }
                          : current,
                      );
                    }}
                    className="mt-2 w-full rounded-2xl border border-border-subtle bg-bg-base px-3 py-2 text-sm outline-none"
                  >
                    {runtimeModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} · {formatModelSize(model.sizeBytes)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={selectedModelId}
                    onChange={(event) => {
                      const modelId = event.target.value;
                      setRuntimeDraft((current) =>
                        current ? { ...current, defaultModel: modelId } : current,
                      );
                      setSettingsDraft((current) =>
                        current
                          ? {
                              ...current,
                              defaultProvider: {
                                ...current.defaultProvider,
                                providerId: 'ollama',
                                modelId,
                              },
                            }
                          : current,
                      );
                    }}
                    className="mt-2 w-full rounded-2xl border border-border-subtle bg-bg-base px-3 py-2 text-sm outline-none"
                  />
                )}
              </label>
            </div>
          </section>

          <section className="desktop-card !p-4">
            <p className="text-sm font-medium text-text-primary">Web retrieval</p>
            <div className="mt-4 space-y-3">
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-bg-base px-4 py-3">
                <div>
                  <p className="text-sm text-text-primary">Enable web by default</p>
                  <p className="mt-1 text-xs text-text-muted">
                    New threads start with web retrieval already enabled.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsDraft?.search.enabledByDefault ?? true}
                  onChange={(event) =>
                    setSettingsDraft((current) =>
                      current
                        ? {
                            ...current,
                            search: {
                              ...current.search,
                              enabledByDefault: event.target.checked,
                            },
                          }
                        : current,
                    )
                  }
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Search provider</span>
                <select
                  value={settingsDraft?.search.provider ?? 'brave'}
                  onChange={(event) =>
                    setSettingsDraft((current) =>
                      current
                        ? {
                            ...current,
                            search: {
                              ...current.search,
                              provider: event.target.value as AppSettings['search']['provider'],
                            },
                          }
                        : current,
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-border-subtle bg-bg-base px-3 py-2 text-sm outline-none"
                >
                  <option value="brave">Brave Search</option>
                  <option value="serper">Serper</option>
                  <option value="searx_ng">SearxNG</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Brave API key</span>
                <input
                  value={settingsDraft?.search.braveApiKey ?? ''}
                  onChange={(event) =>
                    setSettingsDraft((current) =>
                      current
                        ? {
                            ...current,
                            search: {
                              ...current.search,
                              braveApiKey: event.target.value || null,
                            },
                          }
                        : current,
                    )
                  }
                  placeholder="BSA..."
                  className="mt-2 w-full rounded-2xl border border-border-subtle bg-bg-base px-3 py-2 text-sm outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-text-muted">SearxNG base URL</span>
                <input
                  value={settingsDraft?.search.searxngBaseUrl ?? ''}
                  onChange={(event) =>
                    setSettingsDraft((current) =>
                      current
                        ? {
                            ...current,
                            search: {
                              ...current.search,
                              searxngBaseUrl: event.target.value || null,
                            },
                          }
                        : current,
                    )
                  }
                  placeholder="https://search.example.com"
                  className="mt-2 w-full rounded-2xl border border-border-subtle bg-bg-base px-3 py-2 text-sm outline-none"
                />
              </label>
            </div>
          </section>

          <section className="desktop-card !p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <PlugZap className="h-4 w-4 text-accent" />
                  <p className="text-sm font-medium text-text-primary">MCP connectors</p>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  Enable connectors you want to expose through `@` mention context. Only selected
                  MCP chips execute at submit time.
                </p>
              </div>
              <span className="desktop-pill">
                {enabledConnectorCount} enabled
              </span>
            </div>

            <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-bg-base px-4 py-3">
              <div>
                <p className="text-sm text-text-primary">Enable MCP suggestions by default</p>
                <p className="mt-1 text-xs text-text-muted">
                  Keeps enabled connectors available in `@` lookup without changing the chat mode.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settingsDraft?.mcp.enabledByDefault ?? false}
                onChange={(event) =>
                  setSettingsDraft((current) =>
                    current
                      ? {
                          ...current,
                          mcp: {
                            ...current.mcp,
                            enabledByDefault: event.target.checked,
                          },
                        }
                      : current,
                  )
                }
              />
            </label>

            <label className="mt-3 block">
              <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
                Max MCP context blocks
              </span>
              <input
                type="number"
                min={1}
                max={12}
                value={settingsDraft?.mcp.maxContextItems ?? 6}
                onChange={(event) =>
                  setSettingsDraft((current) =>
                    current
                      ? {
                          ...current,
                          mcp: {
                            ...current.mcp,
                            maxContextItems:
                              Number.parseInt(event.target.value, 10) || current.mcp.maxContextItems,
                          },
                        }
                      : current,
                  )
                }
                className="mt-2 w-full rounded-2xl border border-border-subtle bg-bg-base px-3 py-2 text-sm outline-none"
              />
            </label>

            <div className="mt-4 space-y-3">
              {settingsDraft?.mcp.connectors.map((connector) => {
                const status = mcpStatuses[connector.id];
                const probing = probingConnectorId === connector.id;

                return (
                  <details
                    key={connector.id}
                    className="rounded-2xl border border-border-subtle bg-bg-base px-4 py-4"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-text-primary">{connector.name}</p>
                            <span className="desktop-pill">{connector.tier}</span>
                            <span className="desktop-pill">{connector.transport}</span>
                            {connector.readOnly && <span className="desktop-pill">read only</span>}
                          </div>
                          <p className="mt-1 text-xs text-text-muted">{connector.description}</p>
                          {status && (
                            <p
                              className={cn(
                                'mt-2 text-xs',
                                status.available ? 'text-emerald-300' : 'text-rose-200',
                              )}
                            >
                              {status.available
                                ? `${status.serverName ?? connector.name} · ${status.tools.length} tools`
                                : status.error ?? 'Probe failed.'}
                            </p>
                          )}
                        </div>

                        <label
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center gap-2 rounded-full border border-border-subtle px-3 py-1 text-xs text-text-secondary"
                        >
                          <input
                            type="checkbox"
                            checked={connector.enabled}
                            onChange={(event) =>
                              updateConnector(connector.id, (current) => ({
                                ...current,
                                enabled: event.target.checked,
                              }))
                            }
                          />
                          Enabled
                        </label>
                      </div>
                    </summary>

                    <div className="mt-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
                            Transport
                          </span>
                          <select
                            value={connector.transport}
                            onChange={(event) =>
                              updateConnector(connector.id, (current) => ({
                                ...current,
                                transport: event.target.value as McpConnectorConfig['transport'],
                              }))
                            }
                            className="mt-2 w-full rounded-2xl border border-border-subtle bg-bg-surface px-3 py-2 text-sm outline-none"
                          >
                            <option value="stdio">stdio</option>
                            <option value="streamable_http">streamable_http</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
                            Startup timeout (ms)
                          </span>
                          <input
                            type="number"
                            min={1000}
                            step={500}
                            value={connector.startupTimeoutMs}
                            onChange={(event) =>
                              updateConnector(connector.id, (current) => ({
                                ...current,
                                startupTimeoutMs:
                                  Number.parseInt(event.target.value, 10) || current.startupTimeoutMs,
                              }))
                            }
                            className="mt-2 w-full rounded-2xl border border-border-subtle bg-bg-surface px-3 py-2 text-sm outline-none"
                          />
                        </label>
                      </div>

                      <label className="block">
                        <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Command</span>
                        <input
                          value={connector.command ?? ''}
                          onChange={(event) =>
                            updateConnector(connector.id, (current) => ({
                              ...current,
                              command: event.target.value || null,
                            }))
                          }
                          placeholder="uvx"
                          className="mt-2 w-full rounded-2xl border border-border-subtle bg-bg-surface px-3 py-2 text-sm outline-none"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
                          Arguments (one per line)
                        </span>
                        <textarea
                          value={formatArgs(connector.args)}
                          onChange={(event) =>
                            updateConnector(connector.id, (current) => ({
                              ...current,
                              args: parseArgs(event.target.value),
                            }))
                          }
                          rows={4}
                          className="mt-2 w-full rounded-2xl border border-border-subtle bg-bg-surface px-3 py-2 text-sm outline-none"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
                          Endpoint URL
                        </span>
                        <input
                          value={connector.url ?? ''}
                          onChange={(event) =>
                            updateConnector(connector.id, (current) => ({
                              ...current,
                              url: event.target.value || null,
                            }))
                          }
                          placeholder="https://server.example.com or postgres://..."
                          className="mt-2 w-full rounded-2xl border border-border-subtle bg-bg-surface px-3 py-2 text-sm outline-none"
                        />
                      </label>

                      <label className="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-bg-surface px-4 py-3">
                        <div>
                          <p className="text-sm text-text-primary">Use active workspace root</p>
                          <p className="mt-1 text-xs text-text-muted">
                            Required for filesystem and git-style connectors.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={connector.workspaceRootRequired}
                          onChange={(event) =>
                            updateConnector(connector.id, (current) => ({
                              ...current,
                              workspaceRootRequired: event.target.checked,
                            }))
                          }
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
                          Allowed roots (one per line)
                        </span>
                        <textarea
                          value={formatRoots(connector.allowedRoots)}
                          onChange={(event) =>
                            updateConnector(connector.id, (current) => ({
                              ...current,
                              allowedRoots: parseRoots(event.target.value),
                            }))
                          }
                          rows={3}
                          className="mt-2 w-full rounded-2xl border border-border-subtle bg-bg-surface px-3 py-2 text-sm outline-none"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
                          Environment variables
                        </span>
                        <textarea
                          value={formatEnv(connector.env)}
                          onChange={(event) =>
                            updateConnector(connector.id, (current) => ({
                              ...current,
                              env: parseEnv(event.target.value),
                            }))
                          }
                          rows={3}
                          placeholder="GITHUB_PERSONAL_ACCESS_TOKEN<-GITHUB_PERSONAL_ACCESS_TOKEN"
                          className="mt-2 w-full rounded-2xl border border-border-subtle bg-bg-surface px-3 py-2 text-sm outline-none"
                        />
                      </label>

                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-text-muted">
                          Mention the connector by typing `@` in the composer, then select an MCP
                          action chip.
                        </div>
                        <button
                          onClick={() => void handleProbeConnector(connector.id)}
                          disabled={probing}
                          className="desktop-pill disabled:opacity-40"
                        >
                          {probing ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Probing
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <RefreshCw className="h-3.5 w-3.5" />
                              Probe
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          </section>

          {storageInfo && (
            <section className="desktop-card !p-4">
              <p className="text-sm font-medium text-text-primary">Local storage</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border-subtle bg-bg-base px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Threads</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">{storageInfo.threadCount}</p>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-bg-base px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Drafts</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">{storageInfo.draftCount}</p>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-bg-base px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Footprint</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">
                    {formatBytes(storageInfo.totalSizeBytes)}
                  </p>
                </div>
              </div>
              <p className="mt-3 break-all text-xs text-text-muted">{storageInfo.basePath}</p>
            </section>
          )}
        </div>

        <div className="sticky bottom-0 mt-6 flex items-center justify-end gap-3 border-t border-border-subtle bg-bg-surface/95 py-4 backdrop-blur">
          <button onClick={onClose} className="desktop-pill">
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saveBusy || !settingsDraft || !runtimeDraft}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-bg-base disabled:opacity-40"
          >
            {saveBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save settings
          </button>
        </div>
      </motion.div>
  );

  if (embedded) {
    return panel;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex justify-end bg-black/35 backdrop-blur-sm"
      onClick={onClose}
    >
      {panel}
    </motion.div>
  );
}
