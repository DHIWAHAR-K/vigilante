'use client';

import React, {
  ReactNode,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
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
  Message,
  ModelInfo,
  ModelInstallJob,
  OllamaRuntimeStatusInfo,
  QuerySubmission,
  QueryFinished,
  QueryMode,
  ResearchProgressEvent,
  RuntimeSnapshot,
  Theme,
  ThreadDetail,
  ThreadSummary,
  WebSource,
  Workspace,
  WorkspaceContextItem,
  cancelInstallJob,
  deleteThread,
  ensureRuntimeReady,
  exportWorkspaceThread,
  getActiveWorkspace,
  getInstallJob,
  getRuntimeSnapshot,
  getSettings,
  installModel,
  isDesktopApp,
  listModelCatalog,
  listThreadSources,
  listThreads,
  listenEvent,
  lookupContextItems,
  openThread,
  pickAttachmentFiles,
  selectModel,
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
} from '@/components/desktop-shell/utils';

interface DesktopShellProps {
  children?: ReactNode;
}

const ACTIVE_INSTALL_STATUSES = new Set(['queued', 'downloading', 'verifying']);
type DesktopEventStatus = 'idle' | 'registering' | 'ready' | 'failed';
type SubmissionRecoveryMode = 'events' | 'polling';

interface ActiveSubmissionState {
  startedAt: number;
  workspaceId: string;
  threadId: string | null;
  submittedQuery: string;
  pendingTitle: string;
  recoveryMode: SubmissionRecoveryMode;
}

