'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  FilePlus2,
  Globe,
  Info,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  X,
} from 'lucide-react';

import type {
  ComposerAttachment,
  DesktopContextItem,
  Message,
  QueryMode,
  ResearchProgressEvent,
  ThreadDetail,
  Workspace,
  WorkspaceContextItem,
} from '@/lib/desktop/client';
import { cn } from '@/lib/utils';
import { attachmentKindLabel, formatModeLabel, formatRelativeTime, isImageAttachment } from './utils';

interface DesktopWorkspaceProps {
  activeWorkspace: Workspace | null;
  activeThread: ThreadDetail | null;
  query: string;
  mode: QueryMode;
  webSearch: boolean;
  contextItems: DesktopContextItem[];
  contextResults: WorkspaceContextItem[];
  attachments: ComposerAttachment[];
  researchProgress: ResearchProgressEvent | null;
  isSubmitting: boolean;
  streamError: string | null;
  draftActive: boolean;
  inspectorVisible: boolean;
  dragActive: boolean;
  onQueryChange: (value: string) => void;
  onModeChange: (mode: QueryMode) => void;
  onWebSearchChange: (next: boolean) => void;
  onSubmit: () => void;
  onRemoveContextItem: (id: string) => void;
  onMentionSelect: (item: WorkspaceContextItem) => void;
  onUploadClick: () => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onToggleInspector: () => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
}

const queryModes: QueryMode[] = ['ask', 'research', 'deep_research'];

