'use client';

import React from 'react';
import { Activity, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '../theme/ThemeToggle';
import { useRouter, usePathname } from 'next/navigation';
import { useConversationStore } from '@/store/useConversationStore';

interface SidebarFooterProps {
  isSidebarCollapsed: boolean;
  isOnline: boolean;
}

export function SidebarFooter({ isSidebarCollapsed, isOnline }: SidebarFooterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { startDraftThread } = useConversationStore();

  if (isSidebarCollapsed) {
    return (
      <div className="flex flex-col gap-2 items-center w-[64px] mx-0 absolute left-0 bottom-3">
        <IconButton icon={<Activity className="w-[18px] h-[18px]" />} title="Activity" onClick={() => { startDraftThread(); router.push('/'); }} />
        <div className="relative">
          <IconButton 
            icon={<Settings className="w-[18px] h-[18px]" />} 
            title="Settings" 
            onClick={() => router.push('/settings')} 
          />
          <div className={cn(
            "absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full border border-bg-surface",
            isOnline ? "bg-success" : "bg-accent"
          )} />
        </div>
        <ThemeToggle collapsed={true} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full px-1">
      <ActionRow icon={<Activity className="w-4 h-4" />} label="Activity" isActive={pathname === '/'} onClick={() => { startDraftThread(); router.push('/'); }} />
      <ActionRow 
        icon={<Settings className="w-4 h-4" />} 
        label="Settings" 
        isActive={pathname === '/settings'}
        statusDot={isOnline ? "bg-success shadow-[0_0_8px_var(--success-subtle)]" : "bg-accent shadow-[0_0_8px_var(--accent-subtle)]"} 
        onClick={() => router.push('/settings')}
      />
      <ThemeToggle collapsed={false} />
    </div>
  );
}

function IconButton({ icon, active, onClick, title }: { icon: React.ReactNode; active?: boolean; onClick?: () => void; title?: string }) {
  return (
    <button onClick={onClick} title={title} className={cn(
      "w-10 h-10 flex items-center justify-center rounded-xl transition-colors",
      active 
        ? "bg-bg-elevated text-text-primary" 
        : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
    )}>
      {icon}
    </button>
  );
}

function ActionRow({ icon, label, statusDot, isActive, onClick }: { icon: React.ReactNode; label: string; statusDot?: string; isActive?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 h-10 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors text-left group relative">
      <div className="w-5 flex justify-center relative">
        {icon}
        {statusDot && (
          <div className={cn("absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full", statusDot)} />
        )}
      </div>
      <span className="text-body-sm">{label}</span>
      {/* Precision notch for active items */}
      {isActive && <div className="absolute top-0 right-0 w-0.5 h-full bg-accent" />}
    </button>
  );
}
