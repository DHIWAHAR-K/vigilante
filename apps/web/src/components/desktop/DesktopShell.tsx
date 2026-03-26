'use client';

import React, {
  useCallback,
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';

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
  pickAttachmentFiles,
  pickWorkspaceDirectory,
  probeRuntime,
  setActiveWorkspace,
  submitDesktopQuery,
  updateRuntimeConfig,
  updateSettings,
} from '@/lib/desktop/client';

import { DesktopInspector } from '@/components/desktop-shell/DesktopInspector';
import { DesktopSettingsPanel } from '@/components/desktop-shell/DesktopSettingsPanel';
import { DesktopSidebar } from '@/components/desktop-shell/DesktopSidebar';
import { DesktopWorkspace } from '@/components/desktop-shell/DesktopWorkspace';
import { PendingAttachment } from '@/components/desktop-shell/types';
import {
  buildContextItem,
  createAttachment,
  deriveTitle,
  extractDroppedPaths,
  inferWorkspaceName,
} from '@/components/desktop-shell/utils';

export function DesktopShell() {
  const { setTheme } = useTheme();

  const [isDesktop, setIsDesktop] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThread, setActiveThread] = useState<ThreadDetail | null>(null);
  const [threadSources, setThreadSources] = useState<WebSource[]>([]);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<QueryMode>('research');
  const [webSearch, setWebSearch] = useState(true);
  const [contextItems, setContextItems] = useState<DesktopContextItem[]>([]);
  const [contextResults, setContextResults] = useState<WorkspaceContextItem[]>([]);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchThreads, setSearchThreads] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<AppSettings | null>(null);
  const [runtimeDraft, setRuntimeDraft] = useState<RuntimeSettings | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<OllamaRuntimeStatusInfo | null>(null);
  const [runtimeModels, setRuntimeModels] = useState<ModelInfo[]>([]);
  const [runtimeBusy, setRuntimeBusy] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [researchProgress, setResearchProgress] = useState<ResearchProgressEvent | null>(null);

  const deferredSearchThreads = useDeferredValue(searchThreads);

  const visibleThreads = useMemo(() => {
    if (!deferredSearchThreads.trim()) return threads;

    const searchValue = deferredSearchThreads.toLowerCase();
    return threads.filter((thread) => thread.title.toLowerCase().includes(searchValue));
  }, [deferredSearchThreads, threads]);

  const activeCitations = useMemo<Citation[]>(() => {
    const lastAssistant = [...(activeThread?.messages ?? [])]
      .reverse()
      .find((message) => message.role === 'assistant' && message.citations.length > 0);
    return lastAssistant?.citations ?? [];
  }, [activeThread]);

  const selectedModelId =
    runtimeDraft?.defaultModel ?? settingsDraft?.defaultProvider.modelId ?? 'local-model';

  const syncThread = useCallback(async (threadId: string) => {
    try {
      const [detail, sources] = await Promise.all([openThread(threadId), listThreadSources(threadId)]);
      setActiveThread(detail);
      setThreadSources(sources);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to load thread');
    }
  }, []);

  const reloadThreads = useCallback(
    async (workspaceId: string, preferredThreadId?: string) => {
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
    },
    [activeThread, syncThread],
  );

  const hydrateDesktop = useCallback(async () => {
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
      setTheme(nextSettings.appearance.theme);

      await reloadThreads(workspace.id);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to load desktop state');
    }
  }, [reloadThreads, setTheme]);

  useEffect(() => {
    setIsDesktop(isDesktopApp());
  }, []);

  useEffect(() => {
    if (!isDesktop) return;

    void hydrateDesktop();
  }, [hydrateDesktop, isDesktop]);

  useEffect(() => {
    if (!isDesktop) return;

    let disposed = false;
    const unsubs: Array<() => void> = [];

    void (async () => {
      unsubs.push(
        await listenEvent<{ threadId: string }>('vigilante://assistant-started', (payload) => {
          if (disposed) return;
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
          if (disposed) return;

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
          if (disposed) return;

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
          if (!disposed) {
            setResearchProgress(payload);
          }
        }),
      );

      unsubs.push(
        await listenEvent<QueryFinished>('vigilante://assistant-finished', (payload) => {
          if (disposed) return;

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
  }, [activeWorkspace, isDesktop, mode, reloadThreads, syncThread]);

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

  function resetComposerState() {
    setContextItems([]);
    setContextResults([]);
    setAttachments([]);
  }

  function addAttachmentPaths(paths: string[]) {
    const nextAttachments = paths.map(createAttachment);
    if (nextAttachments.length === 0) return;

    setAttachments((current) => {
      const merged = [...current];
      const existing = new Set(current.map((attachment) => attachment.id));

      nextAttachments.forEach((attachment) => {
        if (!existing.has(attachment.id)) {
          merged.push(attachment);
          existing.add(attachment.id);
        }
      });

      return merged;
    });

    setContextItems((current) => {
      const merged = [...current];
      const existing = new Set(current.map((item) => item.id));

      nextAttachments.forEach((attachment) => {
        if (!existing.has(attachment.id)) {
          merged.push(attachment.contextItem);
          existing.add(attachment.id);
        }
      });

      return merged;
    });
  }

  async function handleWorkspaceSwitch(workspace: Workspace) {
    try {
      setActiveWorkspaceState(workspace);
      await setActiveWorkspace(workspace.id);
      await reloadThreads(workspace.id);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to switch workspaces');
    }
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

  async function handlePickAttachments() {
    try {
      const paths = await pickAttachmentFiles();
      addAttachmentPaths(paths);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to attach files');
    }
  }

  function handleDropFiles(files: FileList) {
    const droppedPaths = extractDroppedPaths(files);

    if (droppedPaths.length === 0) {
      setSettingsNotice('Drag and drop is not available in this build yet. Use the + button instead.');
      return;
    }

    addAttachmentPaths(droppedPaths);
  }

  async function handleSubmit() {
    if (!activeWorkspace || !query.trim() || isSubmitting) return;

    const submittedQuery = query.trim();
    const currentThreadId = activeThread?.thread.id;

    setQuery('');
    setContextResults([]);
    setStreamError(null);
    setExportPath(null);
    setIsSubmitting(true);
    setInspectorOpen(false);

    const optimisticUserMessage: Message = {
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
    };

    if (activeThread) {
      setActiveThread({
        ...activeThread,
        messages: [...activeThread.messages, optimisticUserMessage],
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
        messages: [optimisticUserMessage],
        attachments: [],
      });
      setThreadSources([]);
    }

    try {
      const submission = await submitDesktopQuery({
        workspaceId: activeWorkspace.id,
        threadId: currentThreadId === 'pending-thread' ? null : currentThreadId,
        query: submittedQuery,
        mode,
        webSearch,
        contextItems,
        attachments: [],
      });

      setActiveThread((current) => {
        if (!current) return current;
        return {
          ...current,
          thread: {
            ...current.thread,
            id: submission.threadId,
          },
        };
      });

      resetComposerState();
      await reloadThreads(activeWorkspace.id, submission.threadId);
    } catch (error) {
      setIsSubmitting(false);
      setQuery(submittedQuery);
      setStreamError(error instanceof Error ? error.message : 'Failed to submit query');
    }
  }

  function handleMentionSelect(item: WorkspaceContextItem) {
    const match = query.match(/(?:^|\s)@([^\s]*)$/);
    if (match) {
      setQuery((current) => current.replace(/(?:^|\s)@([^\s]*)$/, ' '));
    }

    setContextItems((current) => {
      if (current.some((entry) => entry.id === item.id)) return current;
      return [...current, buildContextItem(item)];
    });
    setContextResults([]);
  }

  async function handleArchiveThread(threadId: string) {
    try {
      await archiveThread(threadId);
      if (activeWorkspace) {
        await reloadThreads(activeWorkspace.id);
      }
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to archive thread');
    }
  }

  async function handleDeleteThread(threadId: string) {
    try {
      await deleteThread(threadId);
      if (activeWorkspace) {
        await reloadThreads(activeWorkspace.id);
      }
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to delete thread');
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
      setTheme(savedSettings.appearance.theme);
      setSettingsNotice('Desktop settings saved.');
      setSettingsOpen(false);
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
      setInspectorOpen(true);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to export thread');
    }
  }

  function handleRemoveAttachment(id: string) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
    setContextItems((current) => current.filter((item) => item.id !== id));
  }

  function handleRemoveContextItem(id: string) {
    setContextItems((current) => current.filter((item) => item.id !== id));
  }

  function handleSelectModel(modelId: string) {
    setRuntimeDraft((current) =>
      current
        ? {
            ...current,
            defaultModel: modelId,
          }
        : current,
    );
    setSettingsDraft((current) =>
      current
        ? {
            ...current,
            defaultProvider: {
              ...current.defaultProvider,
              modelId,
            },
          }
        : current,
    );
  }

  function handleNewThread() {
    setActiveThread(null);
    setThreadSources([]);
    setExportPath(null);
    setResearchProgress(null);
    setQuery('');
    setStreamError(null);
    resetComposerState();
  }

  if (!isDesktop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base px-8 text-text-primary">
        <div className="desktop-panel max-w-xl rounded-[32px] p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Monitor className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-[34px] tracking-[-0.03em] text-[#f1e8df]">Vigilante Desktop</h1>
          <p className="mt-3 text-[14px] text-text-secondary">
            This interface is designed for the Tauri desktop shell. Launch the desktop app to use
            local workspaces, saved chats, runtime controls, and offline research flows.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-bg-base text-text-primary">
      <DesktopSidebar
        activeThreadId={activeThread?.thread.id ?? null}
        activeWorkspace={activeWorkspace}
        onArchiveThread={(threadId) => void handleArchiveThread(threadId)}
        onCreateWorkspace={() => void handleCreateWorkspace()}
        onDeleteThread={(threadId) => void handleDeleteThread(threadId)}
        onNewThread={handleNewThread}
        onOpenInspector={() => setInspectorOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onSearchThreadsChange={setSearchThreads}
        onSelectThread={(threadId) => void syncThread(threadId)}
        onSelectWorkspace={(workspace) => void handleWorkspaceSwitch(workspace)}
        searchThreads={searchThreads}
        threads={visibleThreads}
        workspaces={workspaces}
      />

      <DesktopWorkspace
        activeCitations={activeCitations}
        activeThread={activeThread}
        activeWorkspace={activeWorkspace}
        attachments={attachments}
        contextItems={contextItems}
        contextResults={contextResults}
        exportPath={exportPath}
        inspectorOpen={inspectorOpen}
        isSubmitting={isSubmitting}
        mode={mode}
        onDropFiles={handleDropFiles}
        onExportThread={(format) => void handleExportThread(format)}
        onMentionSelect={handleMentionSelect}
        onModeChange={setMode}
        onOpenInspector={() => setInspectorOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onPickAttachments={() => void handlePickAttachments()}
        onQueryChange={setQuery}
        onRemoveAttachment={handleRemoveAttachment}
        onRemoveContextItem={handleRemoveContextItem}
        onSelectModel={handleSelectModel}
        onSubmit={() => void handleSubmit()}
        onToggleWebSearch={() => setWebSearch((current) => !current)}
        onUploadImages={() => void handlePickAttachments()}
        query={query}
        researchProgress={researchProgress}
        runtimeModels={runtimeModels}
        selectedModelId={selectedModelId}
        settingsNotice={settingsNotice}
        streamError={streamError}
        threadSources={threadSources}
        webSearch={webSearch}
      />

      <DesktopInspector
        citations={activeCitations}
        exportPath={exportPath}
        onClose={() => setInspectorOpen(false)}
        onEnsureRuntime={() => void handleEnsureRuntime()}
        open={inspectorOpen}
        researchProgress={researchProgress}
        runtimeBusy={runtimeBusy}
        runtimeStatus={runtimeStatus}
        sources={threadSources}
      />

      <DesktopSettingsPanel
        onClose={() => setSettingsOpen(false)}
        onEnsureRuntime={() => void handleEnsureRuntime()}
        onProbeRuntime={() => void handleProbeRuntime()}
        onRuntimeChange={setRuntimeDraft}
        onSave={() => void handleSaveSettings()}
        onSettingsChange={setSettingsDraft}
        open={settingsOpen}
        runtimeBusy={runtimeBusy}
        runtimeDraft={runtimeDraft}
        runtimeModels={runtimeModels}
        runtimeStatus={runtimeStatus}
        settingsBusy={settingsBusy}
        settingsDraft={settingsDraft}
        settingsNotice={settingsNotice}
      />
    </div>
  );
}
