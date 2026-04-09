'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  FolderPlus,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Search,
  Settings2,
  Trash2,
} from 'lucide-react';

import { ThreadSummary, Workspace } from '@/lib/desktop/client';
import { cn } from '@/lib/utils';

import { formatPreviewDate } from './utils';

interface DesktopSidebarProps {
  activeThreadId: string | null;
  activeView: 'chat' | 'settings';
  activeWorkspace: Workspace | null;
  onCreateWorkspace: () => void;
  onDeleteThread: (threadId: string) => void;
  onNewThread: () => void;
  onOpenSettings: () => void;
  onSearchThreadsChange: (value: string) => void;
  onSelectThread: (threadId: string) => void;
  onSelectWorkspace: (workspace: Workspace) => void;
  searchThreads: string;
  threads: ThreadSummary[];
  workspaces: Workspace[];
}

const topActions = [
  { key: 'new', icon: Plus, label: 'New chat' },
  { key: 'search', icon: Search, label: 'Search chats' },
] as const;

export function DesktopSidebar({
  activeThreadId,
  activeView,
  activeWorkspace,
  onCreateWorkspace,
  onDeleteThread,
  onNewThread,
  onOpenSettings,
  onSearchThreadsChange,
  onSelectThread,
  onSelectWorkspace,
  searchThreads,
  threads,
  workspaces,
}: DesktopSidebarProps) {
  const [open, setOpen] = useState(true);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const activeWorkspaceName = activeWorkspace?.name ?? 'Local workspace';
  const workspaceInitials = useMemo(
    () =>
      activeWorkspaceName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || 'V',
    [activeWorkspaceName],
  );

  return (
    <aside
      className="relative z-20 hidden h-full shrink-0 border-r border-border-subtle bg-bg-elevated/70 transition-[width] duration-300 ease-out lg:flex lg:flex-col"
      style={{ width: open ? 280 : 56 }}
    >
      <div className="flex h-full flex-col" style={{ minWidth: open ? 280 : 56 }}>
        <div className={cn('flex items-center pt-3.5', open ? 'gap-2.5 px-3' : 'justify-center')}>
          <button
            onClick={() => setOpen((current) => !current)}
            className="rounded-lg p-2 text-text-muted transition hover:bg-bg-surface hover:text-text-primary"
            title="Toggle sidebar"
          >
            {open ? <PanelLeftClose className="h-[18px] w-[18px]" /> : <PanelLeft className="h-5 w-5" />}
          </button>
          {open && <span className="text-base font-semibold tracking-tight text-text-primary">Vigilante</span>}
        </div>

        <nav className={cn('mt-2 space-y-px', open ? 'px-2' : 'flex flex-col items-center px-0')}>
          {topActions.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.key}
                onClick={() => {
                  if (action.key === 'new') {
                    onNewThread();
                    return;
                  }

                  setOpen(true);
                  window.setTimeout(() => searchInputRef.current?.focus(), 80);
                }}
                className={cn(
                  'flex items-center rounded-lg text-text-secondary transition hover:bg-bg-surface hover:text-text-primary',
                  open ? 'w-full gap-3 px-3 py-[7px] text-[14px]' : 'justify-center p-2',
                )}
                title={!open ? action.label : undefined}
              >
                <Icon className={cn('shrink-0', open ? 'h-[17px] w-[17px]' : 'h-5 w-5')} />
                {open && <span>{action.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className={cn('my-2 border-t border-border-subtle', open ? 'mx-3' : 'mx-2')} />

        {open && (
          <div className="px-3 pb-2">
            <div className="rounded-xl border border-border-subtle bg-bg-surface px-3 py-2">
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-text-muted" />
                <input
                  ref={searchInputRef}
                  value={searchThreads}
                  onChange={(event) => onSearchThreadsChange(event.target.value)}
                  placeholder="Search chats"
                  className="w-full bg-transparent text-[14px] text-text-primary outline-none placeholder:text-text-muted"
                />
              </div>
            </div>
          </div>
        )}

        {open ? (
          <>
            <div className="px-3 pb-1">
              <div className="flex items-center justify-between px-1 py-2">
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-text-muted">Workspace</p>
                <button
                  onClick={onCreateWorkspace}
                  className="rounded-md p-1 text-text-muted transition hover:bg-bg-surface hover:text-text-primary"
                  title="Add workspace"
                >
                  <FolderPlus className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => onSelectWorkspace(workspace)}
                    className={cn(
                      'flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] transition',
                      activeWorkspace?.id === workspace.id
                        ? 'bg-bg-surface text-text-primary'
                        : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary',
                    )}
                  >
                    <span className="truncate">{workspace.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto px-2 pb-3">
              <p className="px-3 py-2 text-[12px] font-medium uppercase tracking-[0.14em] text-text-muted">
                Recents
              </p>
              <div className="space-y-px">
                {threads.map((thread) => (
                  <div
                    key={thread.id}
                    className={cn(
                      'group flex items-start gap-2 rounded-lg px-3 py-2 text-left transition',
                      activeThreadId === thread.id && activeView === 'chat'
                        ? 'bg-bg-surface text-text-primary'
                        : 'text-text-secondary hover:bg-bg-surface/80 hover:text-text-primary',
                    )}
                  >
                    <button onClick={() => onSelectThread(thread.id)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-[14px]">{thread.title}</p>
                      <p className="mt-1 truncate text-[12px] text-text-muted">
                        {thread.preview || formatPreviewDate(thread.updatedAt)}
                      </p>
                    </button>

                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!window.confirm(`Delete "${thread.title}"? This cannot be undone.`)) {
                          return;
                        }
                        onDeleteThread(thread.id);
                      }}
                      className="rounded-md p-1 text-text-muted opacity-0 transition hover:bg-bg-elevated hover:text-destructive group-hover:opacity-100"
                      title="Delete chat"
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        if (!window.confirm(`Delete "${thread.title}"? This cannot be undone.`)) {
                          return;
                        }
                        onDeleteThread(thread.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {threads.length === 0 && (
                  <p className="px-3 py-8 text-center text-xs text-text-muted">No conversations yet</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1" />
        )}

        {open ? (
          <div className="border-t border-border-subtle px-3 py-3">
            <button
              onClick={onOpenSettings}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl px-1.5 py-2 text-left transition',
                activeView === 'settings'
                  ? 'bg-bg-surface text-text-primary'
                  : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary',
              )}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-bg-base">
                {workspaceInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{activeWorkspaceName}</p>
                <p className="text-[11px] text-text-muted">Settings</p>
              </div>
              <Settings2 className="h-4 w-4 text-text-muted" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 pb-3">
            <button
              onClick={onCreateWorkspace}
              className="rounded-lg p-2 text-text-muted transition hover:bg-bg-surface hover:text-text-primary"
              title="Add workspace"
            >
              <FolderPlus className="h-5 w-5" />
            </button>
            <button
              onClick={onOpenSettings}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold transition',
                activeView === 'settings'
                  ? 'bg-accent text-bg-base'
                  : 'bg-bg-surface text-text-primary hover:bg-bg-elevated',
              )}
              title="Settings"
            >
              {workspaceInitials}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
