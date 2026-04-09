'use client';

import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  ChevronDown,
  Globe,
  ImagePlus,
  Paperclip,
  Search,
  Sparkles,
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
  const [dragging, setDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const attachmentIds = useMemo(() => new Set(attachments.map((attachment) => attachment.id)), [attachments]);
  const extraContextItems = useMemo(
    () => contextItems.filter((item) => !attachmentIds.has(item.id)),
    [attachmentIds, contextItems],
  );

  const modelOptions = useMemo(
    () =>
      [selectedModelId, ...runtimeModels.map((model) => model.id)].filter(
        (value, index, all) => Boolean(value) && all.indexOf(value) === index,
      ),
    [runtimeModels, selectedModelId],
  );

  function resizeTextarea(element: HTMLTextAreaElement) {
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, compact ? 144 : 200)}px`;
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length === 0) return;
    onDropFiles(event.dataTransfer.files);
  }

  return (
    <div className="relative w-full">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
          setDragging(false);
        }}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-[1.35rem] border bg-bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_28px_rgba(15,23,42,0.08)] transition-colors',
          dragging ? 'border-text-primary ring-2 ring-text-primary/10' : 'border-border-subtle',
        )}
      >
        <AnimatePresence initial={false}>
          {dragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 rounded-[1.35rem] border border-dashed border-text-primary/30 bg-text-primary/5"
            />
          )}
        </AnimatePresence>

        {(attachments.length > 0 || extraContextItems.length > 0) && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {attachments.map((attachment) => (
              <button
                key={attachment.id}
                onClick={() => onRemoveAttachment(attachment.id)}
                className="flex items-center gap-1.5 rounded-lg bg-bg-elevated px-2.5 py-1.5 text-xs text-text-secondary transition hover:text-text-primary"
              >
                {attachment.kind === 'image' ? (
                  <ImagePlus className="h-3.5 w-3.5" />
                ) : (
                  <Paperclip className="h-3.5 w-3.5" />
                )}
                <span className="max-w-[140px] truncate">{attachment.name}</span>
                <X className="h-3 w-3" />
              </button>
            ))}

            {extraContextItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onRemoveContextItem(item.id)}
                className="flex items-center gap-1.5 rounded-lg bg-bg-elevated px-2.5 py-1.5 text-xs text-text-secondary transition hover:text-text-primary"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="max-w-[140px] truncate">{item.title}</span>
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}

        <div className="px-4 pb-1 pt-3">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value);
              resizeTextarea(event.target);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onSubmit();
              }
            }}
            placeholder={compact ? 'Reply to Vigilante...' : 'How can Vigilante help you today?'}
            rows={1}
            className={cn(
              'w-full max-h-[200px] resize-none bg-transparent py-1 text-[15px] leading-relaxed text-text-primary outline-none placeholder:text-text-muted/80',
              compact ? 'min-h-[28px]' : 'min-h-[72px]',
            )}
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-3 pb-2.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              onClick={onPickAttachments}
              className="rounded-lg p-1.5 text-text-muted transition hover:bg-bg-elevated hover:text-text-primary"
              type="button"
              title="Attach files"
            >
              <Paperclip className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={onUploadImages}
              className="rounded-lg p-1.5 text-text-muted transition hover:bg-bg-elevated hover:text-text-primary"
              type="button"
              title="Attach image"
            >
              <ImagePlus className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={onToggleWebSearch}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition',
                webSearch
                  ? 'bg-bg-elevated text-text-primary'
                  : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary',
              )}
              type="button"
            >
              <Globe className="h-3.5 w-3.5" />
              Web
            </button>

            <div className="relative hidden sm:block">
              <select
                value={selectedModelId}
                onChange={(event) => onSelectModel(event.target.value)}
                className="appearance-none rounded-lg bg-transparent py-1.5 pl-2.5 pr-7 text-xs text-text-muted outline-none transition hover:bg-bg-elevated hover:text-text-primary"
              >
                {modelOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted" />
            </div>

            <div className="relative hidden sm:block">
              <select
                value={mode}
                onChange={(event) => onModeChange(event.target.value as QueryMode)}
                className="appearance-none rounded-lg bg-transparent py-1.5 pl-2.5 pr-7 text-xs text-text-muted outline-none transition hover:bg-bg-elevated hover:text-text-primary"
              >
                <option value="ask">Write</option>
                <option value="research">Learn</option>
                <option value="deep_research">Code</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted" />
            </div>
          </div>

          <button
            onClick={onSubmit}
            disabled={(!query.trim() && attachments.length === 0 && extraContextItems.length === 0) || isSubmitting}
            className="rounded-lg bg-text-primary p-1.5 text-bg-base transition hover:opacity-85 disabled:cursor-not-allowed disabled:bg-bg-elevated disabled:text-text-muted"
            type="button"
            title="Send"
          >
            {isSubmitting ? <Sparkles className="h-4 w-4 animate-pulse" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <p className="mt-2.5 text-center text-[11px] text-text-muted/80">
        Vigilante can make mistakes. Please double-check responses.
      </p>

      <AnimatePresence initial={false}>
        {contextResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute inset-x-0 top-full z-20 mt-3 overflow-hidden rounded-xl border border-border-subtle bg-bg-surface p-2 shadow-[0_16px_32px_rgba(15,23,42,0.12)]"
          >
            {contextResults.map((item) => (
              <button
                key={item.id}
                onClick={() => onMentionSelect(item)}
                className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-bg-elevated"
              >
                <div>
                  <p className="text-[13px] text-text-primary">{item.title}</p>
                  {item.subtitle && <p className="mt-1 text-[11px] text-text-muted">{item.subtitle}</p>}
                </div>
                <span className="rounded-md bg-bg-elevated px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-text-muted">
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
