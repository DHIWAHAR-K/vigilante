'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Code2,
  Globe,
  ImagePlus,
  Mic,
  Paperclip,
  Plus,
  SearchCheck,
  Send,
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
import { MODE_PRESETS } from './utils';

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

function modeIcon(mode: QueryMode) {
  if (mode === 'research') return SearchCheck;
  if (mode === 'deep_research') return Code2;
  return Sparkles;
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

  const panelWidth = compact ? 'max-w-[760px]' : 'max-w-[720px]';
  const helperChips = [
    {
      id: 'files',
      label: 'From Files',
      icon: Paperclip,
      active: attachments.length > 0,
      onClick: onPickAttachments,
    },
    {
      id: 'images',
      label: 'From Images',
      icon: ImagePlus,
      active: attachments.some((attachment) => attachment.kind === 'image'),
      onClick: onUploadImages,
    },
  ];

  return (
    <div className={cn('relative mx-auto w-full px-6', panelWidth)}>
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
          'desktop-panel relative overflow-hidden rounded-[28px] px-4 pb-3 pt-4',
          compact ? 'min-h-[170px]' : 'min-h-[174px]',
          dragActive && 'border-accent/30 shadow-[0_0_0_1px_rgba(246,156,75,0.25)]',
        )}
      >
        <AnimatePresence initial={false}>
          {dragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-10 rounded-[28px] border border-dashed border-accent/40 bg-accent/8"
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
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[11px] text-text-secondary transition hover:text-text-primary"
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
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[11px] text-text-secondary transition hover:text-text-primary"
                >
                  <Sparkles className="h-3 w-3" />
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
          placeholder="How can I help you today?"
          className={cn(
            'w-full resize-none bg-transparent text-text-primary outline-none placeholder:text-text-muted',
            compact ? 'min-h-[84px] text-[15px]' : 'min-h-[90px] text-[15px]',
          )}
        />

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/6 pt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onPickAttachments}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/4 text-text-secondary transition hover:text-text-primary"
              title="Attach files"
            >
              <Plus className="h-4 w-4" />
            </button>

            <div className="relative">
              <select
                value={selectedModelId}
                onChange={(event) => onSelectModel(event.target.value)}
                className="appearance-none rounded-full border border-white/10 bg-white/4 py-1.5 pl-3 pr-7 text-[11px] text-text-secondary outline-none transition hover:text-text-primary"
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
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleWebSearch}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition',
                webSearch
                  ? 'border-accent/25 bg-accent/10 text-accent'
                  : 'border-white/10 bg-white/4 text-text-secondary hover:text-text-primary',
              )}
            >
              <Globe className="h-3.5 w-3.5" />
              Web
            </button>

            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/4 text-text-secondary transition hover:text-text-primary"
              title="Voice input coming soon"
              type="button"
            >
              <Mic className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={onSubmit}
              disabled={!query.trim() || isSubmitting}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[#16120d] transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-text-muted"
              title="Send"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {MODE_PRESETS.map((preset) => {
          const Icon = modeIcon(preset.mode);
          return (
            <button
              key={preset.mode}
              onClick={() => onModeChange(preset.mode)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition',
                mode === preset.mode
                  ? 'border-accent/25 bg-accent/10 text-accent shadow-[0_0_24px_rgba(246,156,75,0.12)]'
                  : 'border-white/10 bg-white/4 text-text-secondary hover:text-text-primary',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {preset.label}
            </button>
          );
        })}

        {helperChips.map((chip) => {
          const Icon = chip.icon;

          return (
            <button
              key={chip.id}
              onClick={chip.onClick}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition',
                chip.active
                  ? 'border-accent/25 bg-accent/10 text-accent'
                  : 'border-white/10 bg-white/4 text-text-secondary hover:text-text-primary',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {chip.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {contextResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute inset-x-6 top-full z-20 mt-3 overflow-hidden rounded-[24px] border border-white/10 bg-[#191715]/95 p-2 shadow-2xl backdrop-blur-xl"
          >
            {contextResults.map((item) => (
              <button
                key={item.id}
                onClick={() => onMentionSelect(item)}
                className="flex w-full items-start justify-between gap-3 rounded-[18px] px-3 py-2 text-left transition hover:bg-white/5"
              >
                <div>
                  <p className="text-[12px] text-text-primary">{item.title}</p>
                  {item.subtitle && (
                    <p className="mt-1 text-[11px] text-text-muted">{item.subtitle}</p>
                  )}
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-text-muted">
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
