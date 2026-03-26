'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Archive,
  Check,
  MoreHorizontal,
  PanelRightOpen,
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
  activeWorkspace: Workspace | null;
  onArchiveThread: (threadId: string) => void;
  onCreateWorkspace: () => void;
  onDeleteThread: (threadId: string) => void;
  onNewThread: () => void;
  onOpenInspector: () => void;
  onOpenSettings: () => void;
  onSearchThreadsChange: (value: string) => void;
  onSelectThread: (threadId: string) => void;
  onSelectWorkspace: (workspace: Workspace) => void;
  searchThreads: string;
  threads: ThreadSummary[];
  workspaces: Workspace[];
}

export function DesktopSidebar({
  activeThreadId,
  activeWorkspace,
  onArchiveThread,
  onCreateWorkspace,
  onDeleteThread,
  onNewThread,
  onOpenInspector,
  onOpenSettings,
  onSearchThreadsChange,
  onSelectThread,
  onSelectWorkspace,
  searchThreads,
  threads,
  workspaces,
}: DesktopSidebarProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <aside className="hidden w-[280px] shrink-0 border-r border-border-subtle bg-bg-surface xl:flex xl:flex-col">
      <div className="space-y-3 border-b border-border-subtle px-4 py-4">
        <div className="relative flex items-center justify-between">
          <p className="text-[13px] font-medium text-text-primary">Vigilante</p>
          <button
            onClick={() => setShowMenu((current) => !current)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-elevated text-text-secondary transition hover:text-text-primary"
            title="Sidebar menu"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="absolute right-0 top-10 z-30 w-[248px] overflow-hidden rounded-lg border border-border-subtle bg-bg-surface p-2 shadow-[0_20px_48px_rgba(4,8,15,0.36)]"
              >
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenInspector();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] text-text-secondary transition hover:bg-bg-elevated hover:text-text-primary"
                >
                  <PanelRightOpen className="h-3.5 w-3.5" />
                  Sources
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenSettings();
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] text-text-secondary transition hover:bg-bg-elevated hover:text-text-primary"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Settings
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onCreateWorkspace();
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] text-text-secondary transition hover:bg-bg-elevated hover:text-text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add workspace
                </button>

                <div className="my-2 border-t border-border-subtle" />
                <div className="px-2 pb-1 text-[10px] uppercase tracking-[0.12em] text-text-muted">
                  Workspaces
                </div>
                <div className="desktop-scrollbar max-h-44 overflow-y-auto pr-1">
                  {workspaces.map((workspace) => (
                    <button
                      key={workspace.id}
                      onClick={() => {
                        setShowMenu(false);
                        onSelectWorkspace(workspace);
                      }}
                      className={cn(
                        'mt-1 flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[12px] transition',
                        activeWorkspace?.id === workspace.id
                          ? 'bg-accent/14 text-text-primary'
                          : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
                      )}
                    >
                      <span className="truncate">{workspace.name}</span>
                      {activeWorkspace?.id === workspace.id && (
                        <Check className="h-3.5 w-3.5 text-accent" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={onNewThread}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-[12px] font-medium text-[#071225] transition hover:bg-accent-bright"
        >
          <Plus className="h-3.5 w-3.5" />
          New chat
        </button>

        <div className="rounded-lg border border-border-subtle bg-bg-elevated px-3 py-2">
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-text-muted" />
            <input
              value={searchThreads}
              onChange={(event) => onSearchThreadsChange(event.target.value)}
              placeholder="Search chats"
              className="w-full bg-transparent text-[12px] text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
        </div>

        <p className="truncate text-[10px] text-text-muted">
          Workspace: {activeWorkspace?.name ?? 'None'}
        </p>
      </div>

      <div className="desktop-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        {threads.map((thread) => (
          <div
            key={thread.id}
            className={cn(
              'group rounded-lg border border-transparent p-2 transition',
              activeThreadId === thread.id
                ? 'border-border-medium bg-bg-elevated'
                : 'hover:border-border-subtle hover:bg-bg-elevated/70',
            )}
          >
            <button onClick={() => onSelectThread(thread.id)} className="w-full text-left">
              <p className="truncate text-[12px] text-text-primary">{thread.title}</p>
              <p className="mt-1 truncate text-[10px] text-text-muted">
                {thread.preview || formatPreviewDate(thread.updatedAt)}
              </p>
            </button>

            <div className="mt-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
              <button
                onClick={() => onArchiveThread(thread.id)}
                className="rounded-md border border-border-subtle bg-bg-surface p-1 text-text-muted transition hover:text-text-primary"
                title="Archive thread"
              >
                <Archive className="h-3 w-3" />
              </button>
              <button
                onClick={() => onDeleteThread(thread.id)}
                className="rounded-md border border-border-subtle bg-bg-surface p-1 text-text-muted transition hover:text-rose-300"
                title="Delete thread"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}

        {threads.length === 0 && (
          <div className="rounded-lg border border-dashed border-border-subtle bg-bg-elevated px-3 py-4 text-[11px] text-text-muted">
            No chats yet.
          </div>
        )}
      </div>
    </aside>
  );
}
