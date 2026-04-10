'use client';

import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { useUIStore } from '@/store/useUIStore';
import { useConversationStore } from '@/store/useConversationStore';
import { useRuntimeStore } from '@/store/useRuntimeStore';
import { RuntimeCenter } from '@/components/runtime/RuntimeCenter';
import { CommandPalette } from '@/components/command/CommandPalette';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isRuntimeCenterOpen, setRuntimeCenterOpen } = useUIStore();
  const { startDraftThread } = useConversationStore();
  const { refreshStatus } = useRuntimeStore();

  // Background runtime check on mount - does not block UI
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + S for Runtime Center
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setRuntimeCenterOpen(true);
      }
      // Cmd/Ctrl + Shift + N for New Chat
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        startDraftThread();
      }
      // Cmd/Ctrl + K for Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [startDraftThread, setRuntimeCenterOpen]);

  return (
    <div className="flex h-screen w-full bg-bg-base text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
      </div>

      {/* Runtime Center - Model Management */}
      <RuntimeCenter
        isOpen={isRuntimeCenterOpen}
        onClose={() => setRuntimeCenterOpen(false)}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={false}
        onClose={() => {}}
        onOpenRuntime={() => setRuntimeCenterOpen(true)}
      />
    </div>
  );
}