export function DesktopShell({ children }: DesktopShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();

  const [isDesktop, setIsDesktop] = useState(false);
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
  const [activeInstallJobs, setActiveInstallJobs] = useState<ModelInstallJob[]>([]);
  const [desktopEventStatus, setDesktopEventStatus] = useState<DesktopEventStatus>('idle');
  const [activeSubmission, setActiveSubmission] = useState<ActiveSubmissionState | null>(null);

  const activeWorkspaceRef = useRef<Workspace | null>(null);
  const activeThreadRef = useRef<ThreadDetail | null>(null);
  const modeRef = useRef<QueryMode>(mode);
  const noticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    activeWorkspaceRef.current = activeWorkspace;
  }, [activeWorkspace]);

  useEffect(() => {
    activeThreadRef.current = activeThread;
  }, [activeThread]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const activeView = pathname.startsWith('/settings') ? 'settings' : 'chat';

  useEffect(() => {
    setSettingsNotice(null);
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
  }, [activeView]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

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
    (snapshot: RuntimeSnapshot, nextCatalog?: CatalogModel[]) => {
      setRuntimeStatus(snapshot.runtime);
      setRuntimeModels(snapshot.installedModels.length > 0 ? snapshot.installedModels : snapshot.runtime.models);
      setActiveInstallJobs(snapshot.activeInstallJobs);
      if (nextCatalog) setModelCatalog(nextCatalog);
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
    const [snapshot, catalog] = await Promise.all([getRuntimeSnapshot(), listModelCatalog()]);
    applyRuntimeSnapshot(snapshot, catalog);
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

      const currentThread = activeThreadRef.current;
      const currentThreadStillVisible = currentThread
        ? nextThreads.some((thread) => thread.id === currentThread.thread.id)
        : false;
      const nextActiveId =
        preferredThreadId ??
        (currentThreadStillVisible ? currentThread?.thread.id : undefined) ??
        nextThreads[0]?.id;

      if (nextActiveId) {
        await syncThread(nextActiveId);
      } else {
        setActiveThread(null);
        setThreadSources([]);
      }
    },
    [syncThread],
  );

  const hydrateDesktop = useCallback(async () => {
    try {
      const [workspace, nextSettings, snapshot, catalog] = await Promise.all([
        getActiveWorkspace(),
        getSettings(),
        getRuntimeSnapshot(),
        listModelCatalog(),
      ]);

      setActiveWorkspaceState(workspace);
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
      applyRuntimeSnapshot(snapshot, catalog);

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
    setDesktopEventStatus('registering');

    const finishActiveSubmission = (threadId: string) => {
      const workspace = activeWorkspaceRef.current;
      void syncThread(threadId);
      if (workspace) {
        void reloadThreads(workspace.id, threadId);
      }
      void refreshRuntimeState();
      setIsSubmitting(false);
      setResearchProgress(null);
      setActiveSubmission(null);
    };

    const registerDesktopEvents = async () => {
      unsubs.push(
        await listenEvent<QuerySubmission>('vigilante://assistant-started', (payload) => {
          if (disposed) return;
          setExportPath(null);
          setResearchProgress(null);
          setActiveSubmission((current) =>
            current && current.threadId === null ? { ...current, threadId: payload.threadId } : current,
          );
          void syncThread(payload.threadId);
          const workspace = activeWorkspaceRef.current;
          if (workspace) {
            void reloadThreads(workspace.id, payload.threadId);
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
                      mode: modeRef.current,
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
          finishActiveSubmission(payload.threadId);
        }),
      );

      if (!disposed) {
        setDesktopEventStatus('ready');
      }
    };

    void registerDesktopEvents().catch((error) => {
      if (!disposed) {
        console.error('Failed to register desktop events', error);
        setDesktopEventStatus('failed');
        setActiveSubmission((current) =>
          current ? { ...current, recoveryMode: 'polling' } : current,
        );
      }
    });

    return () => {
      disposed = true;
      unsubs.forEach((unsub) => unsub());
    };
  }, [isDesktop, refreshRuntimeState, reloadThreads, syncThread]);

  useEffect(() => {
    if (!activeSubmission || activeSubmission.recoveryMode !== 'polling') {
      return;
    }

    let disposed = false;
    let polling = false;

    const resolveThreadId = async () => {
      if (activeSubmission.threadId) {
        return activeSubmission.threadId;
      }

      const nextThreads = await listThreads(activeSubmission.workspaceId);
      const submittedAfter = activeSubmission.startedAt - 5_000;
      const matchingThread =
        nextThreads.find(
          (thread) =>
            (thread.preview === activeSubmission.submittedQuery ||
              thread.title === activeSubmission.pendingTitle) &&
            Date.parse(thread.updatedAt) >= submittedAfter,
        ) ?? null;

      if (matchingThread && !disposed) {
        setThreads(nextThreads);
        setActiveSubmission((current) =>
          current && current.startedAt === activeSubmission.startedAt
            ? { ...current, threadId: matchingThread.id }
            : current,
        );
      }

      return matchingThread?.id ?? null;
    };

    const pollSubmission = async () => {
      if (disposed || polling) {
        return;
      }

      polling = true;

      try {
        const threadId = await resolveThreadId();
        if (!threadId || disposed) {
          return;
        }

        const detail = await openThread(threadId);
        if (disposed) {
          return;
        }

        startTransition(() => {
          setActiveThread(detail);
        });

        const lastMessage = detail.messages.at(-1);
        if (lastMessage?.role === 'assistant' && lastMessage.isComplete) {
          const [sources, nextThreads] = await Promise.all([
            listThreadSources(threadId),
            listThreads(activeSubmission.workspaceId),
          ]);

          if (disposed) {
            return;
          }

          startTransition(() => {
            setThreadSources(sources);
            setThreads(nextThreads);
          });

          void refreshRuntimeState();
          setIsSubmitting(false);
          setResearchProgress(null);
          setActiveSubmission((current) =>
            current && current.startedAt === activeSubmission.startedAt ? null : current,
          );
        }
      } catch (error) {
        if (!disposed) {
          console.error('Failed to poll desktop submission', error);
        }
      } finally {
        polling = false;
      }
    };

    void pollSubmission();
    const interval = window.setInterval(() => {
      void pollSubmission();
    }, 700);

    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [activeSubmission, refreshRuntimeState]);

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

  function showNotice(message: string, durationMs = 4000) {
    setSettingsNotice(message);
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setSettingsNotice(null);
      noticeTimerRef.current = null;
    }, durationMs);
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
      showNotice('Drag and drop is not available in this build yet. Use the attach button instead.');
      return;
    }

    addAttachmentPaths(droppedPaths);
  }

  async function handleSubmit() {
    if (!activeWorkspace || !query.trim() || isSubmitting) return;

    const submittedQuery = query.trim();
    const currentThreadId = activeThread?.thread.id;
    const pendingThreadId =
      currentThreadId && currentThreadId !== 'pending-thread' ? currentThreadId : null;
    const submissionStartedAt = Date.now();
    const submissionRecoveryMode: SubmissionRecoveryMode =
      desktopEventStatus === 'ready' ? 'events' : 'polling';

    if (activeView === 'settings') {
      router.push('/');
    }

    setQuery('');
    setContextResults([]);
    setStreamError(null);
    setExportPath(null);
    setIsSubmitting(true);
    setInspectorOpen(false);
    setActiveSubmission({
      startedAt: submissionStartedAt,
      workspaceId: activeWorkspace.id,
      threadId: pendingThreadId,
      submittedQuery,
      pendingTitle: deriveTitle(submittedQuery),
      recoveryMode: submissionRecoveryMode,
    });

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
        threadId: pendingThreadId,
        query: submittedQuery,
        mode,
        webSearch,
        contextItems,
        attachments: [],
      });

      setActiveSubmission((current) =>
        current && current.startedAt === submissionStartedAt
          ? { ...current, threadId: submission.threadId }
          : current,
      );

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
      setIsSubmitting(false);
      setResearchProgress(null);
      setActiveSubmission((current) =>
        current && current.startedAt === submissionStartedAt ? null : current,
      );
      void refreshRuntimeState();
    } catch (error) {
      setIsSubmitting(false);
      setResearchProgress(null);
      setActiveSubmission((current) =>
        current && current.startedAt === submissionStartedAt ? null : current,
      );
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
      showNotice(
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
      showNotice(`Thread exported as ${format.toUpperCase()}.`);
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
      showNotice(`Model ready: ${persistedModelId}`);
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
      showNotice(`Downloading ${modelId} into Vigilante storage.`);
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
      showNotice('Model download cancelled.');
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
      showNotice('Appearance updated.');
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
            local workspaces, local models, and saved chats.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-bg-base text-text-primary">
      {children ? <div className="hidden">{children}</div> : null}

      <DesktopSidebar
        activeThreadId={activeThread?.thread.id ?? null}
        activeView={activeView}
        activeWorkspace={activeWorkspace}
        onDeleteThread={(threadId) => void handleDeleteThread(threadId)}
        onNewThread={handleNewThread}
        onOpenSettings={handleOpenSettings}
        onSearchThreadsChange={setSearchThreads}
        onSelectThread={(threadId) => void handleSelectThread(threadId)}
        searchThreads={searchThreads}
        threads={visibleThreads}
      />

      {activeView === 'settings' ? (
        <DesktopSettingsView
          activeInstallJobs={activeInstallJobs}
          modelCatalog={modelCatalog}
          onBackToChat={handleBackToChat}
          onCancelInstall={(jobId) => void handleCancelInstall(jobId)}
          onInstallModel={(modelId) => void handleInstallModel(modelId)}
          onSelectModel={(modelId) => void handleSelectModel(modelId)}
          onThemeChange={(theme) => void handleThemeChange(theme)}
          runtimeModels={runtimeModels}
          selectedModelId={selectedModelId}
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
