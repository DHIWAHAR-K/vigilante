'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Download, ExternalLink, Settings2, Sparkles } from 'lucide-react';

import {
  Citation,
  DesktopContextItem,
  Message,
  ModelInfo,
  QueryMode,
  ResearchProgressEvent,
  ThreadDetail,
  Workspace,
  WorkspaceContextItem,
} from '@/lib/desktop/client';
import { cn } from '@/lib/utils';

import { DesktopComposer } from './DesktopComposer';
import { PendingAttachment } from './types';
import { resolveGreeting } from './utils';

interface DesktopWorkspaceProps {
  activeThread: ThreadDetail | null;
  activeWorkspace: Workspace | null;
  attachments: PendingAttachment[];
  contextItems: DesktopContextItem[];
  contextResults: WorkspaceContextItem[];
  exportPath: string | null;
  isSubmitting: boolean;
  mode: QueryMode;
  onExportThread: (format: 'md' | 'json') => void;
  onMentionSelect: (item: WorkspaceContextItem) => void;
  onModeChange: (mode: QueryMode) => void;
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
  webSearch: boolean;
}

function AssistantActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-3 flex items-center gap-0.5">
      <button
        onClick={() => {
          void navigator.clipboard.writeText(content);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        }}
        className="rounded-md p-1.5 text-text-muted transition hover:bg-bg-elevated hover:text-text-primary"
        title="Copy"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

function MessageCard({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          isUser
            ? 'max-w-[78%] rounded-[1.6rem] rounded-br-lg bg-bg-elevated px-4 py-2.5 text-text-primary'
            : 'max-w-[85%] py-1 text-text-primary',
        )}
      >
        <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
          {message.content || (!isUser ? 'Thinking…' : '')}
          {!message.isComplete && !isUser && <span className="ml-2 streaming-cursor align-middle" />}
        </div>

        {!isUser && message.citations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.citations.map((citation) => (
              <a
                key={citation.id}
                href={citation.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle px-3 py-1.5 text-[11px] text-text-secondary transition hover:bg-bg-elevated hover:text-text-primary"
              >
                <span>[{citation.index}]</span>
                <span className="max-w-[220px] truncate">{citation.title}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        )}

        {!isUser && <AssistantActions content={message.content} />}
      </div>
    </div>
  );
}

function StatusNotice({
  exportPath,
  researchProgress,
  settingsNotice,
  streamError,
}: {
  exportPath: string | null;
  researchProgress: ResearchProgressEvent | null;
  settingsNotice: string | null;
  streamError: string | null;
}) {
  const tone = streamError
    ? 'border-destructive/20 bg-destructive/10 text-text-primary'
    : 'border-border-subtle bg-bg-surface text-text-secondary';

  if (!researchProgress && !streamError && !settingsNotice && !exportPath) {
    return null;
  }

  return (
    <div className={cn('rounded-2xl border px-4 py-3 text-sm', tone)}>
      {researchProgress ? (
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-text-muted">
            <Sparkles className="h-3.5 w-3.5" />
            {researchProgress.phase.replaceAll('_', ' ')}
          </div>
          <p className="mt-2">{researchProgress.message}</p>
        </div>
      ) : (
        <p>{streamError ?? settingsNotice ?? exportPath}</p>
      )}
    </div>
  );
}

export function DesktopWorkspace({
  activeThread,
  activeWorkspace,
  attachments,
  contextItems,
  contextResults,
  exportPath,
  isSubmitting,
  mode,
  onExportThread,
  onMentionSelect,
  onModeChange,
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
  webSearch,
}: DesktopWorkspaceProps) {
  const hasMessages = (activeThread?.messages.length ?? 0) > 0;
  const workspaceName = activeWorkspace?.name ?? 'Local workspace';
  const greeting = useMemo(() => resolveGreeting(), []);

  return (
    <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-bg-base">
      <header className="flex h-11 shrink-0 items-center justify-end gap-2 px-4">
        {hasMessages && (
          <button
            onClick={() => onExportThread('md')}
            className="rounded-lg px-2.5 py-1 text-[13px] text-text-muted transition hover:bg-bg-elevated hover:text-text-primary"
          >
            <span className="inline-flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export
            </span>
          </button>
        )}
        <button
          onClick={onOpenSettings}
          className="rounded-lg p-1.5 text-text-muted transition hover:bg-bg-elevated hover:text-text-primary"
          title="Settings"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        {hasMessages && (
          <div className="desktop-scrollbar flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-4 pb-56 pt-6">
              <div className="space-y-4">
                <StatusNotice
                  exportPath={exportPath}
                  researchProgress={researchProgress}
                  settingsNotice={settingsNotice}
                  streamError={streamError}
                />

                {activeThread?.messages.map((message) => (
                  <MessageCard key={message.id} message={message} />
                ))}
              </div>
            </div>
          </div>
        )}

        {!hasMessages && <div className="flex-1" />}

        <motion.div
          layout
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className={cn('mx-auto w-full max-w-2xl px-4', hasMessages ? 'pb-4' : 'pb-8')}
        >
          <div className="flex w-full flex-col items-center">
            {!hasMessages && (
              <>
                <div className="mb-6">
                  <Sparkles className="h-9 w-9 text-text-muted/70" strokeWidth={1.5} />
                </div>

                <h1 className="mb-2 text-center text-[28px] font-medium tracking-[-0.01em] text-text-primary">
                  {greeting}
                </h1>
                <p className="mb-8 text-center text-[14px] text-text-muted">
                  Active workspace: {workspaceName}
                </p>
              </>
            )}

            <DesktopComposer
              attachments={attachments}
              compact={hasMessages}
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

            {!hasMessages && (
              <div className="mt-4 w-full">
                <StatusNotice
                  exportPath={exportPath}
                  researchProgress={researchProgress}
                  settingsNotice={settingsNotice}
                  streamError={streamError}
                />
              </div>
            )}
          </div>
        </motion.div>

        {!hasMessages && <div className="flex-1" />}
      </div>
    </main>
  );
}
