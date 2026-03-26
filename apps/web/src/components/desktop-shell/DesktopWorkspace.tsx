'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, PanelRightOpen, Settings2, Sparkles } from 'lucide-react';

import {
  Citation,
  DesktopContextItem,
  Message,
  ModelInfo,
  QueryMode,
  ResearchProgressEvent,
  ThreadDetail,
  WebSource,
  Workspace,
  WorkspaceContextItem,
} from '@/lib/desktop/client';
import { cn } from '@/lib/utils';

import { PendingAttachment } from './types';
import { DesktopComposer } from './DesktopComposer';

interface DesktopWorkspaceProps {
  activeCitations: Citation[];
  activeThread: ThreadDetail | null;
  activeWorkspace: Workspace | null;
  attachments: PendingAttachment[];
  contextItems: DesktopContextItem[];
  contextResults: WorkspaceContextItem[];
  exportPath: string | null;
  inspectorOpen: boolean;
  isSubmitting: boolean;
  mode: QueryMode;
  onExportThread: (format: 'md' | 'json') => void;
  onMentionSelect: (item: WorkspaceContextItem) => void;
  onModeChange: (mode: QueryMode) => void;
  onOpenInspector: () => void;
  onOpenSettings: () => void;
  onPickAttachments: () => void;
  onQueryChange: (value: string) => void;
  onRemoveAttachment: (id: string) => void;
  onRemoveContextItem: (id: string) => void;
  onSelectModel: (modelId: string) => void;
  onSubmit: () => void;
  onToggleWebSearch: () => void;
  onUploadImages: () => void;
  onDropFiles: (files: FileList) => void;
  query: string;
  researchProgress: ResearchProgressEvent | null;
  runtimeModels: ModelInfo[];
  selectedModelId: string;
  settingsNotice: string | null;
  streamError: string | null;
  threadSources: WebSource[];
  webSearch: boolean;
}

function renderMessage(message: Message) {
  const isAssistant = message.role === 'assistant';

  return (
    <motion.article
      key={message.id}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'py-2',
        isAssistant
          ? 'px-0'
          : 'ml-auto max-w-[85%] rounded-xl border border-border-subtle bg-bg-elevated px-4 py-3',
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-text-muted">
        <span>{isAssistant ? 'Assistant' : 'You'}</span>
        {isAssistant && !message.isComplete && <span className="text-accent">Streaming</span>}
      </div>

      <div className="whitespace-pre-wrap text-[14px] leading-7 text-text-primary">
        {message.content || (isAssistant ? 'Thinking…' : '')}
      </div>

      {message.citations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {message.citations.map((citation) => (
            <a
              key={citation.id}
              href={citation.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border-subtle bg-bg-surface px-2.5 py-1 text-[11px] text-text-secondary transition hover:text-text-primary"
            >
              [{citation.index}] {citation.title}
            </a>
          ))}
        </div>
      )}
    </motion.article>
  );
}

