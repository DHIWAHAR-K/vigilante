'use client';

import React, {
  ReactNode,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Monitor } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

import {
  AppSettings,
  AssistantCitationsEvent,
  AssistantTokenEvent,
  CatalogModel,
  Citation,
  DesktopContextItem,
  EnsureReadyResult,
  ManagedRuntimeInfo,
  Message,
  ModelInfo,
  ModelInstallJob,
  OllamaRuntimeStatusInfo,
  QueryFinished,
  QueryMode,
  ResearchProgressEvent,
  RuntimeSnapshot,
  StorageInfo,
  Theme,
  ThreadDetail,
  ThreadSummary,
  WebSource,
  Workspace,
  WorkspaceContextItem,
  cancelInstallJob,
  createWorkspace,
  deleteThread,
  ensureRuntimeReady,
  exportWorkspaceThread,
  getActiveWorkspace,
  getInstallJob,
  getRuntimeSnapshot,
  getSettings,
  getStorageInfo,
  installModel,
  isDesktopApp,
  listModelCatalog,
  listThreadSources,
  listThreads,
  listWorkspaces,
  listenEvent,
  lookupContextItems,
  openThread,
  pickAttachmentFiles,
  pickWorkspaceDirectory,
  selectModel,
  setActiveWorkspace,
  submitDesktopQuery,
  updateSettings,
} from '@/lib/desktop/client';

import { DesktopInspector } from '@/components/desktop-shell/DesktopInspector';
import { DesktopSettingsView } from '@/components/desktop-shell/DesktopSettingsView';
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

interface DesktopShellProps {
  children?: ReactNode;
}

const ACTIVE_INSTALL_STATUSES = new Set(['queued', 'downloading', 'verifying']);

