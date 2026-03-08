'use client';

import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { useUIStore } from '@/store/useUIStore';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isProviderSelectorOpen, setProviderSelectorOpen } = useUIStore();

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + S for Provider Selector
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setProviderSelectorOpen(true);
      }
      // Cmd/Ctrl + Shift + N for New Chat
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        // In a real implementation, this would reset chat state or navigate home
        console.log('New chat triggered');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [setProviderSelectorOpen]);

  return (
    <div className="flex h-screen w-full bg-bg-base text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top titlebar drag region for Tauri */}
        <div className="h-8 w-full absolute top-0 left-0 z-50 pointer-events-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
        
        <main className="flex-1 overflow-y-auto relative" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {children}
        </main>
      </div>

      {/* Provider Selector Modal Placeholder */}
      {isProviderSelectorOpen && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-bg-surface border border-border-strong rounded-xl p-6 shadow-2xl w-full max-w-[400px] m-4">
            <h3 className="text-body-lg text-text-primary font-medium mb-2">Select Model Provider</h3>
            <p className="text-text-muted text-body-sm mb-6">Provider and local model configuration will go here.</p>
            <button 
              onClick={() => setProviderSelectorOpen(false)}
              className="w-full py-2.5 rounded-lg bg-bg-elevated hover:bg-border-subtle text-body-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