export function DesktopWorkspace({
  activeCitations,
  activeThread,
  activeWorkspace,
  attachments,
  contextItems,
  contextResults,
  exportPath,
  inspectorOpen,
  isSubmitting,
  mode,
  onExportThread,
  onMentionSelect,
  onModeChange,
  onOpenInspector,
  onOpenSettings,
  onPickAttachments,
  onQueryChange,
  onRemoveAttachment,
  onRemoveContextItem,
  onSelectModel,
  onSubmit,
  onToggleWebSearch,
  onUploadImages,
  onDropFiles,
  query,
  researchProgress,
  runtimeModels,
  selectedModelId,
  settingsNotice,
  streamError,
  threadSources,
  webSearch,
}: DesktopWorkspaceProps) {
  const hasMessages = (activeThread?.messages.length ?? 0) > 0;
  const inspectorAvailable =
    Boolean(activeThread) || activeCitations.length > 0 || threadSources.length > 0;

  return (
    <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-bg-base">
      <div className="relative flex items-center justify-between border-b border-border-subtle px-8 py-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted">Workspace</p>
          <p className="mt-1 truncate text-[13px] text-text-primary">
            {activeWorkspace?.name ?? 'Local workspace'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenInspector}
            disabled={!inspectorAvailable}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-elevated text-text-secondary transition hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            title="Sources"
          >
            <PanelRightOpen className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onOpenSettings}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-elevated text-text-secondary transition hover:text-text-primary"
            title="Settings"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onExportThread('md')}
            disabled={!activeThread}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-elevated text-text-secondary transition hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            title="Export"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!hasMessages ? (
          <motion.section
            key="desktop-home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="relative flex flex-1 items-center justify-center overflow-y-auto px-6 pb-24 pt-10"
          >
            <div className="w-full max-w-[860px]">
              <h1 className="mb-2 text-center text-[28px] font-medium tracking-[-0.02em] text-text-primary">
                Start a conversation
              </h1>
              <p className="mx-auto mb-7 max-w-[620px] text-center text-[14px] text-text-secondary">
                Ask a question, attach files, or mention workspace context.
              </p>

              <DesktopComposer
                attachments={attachments}
                contextItems={contextItems}
                contextResults={contextResults}
                isSubmitting={isSubmitting}
                mode={mode}
                onDropFiles={onDropFiles}
                onMentionSelect={onMentionSelect}
                onModeChange={onModeChange}
                onPickAttachments={onPickAttachments}
                onQueryChange={onQueryChange}
                onRemoveAttachment={onRemoveAttachment}
                onRemoveContextItem={onRemoveContextItem}
                onSelectModel={onSelectModel}
                onSubmit={onSubmit}
                onToggleWebSearch={onToggleWebSearch}
                onUploadImages={onUploadImages}
                query={query}
                runtimeModels={runtimeModels}
                selectedModelId={selectedModelId}
                webSearch={webSearch}
              />

              <AnimatePresence initial={false}>
                {(streamError || settingsNotice) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="mx-auto mt-4 max-w-[720px] rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 text-center text-[12px] text-text-secondary"
                  >
                    {streamError ?? settingsNotice}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="desktop-thread"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative flex min-h-0 flex-1 flex-col"
          >
            <div className="desktop-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-6">
              <div className="mx-auto w-full max-w-[860px]">
                <div className="mb-5">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted">Thread</p>
                  <h1 className="mt-2 text-[20px] font-medium tracking-[-0.02em] text-text-primary">
                    {activeThread?.thread.title ?? 'Untitled thread'}
                  </h1>
                </div>

                <AnimatePresence initial={false}>
                  {researchProgress && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mb-4 rounded-md border border-accent/20 bg-accent/10 px-3 py-2"
                    >
                      <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-accent">
                        <Sparkles className="h-3.5 w-3.5" />
                        {researchProgress.phase.replaceAll('_', ' ')}
                      </div>
                      <p className="text-[13px] text-text-primary">{researchProgress.message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3">
                  {activeThread?.messages.map((message) => renderMessage(message))}
                </div>

                <AnimatePresence initial={false}>
                  {(streamError || settingsNotice || exportPath) && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mt-5 rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 text-[12px] text-text-secondary"
                    >
                      {streamError ?? settingsNotice ?? exportPath}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="border-t border-border-subtle px-0 py-5">
              <DesktopComposer
                attachments={attachments}
                compact
                contextItems={contextItems}
                contextResults={contextResults}
                isSubmitting={isSubmitting}
                mode={mode}
                onDropFiles={onDropFiles}
                onMentionSelect={onMentionSelect}
                onModeChange={onModeChange}
                onPickAttachments={onPickAttachments}
                onQueryChange={onQueryChange}
                onRemoveAttachment={onRemoveAttachment}
                onRemoveContextItem={onRemoveContextItem}
                onSelectModel={onSelectModel}
                onSubmit={onSubmit}
                onToggleWebSearch={onToggleWebSearch}
                onUploadImages={onUploadImages}
                query={query}
                runtimeModels={runtimeModels}
                selectedModelId={selectedModelId}
                webSearch={webSearch}
              />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {!inspectorOpen && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-bg-base to-transparent" />
      )}
    </main>
  );
}
