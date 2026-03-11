'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { useUIStore } from '@/store/useUIStore';
import { useConversationStore } from '@/store/useConversationStore';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useRuntimeStore } from '@/store/useRuntimeStore';
import { RuntimeCenter } from '@/components/runtime/RuntimeCenter';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { CommandPalette } from '@/components/command/CommandPalette';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isProviderSelectorOpen, setProviderSelectorOpen, isRuntimeCenterOpen, setRuntimeCenterOpen } = useUIStore();
  const { startDraftThread } = useConversationStore();
  const { hasCompletedOnboarding, setOnboardingComplete } = useOnboardingStore();
  const { checkRuntime } = useRuntimeStore();
  
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Check onboarding on mount
  useEffect(() => {
    if (!hasCompletedOnboarding) {
      setIsOnboardingOpen(true);
    }
    // Check runtime status on mount
    checkRuntime();
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + S for Provider Selector / Runtime Center
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
        // Command palette is opened via ConversationWorkspace for now
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [startDraftThread, setRuntimeCenterOpen]);

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
    setIsOnboardingOpen(false);
  };

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

      {/* Runtime Center */}
      <RuntimeCenter 
        isOpen={isRuntimeCenterOpen} 
        onClose={() => setRuntimeCenterOpen(false)} 
      />

      {/* Onboarding Flow */}
      <OnboardingFlow 
        isOpen={isOnboardingOpen} 
        onComplete={handleOnboardingComplete}
      />

      {/* Command Palette */}
      <CommandPalette 
        isOpen={false}
        onClose={() => {}}
        onOpenRuntime={() => setRuntimeCenterOpen(true)}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
      />
    </div>
  );
}
