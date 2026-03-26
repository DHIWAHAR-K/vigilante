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
import { modeLabel, resolveGreeting } from './utils';

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-[28px] border px-5 py-4 shadow-[0_24px_48px_rgba(0,0,0,0.12)]',
        isAssistant
          ? 'border-white/8 bg-white/[0.035]'
          : 'border-accent/16 bg-accent/[0.07]',
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-text-muted">
        <span>{isAssistant ? 'Assistant' : 'You'}</span>
        {isAssistant && !message.isComplete && <span className="text-accent">Streaming</span>}
        {message.modelUsed?.modelId && (
          <span className="rounded-full border border-white/8 bg-white/4 px-2 py-1 tracking-normal normal-case">
            {message.modelUsed.modelId}
          </span>
        )}
      </div>

      <div className="whitespace-pre-wrap text-[14px] leading-7 text-text-primary">
        {message.content || (isAssistant ? 'Thinking…' : '')}
      </div>

      {message.citations.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {message.citations.map((citation) => (
            <a
              key={citation.id}
              href={citation.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-text-secondary transition hover:text-text-primary"
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
    Boolean(activeThread) || activeCitations.length > 0 || threadSources.length > 0 || Boolean(exportPath);

  return (
    <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[18%] top-[10%] h-64 w-64 rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute bottom-[12%] right-[10%] h-72 w-72 rounded-full bg-white/[0.04] blur-[140px]" />
      </div>

      <div className="relative flex items-center justify-between px-6 py-5">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Workspace</p>
          <p className="mt-1 truncate text-[13px] text-text-secondary">
            {activeWorkspace?.name ?? 'Local workspace'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenInspector}
            disabled={!inspectorAvailable}
            className="desktop-pill disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PanelRightOpen className="h-3.5 w-3.5" />
            Sources
          </button>
          <button
            onClick={() => onExportThread('md')}
            disabled={!activeThread}
            className="desktop-pill disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button onClick={onOpenSettings} className="desktop-pill">
            <Settings2 className="h-3.5 w-3.5" />
            Settings
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!hasMessages ? (
          <motion.section
            key="desktop-home"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="relative flex flex-1 items-center justify-center overflow-y-auto px-6 pb-24 pt-8"
          >
            <div className="w-full max-w-[760px]">
              <div className="mb-5 flex justify-center">
                <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1 text-[11px] text-text-secondary shadow-[0_18px_40px_rgba(0,0,0,0.15)]">
                  All chats and sources stay on this device
                </span>
              </div>

              <div className="mb-7 flex items-center justify-center gap-3">
                <span className="text-[28px] text-accent">✺</span>
                <h1 className="font-serif text-[46px] font-medium tracking-[-0.03em] text-[#f1e8df] sm:text-[54px]">
                  {resolveGreeting()}
                </h1>
              </div>

              <p className="mx-auto mb-7 max-w-[540px] text-center text-[14px] text-text-secondary">
                Research, retrieval, and local reasoning in one workspace. Upload files, reference your
                project, and keep every thread on your machine.
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
                    className="mx-auto mt-4 max-w-[620px] rounded-full border border-white/10 bg-white/4 px-4 py-2 text-center text-[12px] text-text-secondary"
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
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="relative flex min-h-0 flex-1 flex-col"
          >
            <div className="desktop-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-2">
              <div className="mx-auto w-full max-w-[840px]">
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Conversation</p>
                    <h1 className="mt-2 font-serif text-[32px] tracking-[-0.02em] text-[#f1e8df]">
                      {activeThread?.thread.title ?? 'Untitled thread'}
                    </h1>
                  </div>

                  <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1 text-[11px] text-text-secondary">
                    {modeLabel(mode)}
                  </span>
                  {activeCitations.length > 0 && (
                    <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[11px] text-accent">
                      {activeCitations.length} citations
                    </span>
                  )}
                  {threadSources.length > 0 && (
                    <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1 text-[11px] text-text-secondary">
                      {threadSources.length} pages fetched
                    </span>
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {researchProgress && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mb-5 rounded-[24px] border border-accent/20 bg-accent/8 px-4 py-3"
                    >
                      <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-accent">
                        <Sparkles className="h-3.5 w-3.5" />
                        {researchProgress.phase.replaceAll('_', ' ')}
                      </div>
                      <p className="text-[13px] text-text-primary">{researchProgress.message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-4">
                  {activeThread?.messages.map((message) => renderMessage(message))}
                </div>

                <AnimatePresence initial={false}>
                  {(streamError || settingsNotice || exportPath) && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-3 text-[12px] text-text-secondary"
                    >
                      {streamError ?? settingsNotice ?? exportPath}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="border-t border-white/8 px-0 py-5 backdrop-blur-xl">
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
