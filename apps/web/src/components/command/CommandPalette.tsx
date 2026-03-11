'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MessageSquarePlus, 
  Settings, 
  Cpu, 
  Moon, 
  Sun,
  Plus,
  X,
  Hash,
  Clock,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useConversationStore } from '@/store/useConversationStore';
import { useRuntimeStore } from '@/store/useRuntimeStore';
import { scaleInVariants, TRANSITIONS } from '@/lib/motion-config';

interface Command {
  id: string;
  title: string;
  description?: string;
  icon: React.ElementType;
  shortcut?: string;
  action: () => void;
  category: 'chat' | 'model' | 'settings' | 'theme';
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRuntime?: () => void;
  onOpenOnboarding?: () => void;
}

export function CommandPalette({ isOpen, onClose, onOpenRuntime, onOpenOnboarding }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const { toggleSidebar, setProviderSelectorOpen } = useUIStore();
  const { startDraftThread, conversations } = useConversationStore();
  const { selectedModel, models } = useRuntimeStore();

  const commands: Command[] = useMemo(() => [
    {
      id: 'new-chat',
      title: 'New Chat',
      description: 'Start a new conversation',
      icon: MessageSquarePlus,
      shortcut: '⌘N',
      action: () => {
        startDraftThread();
        onClose();
      },
      category: 'chat',
    },
    {
      id: 'toggle-sidebar',
      title: 'Toggle Sidebar',
      description: 'Show or hide the sidebar',
      icon: Hash,
      shortcut: '⌘B',
      action: () => {
        toggleSidebar();
        onClose();
      },
      category: 'chat',
    },
    {
      id: 'runtime-center',
      title: 'Runtime Center',
      description: 'Manage local runtime and models',
      icon: Cpu,
      action: () => {
        onOpenRuntime?.();
        onClose();
      },
      category: 'model',
    },
    {
      id: 'select-model',
      title: `Model: ${models.find(m => m.id === selectedModel)?.name || selectedModel}`,
      description: 'Change the active model',
      icon: Zap,
      action: () => {
        onOpenRuntime?.();
        onClose();
      },
      category: 'model',
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure preferences',
      icon: Settings,
      shortcut: '⌘,',
      action: () => {
        window.location.href = '/settings';
        onClose();
      },
      category: 'settings',
    },
  ], [selectedModel, models, startDraftThread, toggleSidebar, onClose, onOpenRuntime]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter(cmd => 
      cmd.title.toLowerCase().includes(lower) ||
      cmd.description?.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        filteredCommands[selectedIndex]?.action();
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
    setQuery('');
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]"
        onClick={onClose}
      >
        <motion.div
          variants={scaleInVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={TRANSITIONS.smooth}
          className="w-full max-w-lg bg-bg-surface border border-border-strong rounded-xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
            <Search className="w-5 h-5 text-text-muted" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent text-body-md text-text-primary placeholder-text-muted focus:outline-none"
              autoFocus
            />
            <button
              onClick={onClose}
              className="p-1 hover:bg-bg-elevated rounded transition-colors"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>

          {/* Commands List */}
          <div className="max-h-[300px] overflow-y-auto py-2">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-muted">
                No commands found
              </div>
            ) : (
              filteredCommands.map((cmd, idx) => (
                <button
                  key={cmd.id}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 transition-colors",
                    idx === selectedIndex 
                      ? "bg-accent/10" 
                      : "hover:bg-bg-elevated"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    idx === selectedIndex ? "bg-accent" : "bg-bg-elevated"
                  )}>
                    <cmd.icon className={cn(
                      "w-4 h-4",
                      idx === selectedIndex ? "text-bg-base" : "text-text-muted"
                    )} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={cn(
                      "text-body-sm",
                      idx === selectedIndex ? "text-accent" : "text-text-primary"
                    )}>
                      {cmd.title}
                    </p>
                    {cmd.description && (
                      <p className="text-caption text-text-muted">{cmd.description}</p>
                    )}
                  </div>
                  {cmd.shortcut && (
                    <span className="text-mono-xs text-text-muted bg-bg-elevated px-2 py-0.5 rounded">
                      {cmd.shortcut}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border-subtle flex items-center gap-4 text-caption text-text-muted">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-bg-elevated rounded text-mono-xs">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-bg-elevated rounded text-mono-xs">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-bg-elevated rounded text-mono-xs">Esc</kbd>
              Close
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
