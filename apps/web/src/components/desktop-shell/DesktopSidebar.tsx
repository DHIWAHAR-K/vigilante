'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Boxes,
  FolderPlus,
  Folders,
  MessageSquare,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Archive,
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

const navItems = [
  { id: 'search', label: 'Search', icon: Search },
  { id: 'settings', label: 'Customize', icon: Settings2 },
  { id: 'chats', label: 'Chats', icon: MessageSquare },
  { id: 'projects', label: 'Projects', icon: Folders },
  { id: 'artifacts', label: 'Artifacts', icon: Boxes },
] as const;

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);

  function handleNavClick(id: (typeof navItems)[number]['id']) {
    if (id === 'search') {
      setSearchOpen((current) => !current);
      return;
    }

    if (id === 'settings') {
      onOpenSettings();
      return;
    }

    if (id === 'projects') {
      setProjectsOpen((current) => !current);
      return;
    }

    if (id === 'artifacts') {
      onOpenInspector();
      return;
    }
  }

  return (
    <aside className="hidden w-[172px] shrink-0 border-r border-white/8 bg-[linear-gradient(180deg,rgba(20,20,18,0.98),rgba(14,14,13,0.95))] xl:flex xl:flex-col">
      <div className="px-4 py-3">
        <button
          onClick={onNewThread}
          className="flex w-full items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-2 text-left text-[12px] text-text-secondary transition hover:border-white/12 hover:bg-white/6 hover:text-text-primary"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <Plus className="h-3.5 w-3.5" />
          </span>
          New chat
        </button>
      </div>

      <nav className="space-y-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.id === 'search'
              ? searchOpen || searchThreads.length > 0
              : item.id === 'projects'
                ? projectsOpen
                : false;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[12px] text-text-secondary transition hover:bg-white/5 hover:text-text-primary',
                active && 'bg-white/5 text-text-primary',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <AnimatePresence initial={false}>
        {(searchOpen || searchThreads.length > 0) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-3 pt-3"
          >
            <div className="rounded-2xl border border-white/8 bg-white/3 px-3 py-2">
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-text-muted" />
                <input
                  value={searchThreads}
                  onChange={(event) => onSearchThreadsChange(event.target.value)}
                  placeholder="Search recents"
                  className="w-full bg-transparent text-[12px] text-text-primary outline-none placeholder:text-text-muted"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {projectsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-3 pt-3"
          >
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-2.5">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-text-muted">
                  Workspaces
                </span>
                <button
                  onClick={onCreateWorkspace}
                  className="rounded-full border border-white/10 bg-white/5 p-1 text-text-secondary transition hover:text-text-primary"
                  title="Add workspace"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => onSelectWorkspace(workspace)}
                    className={cn(
                      'w-full rounded-2xl px-3 py-2 text-left transition',
                      activeWorkspace?.id === workspace.id
                        ? 'bg-accent/10 text-text-primary'
                        : 'text-text-secondary hover:bg-white/4 hover:text-text-primary',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-[12px]">{workspace.name}</span>
                      {activeWorkspace?.id === workspace.id && (
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      )}
                    </div>
                    {workspace.rootPath && (
                      <p className="mt-1 truncate text-[10px] text-text-muted">{workspace.rootPath}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 flex min-h-0 flex-1 flex-col px-3 pb-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Recents</span>
          {activeWorkspace && (
            <span className="max-w-[82px] truncate rounded-full border border-white/8 bg-white/4 px-2 py-1 text-[10px] text-text-muted">
              {activeWorkspace.name}
            </span>
          )}
        </div>

        <div className="desktop-scrollbar min-h-0 space-y-1 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {threads.map((thread) => (
              <motion.div
                key={thread.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="group"
              >
                <div
                  className={cn(
                    'rounded-2xl px-2 py-2 transition',
                    activeThreadId === thread.id
                      ? 'bg-white/7 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
                      : 'hover:bg-white/4',
                  )}
                >
                  <button
                    onClick={() => onSelectThread(thread.id)}
                    className="w-full text-left"
                  >
                    <p className="truncate text-[11.5px] text-text-secondary group-hover:text-text-primary">
                      {thread.title}
                    </p>
                    <p className="mt-1 truncate text-[10px] text-text-muted">
                      {thread.preview || formatPreviewDate(thread.updatedAt)}
                    </p>
                  </button>

                  <div className="mt-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => onArchiveThread(thread.id)}
                      className="rounded-full border border-white/8 bg-white/3 p-1 text-text-muted transition hover:text-text-primary"
                      title="Archive thread"
                    >
                      <Archive className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onDeleteThread(thread.id)}
                      className="rounded-full border border-white/8 bg-white/3 p-1 text-text-muted transition hover:text-rose-300"
                      title="Delete thread"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {threads.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-[11px] text-text-muted">
              Start a conversation and it will appear here.
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/8 px-4 py-3">
        <div className="flex items-center gap-2 rounded-2xl bg-white/[0.03] px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/12 text-accent">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] text-text-primary">Local-first workspace</p>
            <p className="truncate text-[10px] text-text-muted">
              Chats stay on this machine
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
