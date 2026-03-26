'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Globe,
  ImagePlus,
  Paperclip,
  Send,
  SlidersHorizontal,
  X,
} from 'lucide-react';

import {
  DesktopContextItem,
  ModelInfo,
  QueryMode,
  WorkspaceContextItem,
} from '@/lib/desktop/client';
import { cn } from '@/lib/utils';

import { PendingAttachment } from './types';

interface DesktopComposerProps {
  attachments: PendingAttachment[];
  compact?: boolean;
  contextItems: DesktopContextItem[];
  contextResults: WorkspaceContextItem[];
  isSubmitting: boolean;
  mode: QueryMode;
  onMentionSelect: (item: WorkspaceContextItem) => void;
  onModeChange: (mode: QueryMode) => void;
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
  runtimeModels: ModelInfo[];
  selectedModelId: string;
  webSearch: boolean;
}

export function DesktopComposer({
  attachments,
  compact = false,
  contextItems,
  contextResults,
  isSubmitting,
  mode,
  onMentionSelect,
  onModeChange,
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
  runtimeModels,
  selectedModelId,
  webSearch,
}: DesktopComposerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const contextAttachmentIds = useMemo(
    () => new Set(attachments.map((attachment) => attachment.id)),
    [attachments],
  );

  const extraContextItems = useMemo(
    () => contextItems.filter((item) => !contextAttachmentIds.has(item.id)),
    [contextAttachmentIds, contextItems],
  );

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);

    if (event.dataTransfer.files.length === 0) return;
    onDropFiles(event.dataTransfer.files);
  }

  return (
    <div className="relative mx-auto w-full max-w-[860px] px-6">
      <motion.div
        layout
        onDragEnter={() => setDragActive(true)}
        onDragOver={(event) => {
          event.preventDefault();
          if (!dragActive) {
            setDragActive(true);
          }
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
          setDragActive(false);
        }}
        onDrop={handleDrop}
        className={cn(
          'desktop-panel relative overflow-hidden rounded-2xl border px-4 pb-3 pt-4',
          compact ? 'min-h-[156px]' : 'min-h-[164px]',
          dragActive && 'border-accent/40 shadow-[0_0_0_1px_rgba(118,168,255,0.32)]',
        )}
      >
        <AnimatePresence initial={false}>
          {dragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-10 rounded-2xl border border-dashed border-accent/40 bg-accent/10"
            />
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {(attachments.length > 0 || extraContextItems.length > 0) && (
            <motion.div
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-3 flex flex-wrap gap-2"
            >
              {attachments.map((attachment) => (
                <button
                  key={attachment.id}
                  onClick={() => onRemoveAttachment(attachment.id)}
                  className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-bg-surface px-2.5 py-1.5 text-[11px] text-text-secondary transition hover:text-text-primary"
                >
                  {attachment.kind === 'image' ? (
                    <ImagePlus className="h-3 w-3" />
                  ) : (
                    <Paperclip className="h-3 w-3" />
                  )}
                  <span className="max-w-[180px] truncate">{attachment.name}</span>
                  <X className="h-3 w-3" />
                </button>
              ))}

              {extraContextItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onRemoveContextItem(item.id)}
                  className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-bg-surface px-2.5 py-1.5 text-[11px] text-text-secondary transition hover:text-text-primary"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-[180px] truncate">{item.title}</span>
                  <X className="h-3 w-3" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <textarea
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Message Vigilante"
          className={cn(
            'w-full resize-none bg-transparent text-text-primary outline-none placeholder:text-text-muted',
            compact ? 'min-h-[80px] text-[15px]' : 'min-h-[88px] text-[15px]',
          )}
        />

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-border-subtle pt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onPickAttachments}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-surface text-text-secondary transition hover:text-text-primary"
              title="Attach files"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowControls((current) => !current)}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-bg-surface transition',
                showControls
                  ? 'border-accent/30 text-accent'
                  : 'border-border-subtle text-text-secondary hover:text-text-primary',
              )}
              title="Controls"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={onSubmit}
            disabled={!query.trim() || isSubmitting}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-[#071225] transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:bg-bg-elevated disabled:text-text-muted"
            title="Send"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>

        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="absolute bottom-14 left-12 z-20 w-[360px] rounded-lg border border-border-subtle bg-bg-surface p-3 shadow-[0_20px_48px_rgba(4,8,15,0.36)]"
            >
              <div className="grid grid-cols-[auto,1fr] items-center gap-x-3 gap-y-2 text-[11px]">
                <span className="text-text-muted">Model</span>
                <div className="relative">
                  <select
                    value={selectedModelId}
                    onChange={(event) => onSelectModel(event.target.value)}
                    className="w-full appearance-none rounded-md border border-border-subtle bg-bg-elevated py-1.5 pl-2.5 pr-7 text-[11px] text-text-secondary outline-none transition hover:text-text-primary"
                  >
                    {[selectedModelId, ...runtimeModels.map((model) => model.id)]
                      .filter((value, index, all) => value && all.indexOf(value) === index)
                      .map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted" />
                </div>

                <span className="text-text-muted">Mode</span>
                <div className="relative">
                  <select
                    value={mode}
                    onChange={(event) => onModeChange(event.target.value as QueryMode)}
                    className="w-full appearance-none rounded-md border border-border-subtle bg-bg-elevated py-1.5 pl-2.5 pr-7 text-[11px] text-text-secondary outline-none transition hover:text-text-primary"
                  >
                    <option value="ask">Ask</option>
                    <option value="research">Research</option>
                    <option value="deep_research">Deep Research</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted" />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-border-subtle pt-3">
                <button
                  onClick={onToggleWebSearch}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] transition',
                    webSearch
                      ? 'border-accent/25 bg-accent/10 text-accent'
                      : 'border-border-subtle bg-bg-elevated text-text-secondary hover:text-text-primary',
                  )}
                >
                  <Globe className="h-3.5 w-3.5" />
                  Web
                </button>
                <button
                  onClick={onUploadImages}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-elevated px-2.5 py-1.5 text-[11px] text-text-secondary transition hover:text-text-primary"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Image
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence initial={false}>
        {contextResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute inset-x-6 top-full z-20 mt-3 overflow-hidden rounded-lg border border-border-subtle bg-bg-surface p-2 shadow-[0_24px_48px_rgba(4,8,15,0.35)]"
          >
            {contextResults.map((item) => (
              <button
                key={item.id}
                onClick={() => onMentionSelect(item)}
                className="flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left transition hover:bg-bg-elevated"
              >
                <div>
                  <p className="text-[12px] text-text-primary">{item.title}</p>
                  {item.subtitle && (
                    <p className="mt-1 text-[11px] text-text-muted">{item.subtitle}</p>
                  )}
                </div>
                <span className="rounded-md border border-border-subtle bg-bg-elevated px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-text-muted">
                  {item.kind}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