export function DesktopShell({ children }: DesktopShellProps) {
  const pathname = usePathname();
  const router = useRouter();
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
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<AppSettings | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<OllamaRuntimeStatusInfo | null>(null);
  const [runtimeModels, setRuntimeModels] = useState<ModelInfo[]>([]);
  const [runtimeBusy, setRuntimeBusy] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [researchProgress, setResearchProgress] = useState<ResearchProgressEvent | null>(null);
  const [modelCatalog, setModelCatalog] = useState<CatalogModel[]>([]);
  const [managedRuntime, setManagedRuntime] = useState<ManagedRuntimeInfo | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [activeInstallJobs, setActiveInstallJobs] = useState<ModelInstallJob[]>([]);

  const activeView = pathname.startsWith('/settings') ? 'settings' : 'chat';
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
    settingsDraft?.defaultProvider.modelId ?? runtimeStatus?.models[0]?.id ?? 'llama3.2:3b';

  const applyRuntimeSnapshot = useCallback(
    (snapshot: RuntimeSnapshot, nextCatalog?: CatalogModel[], nextStorageInfo?: StorageInfo) => {
      setRuntimeStatus(snapshot.runtime);
      setRuntimeModels(snapshot.installedModels.length > 0 ? snapshot.installedModels : snapshot.runtime.models);
      setManagedRuntime(snapshot.managedRuntime);
      setActiveInstallJobs(snapshot.activeInstallJobs);
      if (nextCatalog) setModelCatalog(nextCatalog);
      if (nextStorageInfo) setStorageInfo(nextStorageInfo);
      setSettingsDraft((current) =>
        current
          ? {
              ...current,
              defaultProvider: {
                ...current.defaultProvider,
                providerId: 'ollama',
                modelId: snapshot.selectedModelId ?? current.defaultProvider.modelId,
              },
            }
          : current,
      );
    },
    [],
  );

  const refreshRuntimeState = useCallback(async () => {
    const [snapshot, catalog, nextStorageInfo] = await Promise.all([
      getRuntimeSnapshot(),
      listModelCatalog(),
      getStorageInfo(),
    ]);
    applyRuntimeSnapshot(snapshot, catalog, nextStorageInfo);
    return snapshot;
  }, [applyRuntimeSnapshot]);

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
      const [workspace, workspaceList, nextSettings, snapshot, catalog, nextStorageInfo] =
        await Promise.all([
          getActiveWorkspace(),
          listWorkspaces(),
          getSettings(),
          getRuntimeSnapshot(),
          listModelCatalog(),
          getStorageInfo(),
        ]);

      setActiveWorkspaceState(workspace);
      setWorkspaces(workspaceList);
      setSettingsDraft({
        ...nextSettings,
        defaultProvider: {
          ...nextSettings.defaultProvider,
          providerId: 'ollama',
          modelId: snapshot.selectedModelId ?? nextSettings.defaultProvider.modelId,
        },
      });
      setWebSearch(nextSettings.search.enabledByDefault);
      setTheme(nextSettings.appearance.theme);
      applyRuntimeSnapshot(snapshot, catalog, nextStorageInfo);

      await reloadThreads(workspace.id);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to load desktop state');
    }
  }, [applyRuntimeSnapshot, reloadThreads, setTheme]);

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
          void refreshRuntimeState();
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
  }, [activeWorkspace, isDesktop, mode, refreshRuntimeState, reloadThreads, syncThread]);

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

  useEffect(() => {
    if (activeInstallJobs.length === 0) return;

    const interval = window.setInterval(() => {
      void Promise.all(activeInstallJobs.map((job) => getInstallJob(job.id)))
        .then((jobs) => {
          const nextJobs = jobs.filter((job): job is ModelInstallJob => job !== null);
          const pendingJobs = nextJobs.filter((job) => ACTIVE_INSTALL_STATUSES.has(job.status));
          setActiveInstallJobs(pendingJobs);

          if (nextJobs.some((job) => !ACTIVE_INSTALL_STATUSES.has(job.status))) {
            void refreshRuntimeState();
          }
        })
        .catch((error) => {
          setStreamError(error instanceof Error ? error.message : 'Failed to refresh model downloads');
        });
    }, 1200);

    return () => window.clearInterval(interval);
  }, [activeInstallJobs, refreshRuntimeState]);

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
      setSettingsNotice('Drag and drop is not available in this build yet. Use the attach button instead.');
      return;
    }

    addAttachmentPaths(droppedPaths);
  }

  async function handleSubmit() {
    if (!activeWorkspace || !query.trim() || isSubmitting) return;

    const submittedQuery = query.trim();
    const currentThreadId = activeThread?.thread.id;

    if (activeView === 'settings') {
      router.push('/');
    }

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

  async function handleEnsureRuntime() {
    setRuntimeBusy(true);
    setSettingsNotice(null);

    try {
      const result: EnsureReadyResult = await ensureRuntimeReady();
      setRuntimeStatus(result.runtime);
      setSettingsNotice(
        result.startOutcome
          ? `Runtime status: ${result.startOutcome.replaceAll('_', ' ')}`
          : 'Runtime checked.',
      );
      await refreshRuntimeState();
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to ensure runtime');
    } finally {
      setRuntimeBusy(false);
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

  async function handleSelectModel(modelId: string) {
    const previousModelId = settingsDraft?.defaultProvider.modelId ?? selectedModelId;
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

    try {
      const persistedModelId = await selectModel(modelId);
      setSettingsDraft((current) =>
        current
          ? {
              ...current,
              defaultProvider: {
                ...current.defaultProvider,
                providerId: 'ollama',
                modelId: persistedModelId,
              },
            }
          : current,
      );
      setSettingsNotice(`Model ready: ${persistedModelId}`);
      await refreshRuntimeState();
    } catch (error) {
      setSettingsDraft((current) =>
        current
          ? {
              ...current,
              defaultProvider: {
                ...current.defaultProvider,
                providerId: 'ollama',
                modelId: previousModelId,
              },
            }
          : current,
      );
      setStreamError(error instanceof Error ? error.message : 'Failed to select model');
    }
  }

  async function handleInstallModel(modelId: string) {
    try {
      const job = await installModel(modelId);
      setActiveInstallJobs((current) => {
        const next = current.filter((entry) => entry.modelId !== modelId);
        return [...next, job];
      });
      setSettingsNotice(`Downloading ${modelId} into Vigilante storage.`);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to start model download');
    }
  }

  async function handleCancelInstall(jobId: string) {
    try {
      const cancelledJob = await cancelInstallJob(jobId);
      setActiveInstallJobs((current) =>
        current.filter((job) => job.id !== jobId && job.id !== cancelledJob?.id),
      );
      setSettingsNotice('Model download cancelled.');
      await refreshRuntimeState();
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to cancel download');
    }
  }

  async function handleThemeChange(theme: Theme) {
    if (!settingsDraft) return;

    const previousTheme = settingsDraft.appearance.theme;
    const nextSettings: AppSettings = {
      ...settingsDraft,
      appearance: {
        ...settingsDraft.appearance,
        theme,
      },
    };

    setSettingsDraft(nextSettings);
    setTheme(theme);

    try {
      const saved = await updateSettings(nextSettings);
      setSettingsDraft(saved);
      setTheme(saved.appearance.theme);
      setSettingsNotice('Appearance updated.');
    } catch (error) {
      setSettingsDraft((current) =>
        current
          ? {
              ...current,
              appearance: {
                ...current.appearance,
                theme: previousTheme,
              },
            }
          : current,
      );
      setTheme(previousTheme);
      setStreamError(error instanceof Error ? error.message : 'Failed to update theme');
    }
  }

  function handleNewThread() {
    setActiveThread(null);
    setThreadSources([]);
    setExportPath(null);
    setResearchProgress(null);
    setQuery('');
    setStreamError(null);
    resetComposerState();
    router.push('/');
  }

  function handleOpenSettings() {
    router.push('/settings');
  }

  function handleBackToChat() {
    router.push('/');
  }

  async function handleSelectThread(threadId: string) {
    await syncThread(threadId);
    if (activeView !== 'chat') {
      router.push('/');
    }
  }

  if (!isDesktop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base px-8 text-text-primary">
        <div className="desktop-panel max-w-xl rounded-[32px] p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Monitor className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-[34px] tracking-[-0.03em] text-[#f1e8df]">Desktop only</h1>
          <p className="mt-3 text-[14px] text-text-secondary">
            Vigilante now supports the Tauri desktop shell only. Launch the desktop app to use
            local workspaces, managed models, and saved chats.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-bg-base text-text-primary">
      {children ? <div className="hidden">{children}</div> : null}

      <DesktopSidebar
        activeThreadId={activeThread?.thread.id ?? null}
        activeView={activeView}
        activeWorkspace={activeWorkspace}
        onCreateWorkspace={() => void handleCreateWorkspace()}
        onDeleteThread={(threadId) => void handleDeleteThread(threadId)}
        onNewThread={handleNewThread}
        onOpenSettings={handleOpenSettings}
        onSearchThreadsChange={setSearchThreads}
        onSelectThread={(threadId) => void handleSelectThread(threadId)}
        onSelectWorkspace={(workspace) => void handleWorkspaceSwitch(workspace)}
        searchThreads={searchThreads}
        threads={visibleThreads}
        workspaces={workspaces}
      />

      {activeView === 'settings' ? (
        <DesktopSettingsView
          activeInstallJobs={activeInstallJobs}
          managedRuntime={managedRuntime}
          modelCatalog={modelCatalog}
          onBackToChat={handleBackToChat}
          onCancelInstall={(jobId) => void handleCancelInstall(jobId)}
          onEnsureRuntime={() => void handleEnsureRuntime()}
          onInstallModel={(modelId) => void handleInstallModel(modelId)}
          onSelectModel={(modelId) => void handleSelectModel(modelId)}
          onThemeChange={(theme) => void handleThemeChange(theme)}
          runtimeModels={runtimeModels}
          runtimeBusy={runtimeBusy}
          runtimeStatus={runtimeStatus}
          selectedModelId={selectedModelId}
          storageInfo={storageInfo}
          theme={settingsDraft?.appearance.theme ?? 'system'}
        />
      ) : (
        <DesktopWorkspace
          activeThread={activeThread}
          activeWorkspace={activeWorkspace}
          attachments={attachments}
          contextItems={contextItems}
          contextResults={contextResults}
          exportPath={exportPath}
          isSubmitting={isSubmitting}
          mode={mode}
          onDropFiles={handleDropFiles}
          onExportThread={(format) => void handleExportThread(format)}
          onMentionSelect={handleMentionSelect}
          onModeChange={setMode}
          onOpenSettings={handleOpenSettings}
          onPickAttachments={() => void handlePickAttachments()}
          onQueryChange={setQuery}
          onRemoveAttachment={handleRemoveAttachment}
          onRemoveContextItem={handleRemoveContextItem}
          onSelectModel={(modelId) => void handleSelectModel(modelId)}
          onSubmit={() => void handleSubmit()}
          onToggleWebSearch={() => setWebSearch((current) => !current)}
          onUploadImages={() => void handlePickAttachments()}
          query={query}
          researchProgress={researchProgress}
          runtimeModels={runtimeModels}
          selectedModelId={selectedModelId}
          settingsNotice={settingsNotice}
          streamError={streamError}
          webSearch={webSearch}
        />
      )}

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
    </div>
  );
}
