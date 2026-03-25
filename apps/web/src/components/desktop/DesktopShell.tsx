'use client';

import React, { useEffect, useMemo, useState, startTransition } from 'react';
import {
  Archive,
  ChevronRight,
  FolderOpen,
  Globe,
  Loader2,
  MessageSquarePlus,
  Search,
  Send,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';

import {
  AppSettings,
  AssistantCitationsEvent,
  AssistantTokenEvent,
  Citation,
  DesktopContextItem,
  EnsureReadyResult,
  Message,
  ModelInfo,
  OllamaRuntimeStatusInfo,
  QueryFinished,
  QueryMode,
  ResearchProgressEvent,
  RuntimeSettings,
  ThreadDetail,
  ThreadSummary,
  WebSource,
  Workspace,
  WorkspaceContextItem,
  archiveThread,
  createWorkspace,
  deleteThread,
  ensureRuntimeReady,
  exportWorkspaceThread,
  getActiveWorkspace,
  getCachedRuntimeStatus,
  getRuntimeConfig,
  getSettings,
  isDesktopApp,
  listRuntimeModels,
  listThreadSources,
  listThreads,
  listWorkspaces,
  listenEvent,
  lookupContextItems,
  openThread,
  pickWorkspaceDirectory,
  probeRuntime,
  setActiveWorkspace,
  submitDesktopQuery,
  updateRuntimeConfig,
  updateSettings,
} from '@/lib/desktop/client';
import { cn } from '@/lib/utils';

function formatPreviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function deriveTitle(query: string) {
  const first = query.trim().split(/[.!?\n]/)[0] ?? query.trim();
  return first.length <= 50 ? first : `${first.slice(0, 49)}…`;
}

function buildContextItem(item: WorkspaceContextItem): DesktopContextItem {
  return {
    id: item.id,
    kind:
      item.kind === 'directory'
        ? 'directory'
        : item.kind === 'thread'
          ? 'thread'
          : item.kind === 'url'
            ? 'url'
            : 'file',
    title: item.title,
    path: item.path,
    value: item.path ?? item.title,
  };
}

function inferWorkspaceName(path: string) {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? 'Workspace';
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

function runtimeTone(status: OllamaRuntimeStatusInfo | null) {
  switch (status?.status) {
    case 'running':
      return 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10';
    case 'available':
      return 'text-amber-300 border-amber-300/20 bg-amber-300/10';
    case 'stopped':
    case 'not_installed':
    case 'error':
      return 'text-rose-300 border-rose-300/20 bg-rose-300/10';
    default:
      return 'text-text-muted border-border-subtle bg-bg-surface';
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

export function DesktopShell() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThread, setActiveThread] = useState<ThreadDetail | null>(null);
  const [threadSources, setThreadSources] = useState<WebSource[]>([]);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<QueryMode>('ask');
  const [webSearch, setWebSearch] = useState(true);
  const [contextItems, setContextItems] = useState<DesktopContextItem[]>([]);
  const [contextResults, setContextResults] = useState<WorkspaceContextItem[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchThreads, setSearchThreads] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<AppSettings | null>(null);
  const [runtimeDraft, setRuntimeDraft] = useState<RuntimeSettings | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<OllamaRuntimeStatusInfo | null>(null);
  const [runtimeModels, setRuntimeModels] = useState<ModelInfo[]>([]);
  const [runtimeBusy, setRuntimeBusy] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [researchProgress, setResearchProgress] = useState<ResearchProgressEvent | null>(null);

  const visibleThreads = useMemo(() => {
    if (!searchThreads.trim()) return threads;
    return threads.filter((thread) =>
      thread.title.toLowerCase().includes(searchThreads.toLowerCase()),
    );
  }, [threads, searchThreads]);

  const activeCitations = useMemo<Citation[]>(() => {
    const lastAssistant = [...(activeThread?.messages ?? [])]
      .reverse()
      .find((message) => message.role === 'assistant' && message.citations.length > 0);
    return lastAssistant?.citations ?? [];
  }, [activeThread]);

  const selectedModelId =
    runtimeDraft?.defaultModel ?? settingsDraft?.defaultProvider.modelId ?? 'llama3.2';

  useEffect(() => {
    setIsDesktop(isDesktopApp());
  }, []);

  useEffect(() => {
    if (!isDesktop) return;

    void hydrateDesktop();
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop) return;

    let disposed = false;
    const unsubs: Array<() => void> = [];

    void (async () => {
      unsubs.push(
        await listenEvent<{ threadId: string }>('vigilante://assistant-started', (payload) => {
          setExportPath(null);
          setResearchProgress(null);
          void syncThread(payload.threadId);
          if (activeWorkspace) {
            void reloadThreads(activeWorkspace.id, payload.threadId);
          }
        }),
      );

      unsubs.push(
        await listenEvent<AssistantTokenEvent>('vigilante://assistant-token', (payload) => {
          startTransition(() => {
            setActiveThread((current) => {
              if (!current || current.thread.id !== payload.threadId) return current;

              const existing = current.messages.find((message) => message.id === payload.messageId);
              const messages = existing
                ? current.messages.map((message) =>
                    message.id === payload.messageId
                      ? { ...message, content: `${message.content}${payload.token}` }
                      : message,
                  )
                : [
                    ...current.messages,
                    {
                      id: payload.messageId,
                      role: 'assistant',
                      content: payload.token,
                      citations: [],
                      followUps: [],
                      mode,
                      modelUsed: null,
                      isComplete: false,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    } satisfies Message,
                  ];

              return {
                ...current,
                messages,
              };
            });
          });
        }),
      );

      unsubs.push(
        await listenEvent<AssistantCitationsEvent>('vigilante://assistant-citations', (payload) => {
          startTransition(() => {
            setActiveThread((current) => {
              if (!current || current.thread.id !== payload.threadId) return current;
              return {
                ...current,
                messages: current.messages.map((message) =>
                  message.id === payload.messageId
                    ? { ...message, citations: payload.citations, isComplete: true }
                    : message,
                ),
              };
            });
          });
        }),
      );

      unsubs.push(
        await listenEvent<ResearchProgressEvent>('vigilante://research-progress', (payload) => {
          setResearchProgress(payload);
        }),
      );

      unsubs.push(
        await listenEvent<QueryFinished>('vigilante://assistant-finished', (payload) => {
          void syncThread(payload.threadId);
          if (activeWorkspace) {
            void reloadThreads(activeWorkspace.id, payload.threadId);
          }
          setIsSubmitting(false);
          setResearchProgress(null);
        }),
      );
    })().catch((error) => {
      if (!disposed) {
        setStreamError(error instanceof Error ? error.message : 'Failed to register desktop events');
      }
    });

    return () => {
      disposed = true;
      unsubs.forEach((unsub) => unsub());
    };
  }, [activeWorkspace, isDesktop, mode]);

  useEffect(() => {
    if (!activeWorkspace || !query.includes('@')) {
      setContextResults([]);
      return;
    }

    const match = query.match(/(?:^|\s)@([^\s]*)$/);
    if (!match) {
      setContextResults([]);
      return;
    }

    const mention = match[1];
    const handle = window.setTimeout(() => {
      void lookupContextItems(activeWorkspace.id, mention)
        .then((results) => setContextResults(results))
        .catch(() => setContextResults([]));
    }, 120);

    return () => window.clearTimeout(handle);
  }, [activeWorkspace, query]);

  async function hydrateDesktop() {
    try {
      const [
        workspace,
        workspaceList,
        nextSettings,
        nextRuntime,
        nextRuntimeStatus,
        nextModels,
      ] = await Promise.all([
        getActiveWorkspace(),
        listWorkspaces(),
        getSettings(),
        getRuntimeConfig(),
        getCachedRuntimeStatus(),
        listRuntimeModels(),
      ]);

      setActiveWorkspaceState(workspace);
      setWorkspaces(workspaceList);
      setSettingsDraft(nextSettings);
      setRuntimeDraft({
        ...nextRuntime,
        defaultModel: nextRuntime.defaultModel ?? nextSettings.defaultProvider.modelId,
      });
      setRuntimeStatus(nextRuntimeStatus);
      setRuntimeModels(nextModels.length > 0 ? nextModels : nextRuntimeStatus.models);
      setWebSearch(nextSettings.search.enabledByDefault);

      await reloadThreads(workspace.id);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to load desktop state');
    }
  }

  async function reloadThreads(workspaceId: string, preferredThreadId?: string) {
    const nextThreads = await listThreads(workspaceId);
    setThreads(nextThreads);

    const currentThreadStillVisible = activeThread
      ? nextThreads.some((thread) => thread.id === activeThread.thread.id)
      : false;
    const nextActiveId =
      preferredThreadId ??
      (currentThreadStillVisible ? activeThread?.thread.id : undefined) ??
      nextThreads[0]?.id;

    if (nextActiveId) {
      await syncThread(nextActiveId);
    } else {
      setActiveThread(null);
      setThreadSources([]);
    }
  }

  async function syncThread(threadId: string) {
    try {
      const [detail, sources] = await Promise.all([
        openThread(threadId),
        listThreadSources(threadId),
      ]);
      setActiveThread(detail);
      setThreadSources(sources);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to load thread');
    }
  }

  async function handleWorkspaceSwitch(workspace: Workspace) {
    setActiveWorkspaceState(workspace);
    await setActiveWorkspace(workspace.id);
    await reloadThreads(workspace.id);
  }

  async function handleCreateWorkspace() {
    try {
      const rootPath = await pickWorkspaceDirectory();
      if (!rootPath) return;

      const workspace = await createWorkspace(inferWorkspaceName(rootPath), rootPath);
      setActiveWorkspaceState(workspace);
      setWorkspaces(await listWorkspaces());
      setSettingsNotice(`Workspace added: ${workspace.name}`);
      await reloadThreads(workspace.id);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to create workspace');
    }
  }

  async function handleSubmit() {
    if (!activeWorkspace || !query.trim() || isSubmitting) return;

    const submittedQuery = query.trim();
    setQuery('');
    setContextResults([]);
    setStreamError(null);
    setExportPath(null);
    setIsSubmitting(true);

    if (activeThread) {
      setActiveThread({
        ...activeThread,
        messages: [
          ...activeThread.messages,
          {
            id: `local-user-${Date.now()}`,
            role: 'user',
            content: submittedQuery,
            citations: [],
            followUps: [],
            mode,
            isComplete: true,
            modelUsed: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      });
    } else {
      setActiveThread({
        thread: {
          id: 'pending-thread',
          workspaceId: activeWorkspace.id,
          title: deriveTitle(submittedQuery),
          preview: submittedQuery,
          archived: false,
          pinned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastOpenedAt: null,
        },
        messages: [
          {
            id: `local-user-${Date.now()}`,
            role: 'user',
            content: submittedQuery,
            citations: [],
            followUps: [],
            mode,
            isComplete: true,
            modelUsed: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      });
      setThreadSources([]);
    }

    try {
      await submitDesktopQuery({
        workspaceId: activeWorkspace.id,
        threadId: activeThread?.thread.id === 'pending-thread' ? null : activeThread?.thread.id,
        query: submittedQuery,
        mode,
        webSearch,
        contextItems,
      });
      setContextItems([]);
    } catch (error) {
      setIsSubmitting(false);
      setStreamError(error instanceof Error ? error.message : 'Failed to submit query');
    }
  }

  function handleMentionSelect(item: WorkspaceContextItem) {
    const match = query.match(/(?:^|\s)@([^\s]*)$/);
    if (match) {
      setQuery((prev) => prev.replace(/(?:^|\s)@([^\s]*)$/, ' '));
    }
    setContextItems((prev) => {
      if (prev.some((existing) => existing.id === item.id)) return prev;
      return [...prev, buildContextItem(item)];
    });
    setContextResults([]);
  }

  async function handleArchiveThread(threadId: string) {
    await archiveThread(threadId);
    if (activeWorkspace) {
      await reloadThreads(activeWorkspace.id);
    }
  }

  async function handleDeleteThread(threadId: string) {
    await deleteThread(threadId);
    if (activeWorkspace) {
      await reloadThreads(activeWorkspace.id);
    }
  }

  async function handleProbeRuntime() {
    setRuntimeBusy(true);
    setSettingsNotice(null);
    try {
      const status = await probeRuntime();
      setRuntimeStatus(status);
      setRuntimeModels(status.models);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to probe runtime');
    } finally {
      setRuntimeBusy(false);
    }
  }

  async function handleEnsureRuntime() {
    setRuntimeBusy(true);
    setSettingsNotice(null);
    try {
      const result: EnsureReadyResult = await ensureRuntimeReady();
      setRuntimeStatus(result.runtime);
      setRuntimeModels(result.runtime.models);
      setSettingsNotice(
        result.startOutcome
          ? `Runtime status: ${result.startOutcome.replaceAll('_', ' ')}`
          : 'Runtime checked.',
      );
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to ensure runtime');
    } finally {
      setRuntimeBusy(false);
    }
  }

  async function handleSaveSettings() {
    if (!settingsDraft || !runtimeDraft) return;

    setSettingsBusy(true);
    setSettingsNotice(null);
    setStreamError(null);

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
      const [savedSettings, savedRuntime] = await Promise.all([
        updateSettings(nextSettings),
        updateRuntimeConfig(nextRuntime),
      ]);

      setSettingsDraft(savedSettings);
      setRuntimeDraft(savedRuntime);
      setWebSearch(savedSettings.search.enabledByDefault);
      setSettingsNotice('Desktop settings saved.');
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSettingsBusy(false);
    }
  }

  async function handleExportThread(format: 'md' | 'json') {
    if (!activeThread) return;

    try {
      const path = await exportWorkspaceThread(activeThread.thread.id, format);
      setExportPath(path);
      setSettingsNotice(`Thread exported as ${format.toUpperCase()}.`);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to export thread');
    }
  }

  if (!isDesktop) {
    return (
      <div className="min-h-screen bg-bg-base text-text-primary flex items-center justify-center px-8">
        <div className="max-w-lg rounded-2xl border border-border-subtle bg-bg-surface p-8 text-center">
          <h1 className="text-display-sm mb-3">Vigilante Desktop</h1>
          <p className="text-text-secondary text-body-md">
            This build now expects to run inside the Tauri desktop shell. Open it with `pnpm tauri dev`
            or build the desktop app to use local workspaces, local storage, runtime controls, and
            desktop retrieval.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-bg-base text-text-primary flex overflow-hidden">
      <aside className="w-[280px] shrink-0 border-r border-border-strong bg-bg-surface flex flex-col">
        <div className="px-5 pt-5 pb-4 border-b border-border-subtle">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption uppercase tracking-[0.2em] text-text-muted">Vigilante</p>
              <h1 className="text-heading-md mt-1">Desktop</h1>
            </div>
            <button
              onClick={() => void handleCreateWorkspace()}
              className="rounded-lg border border-border-subtle p-2 hover:border-accent/30 hover:bg-bg-elevated"
              title="Add workspace folder"
            >
              <FolderOpen className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => void handleWorkspaceSwitch(workspace)}
                className={cn(
                  'w-full rounded-xl border px-3 py-2 text-left transition-colors',
                  activeWorkspace?.id === workspace.id
                    ? 'border-accent/30 bg-accent/10'
                    : 'border-border-subtle bg-bg-base hover:border-border-medium',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-body-sm font-medium">{workspace.name}</span>
                  {activeWorkspace?.id === workspace.id && (
                    <ChevronRight className="h-4 w-4 text-accent" />
                  )}
                </div>
                {workspace.rootPath && (
                  <p className="mt-1 text-[11px] text-text-muted truncate">{workspace.rootPath}</p>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-text-muted" />
            <input
              value={searchThreads}
              onChange={(e) => setSearchThreads(e.target.value)}
              placeholder="Search threads"
              className="w-full bg-transparent text-body-sm text-text-primary placeholder:text-text-muted outline-none"
            />
          </div>
          <button
            onClick={() => {
              setActiveThread(null);
              setThreadSources([]);
              setExportPath(null);
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2 text-body-sm font-medium text-bg-base hover:bg-accent-hover"
          >
            <MessageSquarePlus className="h-4 w-4" />
            New Thread
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {visibleThreads.map((thread) => (
            <div
              key={thread.id}
              className={cn(
                'rounded-xl border px-3 py-3 transition-colors',
                activeThread?.thread.id === thread.id
                  ? 'border-accent/30 bg-accent/10'
                  : 'border-border-subtle bg-bg-base hover:border-border-medium',
              )}
            >
              <button className="w-full text-left" onClick={() => void syncThread(thread.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium truncate">{thread.title}</p>
                    <p className="mt-1 text-[11px] text-text-muted line-clamp-2">{thread.preview}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-text-muted shrink-0">
                    {formatPreviewDate(thread.updatedAt)}
                  </span>
                </div>
              </button>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => void handleArchiveThread(thread.id)}
                  className="rounded-lg border border-border-subtle p-1.5 text-text-muted hover:text-text-primary"
                  title="Archive"
                >
                  <Archive className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => void handleDeleteThread(thread.id)}
                  className="rounded-lg border border-border-subtle p-1.5 text-text-muted hover:text-error"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="min-w-0 flex-1 flex flex-col">
        <div className="border-b border-border-subtle px-6 py-4 flex items-center justify-between bg-bg-base/90 backdrop-blur">
          <div>
            <p className="text-caption uppercase tracking-[0.18em] text-text-muted">Workspace</p>
            <h2 className="text-heading-sm mt-1">{activeWorkspace?.name ?? 'Loading…'}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('rounded-full border px-3 py-1 text-caption', runtimeTone(runtimeStatus))}>
              Runtime: {runtimeLabel(runtimeStatus)}
            </span>
            <span className="rounded-full border border-border-subtle px-3 py-1 text-caption text-text-secondary">
              Model: {selectedModelId}
            </span>
            <button
              onClick={() => void handleExportThread('md')}
              disabled={!activeThread}
              className="rounded-full border border-border-subtle px-3 py-1 text-caption text-text-secondary hover:text-text-primary disabled:opacity-40"
            >
              Export MD
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-full border border-border-subtle px-3 py-1 text-caption text-text-secondary hover:text-text-primary inline-flex items-center gap-2"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Settings
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <section className="min-w-0 flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              {(activeThread?.messages ?? []).length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="max-w-xl text-center">
                    <h3 className="text-display-sm">Ask anything. Keep everything local.</h3>
                    <p className="mt-3 text-text-secondary text-body-md">
                      Threads, workspace context, fetched sources, and runtime state now live in the
                      desktop backend.
                    </p>
                  </div>
                </div>
              ) : (
                activeThread?.messages.map((message) => (
                  <article key={message.id} className="max-w-3xl">
                    <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-text-muted">
                      <span>{message.role === 'user' ? 'You' : 'Vigilante'}</span>
                      {message.role === 'assistant' && !message.isComplete && (
                        <span className="text-accent">Streaming</span>
                      )}
                    </div>
                    <div
                      className={cn(
                        'rounded-2xl border px-5 py-4 whitespace-pre-wrap leading-7',
                        message.role === 'user'
                          ? 'border-border-subtle bg-bg-surface'
                          : 'border-accent/15 bg-accent/5',
                      )}
                    >
                      {message.content || (message.role === 'assistant' ? 'Thinking…' : '')}
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="border-t border-border-subtle bg-bg-base px-6 py-5">
              {contextItems.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {contextItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setContextItems((prev) => prev.filter((entry) => entry.id !== item.id))}
                      className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-caption text-accent"
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              )}

              {contextResults.length > 0 && query.includes('@') && (
                <div className="mb-3 rounded-2xl border border-border-subtle bg-bg-surface p-2">
                  {contextResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleMentionSelect(item)}
                      className="flex w-full items-start justify-between rounded-xl px-3 py-2 text-left hover:bg-bg-elevated"
                    >
                      <div>
                        <p className="text-body-sm">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-[11px] text-text-muted mt-1">{item.subtitle}</p>
                        )}
                      </div>
                      <span className="text-[10px] uppercase tracking-wide text-text-muted">
                        {item.kind}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="rounded-3xl border border-border-subtle bg-bg-surface p-3">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSubmit();
                    }
                  }}
                  placeholder="Ask about your workspace, search the web, or @mention a file..."
                  className="min-h-[96px] w-full resize-none bg-transparent px-3 py-2 text-body-lg text-text-primary outline-none placeholder:text-text-muted"
                />
                <div className="mt-3 flex items-center justify-between gap-3 px-2">
                  <div className="flex items-center gap-2">
                    {(['ask', 'research', 'deep_research'] as QueryMode[]).map((candidate) => (
                      <button
                        key={candidate}
                        onClick={() => setMode(candidate)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-caption uppercase tracking-wide',
                          mode === candidate
                            ? 'border-accent/30 bg-accent/10 text-accent'
                            : 'border-border-subtle text-text-muted',
                        )}
                      >
                        {candidate.replace('_', ' ')}
                      </button>
                    ))}
                    <button
                      onClick={() => setWebSearch((prev) => !prev)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-caption flex items-center gap-2',
                        webSearch
                          ? 'border-accent/30 bg-accent/10 text-accent'
                          : 'border-border-subtle text-text-muted',
                      )}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Web
                    </button>
                  </div>

                  <button
                    onClick={() => void handleSubmit()}
                    disabled={!query.trim() || isSubmitting || !activeWorkspace}
                    className="rounded-2xl bg-accent px-4 py-2 text-body-sm font-medium text-bg-base disabled:opacity-40"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      {isSubmitting ? 'Running' : 'Send'}
                    </span>
                  </button>
                </div>
              </div>

              {streamError && <p className="mt-3 text-body-sm text-error">{streamError}</p>}
              {settingsNotice && <p className="mt-2 text-body-sm text-text-secondary">{settingsNotice}</p>}
            </div>
          </section>

          <aside className="w-[340px] shrink-0 border-l border-border-subtle bg-bg-surface flex flex-col">
            <div className="px-5 py-4 border-b border-border-subtle">
              <p className="text-caption uppercase tracking-[0.18em] text-text-muted">Research</p>
              <h3 className="text-heading-sm mt-1">Sources panel</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              <div className="rounded-2xl border border-border-subtle bg-bg-base px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-body-sm font-medium">Runtime</p>
                    <p className="mt-1 text-[11px] text-text-muted">
                      {runtimeLabel(runtimeStatus)} · {runtimeModels.length} local models
                    </p>
                  </div>
                  <button
                    onClick={() => void handleEnsureRuntime()}
                    disabled={runtimeBusy}
                    className="rounded-full border border-border-subtle px-3 py-1 text-caption text-text-secondary disabled:opacity-40"
                  >
                    {runtimeBusy ? 'Checking' : 'Ensure'}
                  </button>
                </div>
              </div>

              {researchProgress && (
                <div className="rounded-2xl border border-accent/20 bg-accent/5 px-4 py-4">
                  <p className="text-caption uppercase tracking-[0.18em] text-accent">
                    {researchProgress.phase.replaceAll('_', ' ')}
                  </p>
                  <p className="mt-2 text-body-sm text-text-primary">{researchProgress.message}</p>
                </div>
              )}

              {exportPath && (
                <div className="rounded-2xl border border-border-subtle bg-bg-base px-4 py-4">
                  <p className="text-body-sm font-medium">Latest export</p>
                  <p className="mt-2 break-all text-[11px] text-text-muted">{exportPath}</p>
                </div>
              )}

              {activeCitations.length > 0 && (
                <div className="space-y-3">
                  <p className="text-caption uppercase tracking-[0.18em] text-text-muted">Citations</p>
                  {activeCitations.map((citation) => (
                    <a
                      key={citation.id}
                      href={citation.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border border-border-subtle bg-bg-base px-4 py-4 hover:border-accent/30"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-body-sm font-medium">{citation.title}</p>
                        <span className="text-[10px] uppercase tracking-wide text-accent">
                          [{citation.index}]
                        </span>
                      </div>
                      {citation.domain && (
                        <p className="mt-1 text-[11px] text-text-muted">{citation.domain}</p>
                      )}
                      {citation.excerpt && (
                        <p className="mt-3 text-body-sm text-text-secondary line-clamp-4">
                          {citation.excerpt}
                        </p>
                      )}
                    </a>
                  ))}
                </div>
              )}

              {threadSources.length > 0 && (
                <div className="space-y-3">
                  <p className="text-caption uppercase tracking-[0.18em] text-text-muted">Fetched pages</p>
                  {threadSources.map((source) => (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border border-border-subtle bg-bg-base px-4 py-4 hover:border-accent/30"
                    >
                      <p className="text-body-sm font-medium">{source.title}</p>
                      {source.domain && (
                        <p className="mt-1 text-[11px] text-text-muted">{source.domain}</p>
                      )}
                      <p className="mt-3 text-body-sm text-text-secondary line-clamp-4">
                        {source.excerpt}
                      </p>
                    </a>
                  ))}
                </div>
              )}

              {activeCitations.length === 0 && threadSources.length === 0 && !researchProgress && (
                <div className="rounded-2xl border border-border-subtle bg-bg-base px-4 py-5 text-body-sm text-text-muted">
                  Fetched web pages, citations, and research progress will appear here when a
                  research-enabled answer runs.
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {settingsOpen && (
        <div className="absolute inset-0 z-20 flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="h-full w-[420px] border-l border-border-subtle bg-bg-surface px-5 py-5 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption uppercase tracking-[0.18em] text-text-muted">Desktop</p>
                <h3 className="text-heading-sm mt-1">Runtime and search</h3>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="rounded-full border border-border-subtle p-2 text-text-muted hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <section className="rounded-2xl border border-border-subtle bg-bg-base p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-body-sm font-medium">Ollama runtime</p>
                    <p className="mt-1 text-[11px] text-text-muted">
                      {runtimeLabel(runtimeStatus)} · {runtimeStatus?.baseUrl ?? 'http://127.0.0.1:11434'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void handleProbeRuntime()}
                      disabled={runtimeBusy}
                      className="rounded-full border border-border-subtle px-3 py-1 text-caption text-text-secondary disabled:opacity-40"
                    >
                      {runtimeBusy ? 'Busy' : 'Probe'}
                    </button>
                    <button
                      onClick={() => void handleEnsureRuntime()}
                      disabled={runtimeBusy}
                      className="rounded-full border border-border-subtle px-3 py-1 text-caption text-text-secondary disabled:opacity-40"
                    >
                      Ensure
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="text-caption text-text-muted">Base URL</span>
                    <input
                      value={runtimeDraft?.ollamaBaseUrl ?? ''}
                      onChange={(e) =>
                        setRuntimeDraft((current) =>
                          current ? { ...current, ollamaBaseUrl: e.target.value } : current,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-border-subtle bg-bg-surface px-3 py-2 text-body-sm outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="text-caption text-text-muted">Connection timeout (ms)</span>
                    <input
                      type="number"
                      min={1000}
                      step={500}
                      value={runtimeDraft?.connectionTimeoutMs ?? 5000}
                      onChange={(e) =>
                        setRuntimeDraft((current) =>
                          current
                            ? {
                                ...current,
                                connectionTimeoutMs:
                                  Number.parseInt(e.target.value, 10) || current.connectionTimeoutMs,
                              }
                            : current,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-border-subtle bg-bg-surface px-3 py-2 text-body-sm outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="text-caption text-text-muted">Default model</span>
                    {runtimeModels.length > 0 ? (
                      <select
                        value={selectedModelId}
                        onChange={(e) => {
                          const modelId = e.target.value;
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
                        className="mt-2 w-full rounded-xl border border-border-subtle bg-bg-surface px-3 py-2 text-body-sm outline-none"
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
                        onChange={(e) => {
                          const modelId = e.target.value;
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
                        className="mt-2 w-full rounded-xl border border-border-subtle bg-bg-surface px-3 py-2 text-body-sm outline-none"
                      />
                    )}
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-border-subtle bg-bg-base p-4">
                <p className="text-body-sm font-medium">Web retrieval</p>
                <div className="mt-4 space-y-3">
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-surface px-3 py-2">
                    <span className="text-body-sm">Enable web by default</span>
                    <input
                      type="checkbox"
                      checked={settingsDraft?.search.enabledByDefault ?? true}
                      onChange={(e) =>
                        setSettingsDraft((current) =>
                          current
                            ? {
                                ...current,
                                search: {
                                  ...current.search,
                                  enabledByDefault: e.target.checked,
                                },
                              }
                            : current,
                        )
                      }
                    />
                  </label>

                  <label className="block">
                    <span className="text-caption text-text-muted">Search provider</span>
                    <select
                      value={settingsDraft?.search.provider ?? 'brave'}
                      onChange={(e) =>
                        setSettingsDraft((current) =>
                          current
                            ? {
                                ...current,
                                search: {
                                  ...current.search,
                                  provider: e.target.value as AppSettings['search']['provider'],
                                },
                              }
                            : current,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-border-subtle bg-bg-surface px-3 py-2 text-body-sm outline-none"
                    >
                      <option value="brave">Brave Search</option>
                      <option value="serper">Serper</option>
                      <option value="searx_ng">SearxNG</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-caption text-text-muted">Brave API key</span>
                    <input
                      value={settingsDraft?.search.braveApiKey ?? ''}
                      onChange={(e) =>
                        setSettingsDraft((current) =>
                          current
                            ? {
                                ...current,
                                search: {
                                  ...current.search,
                                  braveApiKey: e.target.value || null,
                                },
                              }
                            : current,
                        )
                      }
                      placeholder="BSA..."
                      className="mt-2 w-full rounded-xl border border-border-subtle bg-bg-surface px-3 py-2 text-body-sm outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="text-caption text-text-muted">SearxNG base URL</span>
                    <input
                      value={settingsDraft?.search.searxngBaseUrl ?? ''}
                      onChange={(e) =>
                        setSettingsDraft((current) =>
                          current
                            ? {
                                ...current,
                                search: {
                                  ...current.search,
                                  searxngBaseUrl: e.target.value || null,
                                },
                              }
                            : current,
                        )
                      }
                      placeholder="https://search.example.com"
                      className="mt-2 w-full rounded-xl border border-border-subtle bg-bg-surface px-3 py-2 text-body-sm outline-none"
                    />
                  </label>
                </div>
              </section>

              {runtimeModels.length > 0 && (
                <section className="rounded-2xl border border-border-subtle bg-bg-base p-4">
                  <p className="text-body-sm font-medium">Installed models</p>
                  <div className="mt-4 space-y-2">
                    {runtimeModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setRuntimeDraft((current) =>
                            current ? { ...current, defaultModel: model.id } : current,
                          );
                          setSettingsDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  defaultProvider: {
                                    ...current.defaultProvider,
                                    providerId: 'ollama',
                                    modelId: model.id,
                                  },
                                }
                              : current,
                          );
                        }}
                        className={cn(
                          'w-full rounded-xl border px-3 py-3 text-left transition-colors',
                          selectedModelId === model.id
                            ? 'border-accent/30 bg-accent/10'
                            : 'border-border-subtle bg-bg-surface hover:border-border-medium',
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-body-sm font-medium">{model.name}</p>
                            <p className="mt-1 text-[11px] text-text-muted">
                              {model.family ?? 'unknown family'} · {formatModelSize(model.sizeBytes)}
                            </p>
                          </div>
                          {selectedModelId === model.id && (
                            <span className="text-[10px] uppercase tracking-wide text-accent">Active</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => void handleSaveSettings()}
                  disabled={!settingsDraft || !runtimeDraft || settingsBusy}
                  className="rounded-2xl bg-accent px-4 py-2 text-body-sm font-medium text-bg-base disabled:opacity-40"
                >
                  {settingsBusy ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving
                    </span>
                  ) : (
                    'Save settings'
                  )}
                </button>
                <button
                  onClick={() => void handleExportThread('json')}
                  disabled={!activeThread}
                  className="rounded-2xl border border-border-subtle px-4 py-2 text-body-sm text-text-secondary disabled:opacity-40"
                >
                  Export JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