export function DesktopWorkspace({
  activeWorkspace,
  activeThread,
  query,
  mode,
  webSearch,
  contextItems,
  contextResults,
  attachments,
  researchProgress,
  isSubmitting,
  streamError,
  draftActive,
  inspectorVisible,
  dragActive,
  onQueryChange,
  onModeChange,
  onWebSearchChange,
  onSubmit,
  onRemoveContextItem,
  onMentionSelect,
  onUploadClick,
  onRemoveAttachment,
  onToggleInspector,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
}: DesktopWorkspaceProps) {
  const messages = activeThread?.messages ?? [];
  const hasMessages = messages.length > 0;

  return (
    <section className="relative flex min-w-0 flex-1 flex-col">
      <header className="desktop-topbar">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.26em] text-text-muted">
            {draftActive ? 'Draft' : 'Workspace'}
          </p>
          <h2 className="mt-2 line-clamp-1 text-[1.05rem] font-semibold tracking-[-0.02em] text-text-primary">
            {draftActive
              ? 'New local conversation'
              : activeThread?.thread.title || activeWorkspace?.name || 'Loading workspace'}
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {draftActive
              ? 'Drafts autosave locally before the first send.'
              : hasMessages
                ? `${messages.length} message${messages.length === 1 ? '' : 's'} in this thread`
                : 'Local-first research canvas'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="desktop-pill hidden sm:inline-flex">
            {activeWorkspace?.name ?? 'No workspace'}
          </span>
          <button onClick={onToggleInspector} className="desktop-icon-button" title="Toggle inspector">
            {inspectorVisible ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(244,173,82,0.1),transparent_42%)]" />

        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-6 md:px-8">
            {!hasMessages ? (
              <EmptyState activeWorkspace={activeWorkspace} />
            ) : (
              <motion.div
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto flex w-full max-w-4xl flex-col gap-5"
              >
                {messages.map((message) => (
                  <MessageCard key={message.id} message={message} />
                ))}
              </motion.div>
            )}
          </div>

          <div className="relative border-t border-border-subtle bg-bg-base/90 px-4 py-4 backdrop-blur-xl md:px-6">
            <div className="mx-auto w-full max-w-4xl">
              <AnimatePresence>
                {researchProgress && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mb-3 flex items-center gap-3 rounded-2xl border border-accent/20 bg-accent/8 px-4 py-3 text-sm text-text-secondary"
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-accent">
                        {researchProgress.phase.replaceAll('_', ' ')}
                      </p>
                      <p className="line-clamp-1 text-sm text-text-primary">{researchProgress.message}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {streamError && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mb-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
                  >
                    {streamError}
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                className={cn(
                  'desktop-composer relative overflow-visible',
                  dragActive && 'border-accent/40 bg-accent/10 shadow-[0_0_0_1px_rgba(244,173,82,0.22)]',
                )}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDragOver={onDragOver}
                onDrop={onDrop}
              >
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(245,166,35,0.08),transparent_55%)]" />

                <AnimatePresence>
                  {dragActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-20 flex items-center justify-center rounded-[28px] border border-dashed border-accent/40 bg-bg-base/75 backdrop-blur-sm"
                    >
                      <div className="text-center">
                        <FilePlus2 className="mx-auto h-8 w-8 text-accent" />
                        <p className="mt-3 text-sm font-medium text-text-primary">
                          Drop files to add them to this conversation
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          Images, documents, code, and notes stay local on disk.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {(attachments.length > 0 || contextItems.length > 0) && (
                  <div className="flex flex-wrap gap-2 border-b border-border-subtle px-4 py-3">
                    {attachments.map((attachment) => (
                      <AttachmentChip
                        key={attachment.id}
                        attachment={attachment}
                        onRemove={() => onRemoveAttachment(attachment.id)}
                      />
                    ))}
                    {contextItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onRemoveContextItem(item.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-border-medium bg-bg-surface px-3 py-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
                      >
                        <span className="line-clamp-1 max-w-[220px]">{item.title}</span>
                        <X className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative px-4 pb-4 pt-4">
                  {contextResults.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 z-30 mb-3">
                      <div className="mx-2 rounded-3xl border border-border-medium bg-bg-surface/95 p-2 shadow-2xl backdrop-blur-xl">
                        {contextResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => onMentionSelect(result)}
                            className="flex w-full items-start justify-between gap-4 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-bg-elevated"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-text-primary">{result.title}</p>
                              {result.subtitle && (
                                <p className="mt-1 line-clamp-2 text-xs text-text-muted">{result.subtitle}</p>
                              )}
                            </div>
                            <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-text-muted">
                              {result.kind}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        onSubmit();
                      }
                    }}
                    placeholder="Ask anything, ground it in local files, or @mention workspace and MCP context…"
                    className="min-h-[142px] w-full resize-none bg-transparent text-[1rem] leading-7 text-text-primary outline-none placeholder:text-text-muted"
                  />

                  <div className="mt-4 flex flex-col gap-3 border-t border-border-subtle pt-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      {queryModes.map((candidate) => (
                        <button
                          key={candidate}
                          onClick={() => onModeChange(candidate)}
                          className={cn(
                            'desktop-pill transition-colors',
                            candidate === mode && 'border-accent/30 bg-accent/12 text-accent-bright',
                          )}
                        >
                          {candidate === 'ask' ? <Sparkles className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
                          {formatModeLabel(candidate)}
                        </button>
                      ))}
                      <button
                        onClick={() => onWebSearchChange(!webSearch)}
                        className={cn(
                          'desktop-pill transition-colors',
                          webSearch && 'border-accent/30 bg-accent/12 text-accent-bright',
                        )}
                      >
                        <Globe className="h-3.5 w-3.5" />
                        Web
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={onUploadClick} className="desktop-secondary-button px-4 py-2.5">
                        <FilePlus2 className="h-4 w-4" />
                        <span>Upload</span>
                      </button>
                      <button
                        onClick={onSubmit}
                        disabled={isSubmitting || (!query.trim() && attachments.length === 0)}
                        className="desktop-primary-button min-w-[118px] justify-center px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                        <span>{isSubmitting ? 'Running' : 'Send'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyState({ activeWorkspace }: { activeWorkspace: Workspace | null }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-4xl items-center">
      <div className="grid gap-8 lg:grid-cols-[1.25fr_0.85fr]">
        <div className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/8 px-3 py-1.5 text-xs uppercase tracking-[0.24em] text-accent"
          >
            Local-first research
          </motion.div>
          <motion.h3
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="max-w-2xl text-4xl font-semibold tracking-[-0.05em] text-text-primary md:text-5xl"
          >
            Private retrieval and question answering with a desktop workspace that feels built for depth.
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-xl text-base leading-7 text-text-secondary"
          >
            Ask across local files, web retrieval, saved threads, and offline models. Everything lives on
            your machine, including drafts, attachments, and exports.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="desktop-card grid gap-4"
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted">Active workspace</p>
            <p className="mt-2 text-lg font-medium text-text-primary">
              {activeWorkspace?.name ?? 'No workspace selected'}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Add files with the upload control or by dragging them into the composer. Mention workspace
              files inline with `@`.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border-subtle bg-bg-base/70 p-4">
              <p className="text-sm font-medium text-text-primary">Research modes</p>
              <p className="mt-2 text-xs leading-5 text-text-muted">
                Ask for fast local answers or switch to research and deep research for broader retrieval.
              </p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-bg-base/70 p-4">
              <p className="text-sm font-medium text-text-primary">Saved locally</p>
              <p className="mt-2 text-xs leading-5 text-text-muted">
                Conversations, workspace state, attachments, and exports are stored in the desktop backend.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function MessageCard({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div className={cn('max-w-3xl', isUser && 'pl-10')}>
        <div className="mb-2 flex items-center gap-2 px-1">
          <span className="text-[10px] uppercase tracking-[0.24em] text-text-muted">
            {isUser ? 'You' : 'Vigilante'}
          </span>
          <span className="text-xs text-text-muted">{formatRelativeTime(message.updatedAt)}</span>
          {!message.isComplete && (
            <span className="inline-flex items-center gap-1 text-xs text-accent">
              <Loader2 className="h-3 w-3 animate-spin" />
              Streaming
            </span>
          )}
        </div>

        <div
          className={cn(
            'rounded-[28px] border px-5 py-4 text-[0.97rem] leading-7 shadow-[0_10px_30px_rgba(0,0,0,0.16)]',
            isUser
              ? 'border-accent/24 bg-[linear-gradient(180deg,rgba(244,173,82,0.18),rgba(244,173,82,0.08))] text-text-primary'
              : 'border-border-medium bg-bg-surface/88 text-text-primary backdrop-blur-xl',
          )}
        >
          <p className="whitespace-pre-wrap">{message.content || (!isUser ? 'Thinking…' : '')}</p>
          {!isUser && message.citations.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border-subtle pt-4">
              {message.citations.map((citation) => (
                <a
                  key={citation.id}
                  href={citation.url}
                  target="_blank"
                  rel="noreferrer"
                  className="desktop-pill hover:border-accent/30 hover:text-accent-bright"
                >
                  [{citation.index}] {citation.domain || citation.title}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: ComposerAttachment;
  onRemove: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-border-medium bg-bg-surface/90 px-3 py-2 text-left backdrop-blur-xl">
      {isImageAttachment(attachment) && attachment.previewDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={attachment.previewDataUrl}
          alt={attachment.displayName}
          className="h-11 w-11 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-subtle bg-bg-base text-[10px] uppercase tracking-[0.2em] text-text-muted">
          {attachmentKindLabel(attachment.kind)}
        </div>
      )}
      <div className="min-w-0">
        <p className="line-clamp-1 text-sm font-medium text-text-primary">{attachment.displayName}</p>
        <p className="text-xs text-text-muted">{attachmentKindLabel(attachment.kind)}</p>
      </div>
      <button onClick={onRemove} className="desktop-icon-button h-8 w-8" title="Remove attachment">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
