'use client';

import { motion } from 'framer-motion';
import {
  Archive,
  FolderPlus,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
  Trash2,
} from 'lucide-react';

import type { ThreadSummary, Workspace } from '@/lib/desktop/client';
import { cn } from '@/lib/utils';
import { formatPreviewDate } from './utils';

interface DesktopSidebarProps {
  compact: boolean;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  workspaces: Workspace[];
  activeWorkspaceId?: string | null;
  threads: ThreadSummary[];
  activeThreadId?: string | null;
  onWorkspaceSelect: (workspace: Workspace) => void;
  onCreateWorkspace: () => void;
  onThreadOpen: (threadId: string) => void;
  onThreadArchive: (threadId: string) => void;
  onThreadDelete: (threadId: string) => void;
  onNewThread: () => void;
  onOpenSettings: () => void;
  onToggleCompact: () => void;
}

export function DesktopSidebar({
  compact,
  searchValue,
  onSearchValueChange,
  workspaces,
  activeWorkspaceId,
  threads,
  activeThreadId,
  onWorkspaceSelect,
  onCreateWorkspace,
  onThreadOpen,
  onThreadArchive,
  onThreadDelete,
  onNewThread,
  onOpenSettings,
  onToggleCompact,
}: DesktopSidebarProps) {
  return (
    <motion.aside
      layout
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'desktop-rail shrink-0 border-r border-border-subtle',
        compact ? 'w-[88px]' : 'w-[312px]',
      )}
    >
      <div className="flex h-full flex-col">
        <div className={cn('border-b border-border-subtle', compact ? 'px-3 py-4' : 'px-5 py-5')}>
          <div className="flex items-center justify-between gap-3">
            <div className={cn('min-w-0', compact && 'hidden')}>
              <p className="text-[10px] uppercase tracking-[0.28em] text-text-muted">Vigilante</p>
              <h1 className="mt-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-text-primary">
                Research Desktop
              </h1>
            </div>

            <button
              onClick={onToggleCompact}
              className="desktop-icon-button"
              title={compact ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {compact ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>

          <div className={cn('mt-5 grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-2')}>
            <button
              onClick={onNewThread}
              className={cn(
                'desktop-primary-button justify-center',
                compact ? 'px-0 py-3' : 'px-4 py-3',
              )}
              title="New chat"
            >
              <MessageSquarePlus className="h-4 w-4" />
              {!compact && <span>New Chat</span>}
            </button>

            <button
              onClick={onCreateWorkspace}
              className={cn(
                'desktop-secondary-button justify-center',
                compact ? 'px-0 py-3' : 'px-4 py-3',
              )}
              title="Add workspace"
            >
              <FolderPlus className="h-4 w-4" />
              {!compact && <span>Workspace</span>}
            </button>
          </div>

          {!compact && (
            <label className="desktop-search mt-4">
              <Search className="h-4 w-4 text-text-muted" />
              <input
                value={searchValue}
                onChange={(event) => onSearchValueChange(event.target.value)}
                placeholder="Search conversations"
                className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
            </label>
          )}
        </div>

        <div className="border-b border-border-subtle px-3 py-3">
          {!compact && (
            <p className="px-2 pb-2 text-[10px] uppercase tracking-[0.26em] text-text-muted">
              Workspaces
            </p>
          )}
          <div className="space-y-2">
            {workspaces.map((workspace) => {
              const active = workspace.id === activeWorkspaceId;
              const initials = workspace.name.slice(0, 2).toUpperCase();
              return (
                <button
                  key={workspace.id}
                  onClick={() => onWorkspaceSelect(workspace)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl border transition-colors',
                    active
                      ? 'border-accent/35 bg-accent/10'
                      : 'border-transparent hover:border-border-medium hover:bg-bg-surface/70',
                    compact ? 'justify-center px-0 py-3' : 'px-3 py-3',
                  )}
                  title={workspace.name}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-xs font-semibold',
                      active
                        ? 'border-accent/30 bg-accent/20 text-accent-bright'
                        : 'border-border-subtle bg-bg-surface text-text-secondary',
                    )}
                  >
                    {initials}
                  </span>
                  {!compact && (
                    <span className="min-w-0 text-left">
                      <span className="block truncate text-sm font-medium text-text-primary">
                        {workspace.name}
                      </span>
                      <span className="block truncate text-xs text-text-muted">
                        {workspace.rootPath ?? 'Local workspace'}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {!compact && (
            <p className="px-2 pb-2 text-[10px] uppercase tracking-[0.26em] text-text-muted">
              Threads
            </p>
          )}

          <div className="space-y-2">
            {threads.map((thread) => {
              const active = thread.id === activeThreadId;
              return (
                <div
                  key={thread.id}
                  className={cn(
                    'group rounded-2xl border transition-colors',
                    active
                      ? 'border-accent/30 bg-bg-surface/90 shadow-[0_0_0_1px_rgba(243,169,75,0.05)]'
                      : 'border-transparent hover:border-border-medium hover:bg-bg-surface/70',
                  )}
                >
                  <button
                    onClick={() => onThreadOpen(thread.id)}
                    className={cn(
                      'w-full text-left',
                      compact ? 'px-3 py-3' : 'px-4 py-3',
                    )}
                    title={thread.title}
                  >
                    {compact ? (
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-bg-surface text-sm font-semibold text-text-primary">
                        {thread.title.slice(0, 1).toUpperCase()}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <p className="line-clamp-1 text-sm font-medium text-text-primary">{thread.title}</p>
                          <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-text-muted">
                            {formatPreviewDate(thread.updatedAt)}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-text-secondary">
                          {thread.preview || 'No preview available'}
                        </p>
                      </>
                    )}
                  </button>

                  {!compact && (
                    <div className="flex items-center justify-between border-t border-border-subtle/70 px-3 py-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
                        {thread.pinned ? 'Pinned' : 'Saved'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onThreadArchive(thread.id)}
                          className="desktop-icon-button h-8 w-8"
                          title="Archive thread"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onThreadDelete(thread.id)}
                          className="desktop-icon-button h-8 w-8 hover:text-rose-300"
                          title="Delete thread"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border-subtle px-3 py-3">
          <button
            onClick={onOpenSettings}
            className={cn(
              'desktop-secondary-button w-full justify-center',
              compact ? 'px-0 py-3' : 'px-4 py-3',
            )}
          >
            <Settings2 className="h-4 w-4" />
            {!compact && <span>Settings</span>}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
