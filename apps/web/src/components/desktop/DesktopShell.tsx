'use client';

import { useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from 'next-themes';

import {
  type AppSettings,
  type AssistantCitationsEvent,
  type AssistantTokenEvent,
  type Citation,
  type ComposerAttachment,
  type DesktopContextItem,
  type DraftContextItem,
  type DraftThread,
  type EnsureReadyResult,
  type Message,
  type OllamaRuntimeStatusInfo,
  type QueryFinished,
  type QueryMode,
  type ResearchProgressEvent,
  type RuntimeSettings,
  type StorageInfo,
  type ThreadDetail,
  type ThreadSummary,
  type WebSource,
  type Workspace,
  type WorkspaceContextItem,
  archiveThread,
  createDraft,
  createWorkspace,
  deleteThread,
  ensureRuntimeReady,
  exportWorkspaceThread,
  getActiveWorkspace,
  getCachedRuntimeStatus,
  getDraft,
  getRuntimeConfig,
  getSettings,
  getStorageInfo,
  importAttachments,
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
  removeAttachment,
  saveDraft,
  setActiveWorkspace,
  submitDesktopQuery,
  updateSettings,
} from '@/lib/desktop/client';
import { DesktopInspector } from '@/components/desktop-shell/DesktopInspector';
import { DesktopOnboarding } from '@/components/desktop-shell/DesktopOnboarding';
import {
  DesktopSettingsPanel,
  type DesktopSettingsSnapshot,
} from '@/components/desktop-shell/DesktopSettingsPanel';
import { DesktopSidebar } from '@/components/desktop-shell/DesktopSidebar';
import { DesktopWorkspace } from '@/components/desktop-shell/DesktopWorkspace';
import { deriveTitle, inferWorkspaceName } from '@/components/desktop-shell/utils';

const ACTIVE_DRAFT_KEY = 'vigilante.active_draft_id';

function buildContextItem(item: WorkspaceContextItem): DesktopContextItem {
  if (item.mcpAction) {
    return {
      id: item.id,
      kind: 'text',
      title: item.title,
      path: null,
      value: null,
      source: item.source ?? null,
      mcpAction: item.mcpAction,
    };
  }

  return {
    id: item.id,
    kind:
      item.kind === 'directory'
        ? 'directory'
        : item.kind === 'thread'
          ? 'text'
          : item.kind === 'url'
            ? 'url'
            : 'file',
    title: item.title,
    path: item.path,
    value:
      item.kind === 'thread'
        ? item.value ?? item.subtitle ?? item.title
        : item.kind === 'url'
          ? item.value ?? item.path ?? item.title
          : item.value ?? null,
    source: item.source ?? null,
    mcpAction: item.mcpAction ?? null,
  };
}

function desktopContextToDraftContext(item: DesktopContextItem): DraftContextItem {
  return {
    kind: item.kind === 'url' ? 'url' : item.kind === 'text' ? 'clipboard_text' : 'file_ref',
    label: item.title,
    value: item.value ?? item.path ?? item.title,
  };
}

function draftContextToDesktopContext(item: DraftContextItem, index: number): DesktopContextItem {
  return {
    id: `draft-context-${index}-${item.label}`,
    kind: item.kind === 'url' ? 'url' : item.kind === 'clipboard_text' ? 'text' : 'file',
    title: item.label,
    value: item.value,
    path: item.kind === 'file_ref' ? item.value : null,
  };
}

export function DesktopShell() {
  const { setTheme } = useTheme();
  const dragDepth = useRef(0);

  const [isDesktop, setIsDesktop] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(1440);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThread, setActiveThread] = useState<ThreadDetail | null>(null);
  const [draft, setDraft] = useState<DraftThread | null>(null);
  const [threadSources, setThreadSources] = useState<WebSource[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<QueryMode>('ask');
  const [webSearch, setWebSearch] = useState(true);
  const [contextItems, setContextItems] = useState<DesktopContextItem[]>([]);
  const [contextResults, setContextResults] = useState<WorkspaceContextItem[]>([]);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [searchThreads, setSearchThreads] = useState('');

  const [streamError, setStreamError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [researchProgress, setResearchProgress] = useState<ResearchProgressEvent | null>(null);

  const [settingsDraft, setSettingsDraft] = useState<AppSettings | null>(null);
  const [runtimeDraft, setRuntimeDraft] = useState<RuntimeSettings | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<OllamaRuntimeStatusInfo | null>(null);
  const [runtimeBusy, setRuntimeBusy] = useState(false);
  const [runtimeModels, setRuntimeModels] = useState<Awaited<ReturnType<typeof listRuntimeModels>>>([]);

  useEffect(() => {
    setIsDesktop(isDesktopApp());
    setViewportWidth(window.innerWidth);
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarCompact = viewportWidth < 1100 || settingsDraft?.appearance.sidebarCollapsed === true;
  const inspectorAsDrawer = viewportWidth < 1280;
  const [inspectorOpen, setInspectorOpen] = useState(!inspectorAsDrawer);

  useEffect(() => {
    if (!inspectorAsDrawer) {
      setInspectorOpen(true);
    }
  }, [inspectorAsDrawer]);

  const visibleThreads = useMemo(() => {
    if (!searchThreads.trim()) return threads;
    const search = searchThreads.toLowerCase();
    return threads.filter(
      (thread) =>
        thread.title.toLowerCase().includes(search) || thread.preview.toLowerCase().includes(search),
    );
  }, [searchThreads, threads]);

  const activeCitations = useMemo<Citation[]>(() => {
    const lastAssistant = [...(activeThread?.messages ?? [])]
      .reverse()
      .find((message) => message.role === 'assistant' && message.citations.length > 0);
    return lastAssistant?.citations ?? [];
  }, [activeThread]);

  const selectedModelId =
    runtimeDraft?.defaultModel ?? settingsDraft?.defaultProvider.modelId ?? 'llama3.2';

  useEffect(() => {
    if (settingsDraft) {
      setTheme(settingsDraft.appearance.theme);
    }
  }, [settingsDraft, setTheme]);

  useEffect(() => {
    if (!isDesktop) return;
    void hydrateDesktop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          if (!disposed) {
            setResearchProgress(payload);
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    }, 140);

    return () => window.clearTimeout(handle);
  }, [activeWorkspace, query]);

  useEffect(() => {
    if (activeThread || !draft) return;

    const handle = window.setTimeout(() => {
      void saveDraft(
        draft.id,
        query,
        contextItems
          .filter((item) => !item.mcpAction)
          .map(desktopContextToDraftContext),
      )
        .then((saved) => {
          setDraft((current) => (current && current.id === saved.id ? saved : current));
        })
        .catch(() => {
          // Autosave failures should not block typing.
        });
    }, 220);

    return () => window.clearTimeout(handle);
  }, [activeThread, contextItems, draft, query]);

  async function hydrateDesktop() {
    setIsHydrating(true);
    try {
      const [
        workspace,
        workspaceList,
        nextSettings,
        nextRuntime,
        nextRuntimeStatus,
        nextModels,
        nextStorageInfo,
      ] = await Promise.all([
        getActiveWorkspace(),
        listWorkspaces(),
        getSettings(),
        getRuntimeConfig(),
        getCachedRuntimeStatus(),
        listRuntimeModels(),
        getStorageInfo(),
      ]);

      const restoredDraft = await restoreDraft();

      setActiveWorkspaceState(workspace);
      setWorkspaces(workspaceList);
      setSettingsDraft(nextSettings);
      setRuntimeDraft({
        ...nextRuntime,
        defaultModel: nextRuntime.defaultModel ?? nextSettings.defaultProvider.modelId,
      });
      setRuntimeStatus(nextRuntimeStatus);
      setRuntimeModels(nextModels.length > 0 ? nextModels : nextRuntimeStatus.models);
      setStorageInfo(nextStorageInfo);
      setWebSearch(nextSettings.search.enabledByDefault);
      setShowOnboarding(!nextSettings.hasCompletedOnboarding);

      const nextThreads = await listThreads(workspace.id);
      setThreads(nextThreads);

      const hasRestoredDraft =
        restoredDraft &&
        (restoredDraft.inputText.trim().length > 0 ||
          restoredDraft.attachments.length > 0 ||
          restoredDraft.contextItems.length > 0);

      if (hasRestoredDraft) {
        activateDraft(restoredDraft);
      } else if (nextThreads[0]) {
        await syncThread(nextThreads[0].id);
      } else {
        setActiveThread(null);
        setThreadSources([]);
        setContextItems([]);
        setAttachments([]);
        setQuery('');
      }
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to load desktop state');
    } finally {
      setIsHydrating(false);
    }
  }

  async function restoreDraft() {
    if (typeof window === 'undefined') return null;
    const draftId = window.localStorage.getItem(ACTIVE_DRAFT_KEY);
    if (!draftId) {
      setDraft(null);
      return null;
    }

    try {
      const existingDraft = await getDraft(draftId);
      setDraft(existingDraft);
      return existingDraft;
    } catch {
      window.localStorage.removeItem(ACTIVE_DRAFT_KEY);
      setDraft(null);
      return null;
    }
  }

  function activateDraft(nextDraft: DraftThread) {
    setDraft(nextDraft);
    setActiveThread(null);
    setThreadSources([]);
    setQuery(nextDraft.inputText);
    setContextItems(nextDraft.contextItems.map(draftContextToDesktopContext));
    setAttachments(nextDraft.attachments);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_DRAFT_KEY, nextDraft.id);
    }
  }

  async function ensureDraftRecord() {
    if (draft) return draft;

    const provider = settingsDraft?.defaultProvider ?? {
      providerId: 'ollama',
      modelId: selectedModelId,
    };
    const created = await createDraft(provider);
    setDraft(created);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_DRAFT_KEY, created.id);
    }
    return created;
  }

  async function reloadThreads(workspaceId: string, preferredThreadId?: string) {
    const nextThreads = await listThreads(workspaceId);
    setThreads(nextThreads);

    if (!activeThread && draft) {
      return;
    }

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
      const [detail, sources] = await Promise.all([openThread(threadId), listThreadSources(threadId)]);
      setActiveThread(detail);
      setThreadSources(sources);
      setAttachments(detail.attachments);
      setContextItems([]);
      setContextResults([]);
      setQuery('');
      setDraft((current) => current);
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
      await reloadThreads(workspace.id);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to create workspace');
    }
  }

  async function handleNewThread() {
    try {
      const nextDraft = draft ?? (await ensureDraftRecord());
      activateDraft(nextDraft);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to create draft');
    }
  }

  async function handleImportAttachmentPaths(candidatePaths?: string[]) {
    try {
      const paths = candidatePaths ?? (await pickAttachmentFiles());
      if (!paths.length) return;

      const ownerId = activeThread?.thread.id ?? (await ensureDraftRecord()).id;
      const imported = await importAttachments(ownerId, paths);
      setAttachments(imported);

      if (activeThread) {
        setActiveThread((current) => (current ? { ...current, attachments: imported } : current));
      } else {
        setDraft((current) =>
          current ? { ...current, attachments: imported, updatedAt: new Date().toISOString() } : current,
        );
      }
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to import attachments');
    }
  }

  async function handleRemoveAttachment(attachmentId: string) {
    try {
      const ownerId = activeThread?.thread.id ?? draft?.id;
      if (!ownerId) return;
      await removeAttachment(ownerId, attachmentId);
      const nextAttachments = attachments.filter((attachment) => attachment.id !== attachmentId);
      setAttachments(nextAttachments);
      if (activeThread) {
        setActiveThread((current) => (current ? { ...current, attachments: nextAttachments } : current));
      } else {
        setDraft((current) =>
          current
            ? { ...current, attachments: nextAttachments, updatedAt: new Date().toISOString() }
            : current,
        );
      }
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to remove attachment');
    }
  }

  async function handleSubmit() {
    if (!activeWorkspace || !query.trim() || isSubmitting) return;

    const submittedQuery = query.trim();
    const submitContextItems = [...contextItems];
    const submitAttachments = [...attachments];
    const previousDraft = draft;
    const previousThread = activeThread;
    let workingDraft = previousDraft;

    setStreamError(null);
    setExportPath(null);
    setResearchProgress(null);
    setIsSubmitting(true);
    setContextResults([]);
    setContextItems([]);
    setQuery('');

    const optimisticUserMessage: Message = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: submittedQuery,
      citations: [],
      followUps: [],
      mode,
      modelUsed: null,
      isComplete: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let draftId: string | null = null;
    if (!activeThread) {
      const ensuredDraft = previousDraft ?? (await ensureDraftRecord());
      workingDraft = ensuredDraft;
      draftId = ensuredDraft.id;
      setActiveThread({
        thread: {
          id: draftId,
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
        attachments: submitAttachments,
      });
      setThreadSources([]);
      setDraft(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ACTIVE_DRAFT_KEY);
      }
    } else {
      setActiveThread({
        ...activeThread,
        messages: [...activeThread.messages, optimisticUserMessage],
      });
    }

    try {
      await submitDesktopQuery({
        workspaceId: activeWorkspace.id,
        threadId: activeThread?.thread.id ?? null,
        draftId,
        query: submittedQuery,
        mode,
        webSearch,
        contextItems: submitContextItems,
        attachments: submitAttachments,
      });
    } catch (error) {
      setIsSubmitting(false);
      setStreamError(error instanceof Error ? error.message : 'Failed to submit query');
      setQuery(submittedQuery);
      setContextItems(submitContextItems);
      setAttachments(submitAttachments);
      setActiveThread(previousThread);
      if (!previousThread && workingDraft) {
        activateDraft(workingDraft);
      }
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

  async function handleEnsureRuntime() {
    setRuntimeBusy(true);
    try {
      const result: EnsureReadyResult = await ensureRuntimeReady();
      setRuntimeStatus(result.runtime);
      setRuntimeModels(result.runtime.models);
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
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to export thread');
    }
  }

  async function handleCompleteOnboarding() {
    if (!settingsDraft) {
      setShowOnboarding(false);
      return;
    }

    try {
      const saved = await updateSettings({
        ...settingsDraft,
        hasCompletedOnboarding: true,
        defaultProvider: {
          ...settingsDraft.defaultProvider,
          providerId: 'ollama',
          modelId: selectedModelId,
        },
      });
      setSettingsDraft(saved);
      setShowOnboarding(false);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to finish onboarding');
    }
  }

  function handleSettingsSaved(snapshot: DesktopSettingsSnapshot) {
    setSettingsDraft(snapshot.settings);
    setRuntimeDraft(snapshot.runtime);
    setRuntimeStatus(snapshot.runtimeStatus);
    setRuntimeModels(snapshot.runtimeModels);
    setStorageInfo(snapshot.storageInfo);
    setWebSearch(snapshot.settings.search.enabledByDefault);
  }

  function handleDragEnter() {
    dragDepth.current += 1;
    setIsDraggingFiles(true);
  }

  function handleDragLeave() {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setIsDraggingFiles(false);
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setIsDraggingFiles(false);

    const droppedPaths = Array.from(event.dataTransfer.files)
      .map((file) => (file as File & { path?: string }).path)
      .filter((value): value is string => Boolean(value));

    if (droppedPaths.length > 0) {
      void handleImportAttachmentPaths(droppedPaths);
    } else {
      setStreamError('Drag and drop did not expose local file paths. Use Upload instead.');
    }
  }

  if (!isDesktop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base px-8 text-text-primary">
        <div className="desktop-card max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-text-primary">
            Vigilante Desktop
          </h1>
          <p className="mt-4 text-base leading-7 text-text-secondary">
            This UI now expects to run inside the Tauri desktop shell. Start it with `pnpm tauri dev`
            to use local workspaces, drafts, attachments, and saved research threads.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-bg-base text-text-primary">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(244,173,82,0.12),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_22%)]" />

      <div className="relative flex h-full w-full overflow-hidden">
        <DesktopSidebar
          compact={sidebarCompact}
          searchValue={searchThreads}
          onSearchValueChange={setSearchThreads}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspace?.id}
          threads={visibleThreads}
          activeThreadId={activeThread?.thread.id ?? null}
          onWorkspaceSelect={(workspace) => void handleWorkspaceSwitch(workspace)}
          onCreateWorkspace={() => void handleCreateWorkspace()}
          onThreadOpen={(threadId) => void syncThread(threadId)}
          onThreadArchive={(threadId) => void handleArchiveThread(threadId)}
          onThreadDelete={(threadId) => void handleDeleteThread(threadId)}
          onNewThread={() => void handleNewThread()}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleCompact={() =>
            setSettingsDraft((current) =>
              current
                ? {
                    ...current,
                    appearance: {
                      ...current.appearance,
                      sidebarCollapsed: !current.appearance.sidebarCollapsed,
                    },
                  }
                : current,
            )
          }
        />

        <DesktopWorkspace
          activeWorkspace={activeWorkspace}
          activeThread={activeThread}
          query={query}
          mode={mode}
          webSearch={webSearch}
          contextItems={contextItems}
          contextResults={contextResults}
          attachments={attachments}
          researchProgress={researchProgress}
          isSubmitting={isSubmitting}
          streamError={streamError}
          draftActive={!activeThread}
          inspectorVisible={inspectorOpen}
          dragActive={isDraggingFiles}
          onQueryChange={setQuery}
          onModeChange={setMode}
          onWebSearchChange={setWebSearch}
          onSubmit={() => void handleSubmit()}
          onRemoveContextItem={(id) =>
            setContextItems((current) => current.filter((item) => item.id !== id))
          }
          onMentionSelect={handleMentionSelect}
          onUploadClick={() => void handleImportAttachmentPaths()}
          onRemoveAttachment={(attachmentId) => void handleRemoveAttachment(attachmentId)}
          onToggleInspector={() => setInspectorOpen((current) => !current)}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />

        <AnimatePresence>
          {inspectorOpen && !inspectorAsDrawer && (
            <DesktopInspector
              activeThread={activeThread}
              citations={activeCitations}
              attachments={attachments}
              threadSources={threadSources}
              runtimeStatus={runtimeStatus}
              researchProgress={researchProgress}
              exportPath={exportPath}
              onExportMarkdown={() => void handleExportThread('md')}
              onExportJson={() => void handleExportThread('json')}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {inspectorOpen && inspectorAsDrawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex justify-end bg-black/35 backdrop-blur-sm"
            onClick={() => setInspectorOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 28 }}
              className="h-full w-full max-w-[380px]"
              onClick={(event) => event.stopPropagation()}
            >
              <DesktopInspector
                activeThread={activeThread}
                citations={activeCitations}
                attachments={attachments}
                threadSources={threadSources}
                runtimeStatus={runtimeStatus}
                researchProgress={researchProgress}
                exportPath={exportPath}
                onExportMarkdown={() => void handleExportThread('md')}
                onExportJson={() => void handleExportThread('json')}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <DesktopSettingsPanel
            onClose={() => setSettingsOpen(false)}
            onSaved={handleSettingsSaved}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOnboarding && !isHydrating && (
          <DesktopOnboarding
            open={showOnboarding}
            workspace={activeWorkspace}
            runtimeStatus={runtimeStatus}
            runtimeModels={runtimeModels}
            selectedModelId={selectedModelId}
            storageInfo={storageInfo}
            runtimeBusy={runtimeBusy}
            onEnsureRuntime={() => void handleEnsureRuntime()}
            onSelectModel={(modelId) => {
              setRuntimeDraft((current) => (current ? { ...current, defaultModel: modelId } : current));
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
            onComplete={() => void handleCompleteOnboarding()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
