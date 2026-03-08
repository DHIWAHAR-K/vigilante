'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

// Subcomponents
import { SidebarHeader } from './sidebar/SidebarHeader';
import { SidebarNav } from './sidebar/SidebarNav';
import { SidebarSearch } from './sidebar/SidebarSearch';
import { ConversationList } from './sidebar/ConversationList';
import { SidebarFooter } from './SidebarFooter'; // existing

export function Sidebar() {
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'search'>('chat');
  const [isOnline, setIsOnline] = useState(true);

  // Handle Cmd/Ctrl + B & Online status
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    // Defer the initial online status check until after first render
    const checkOnline = () => setIsOnline(navigator.onLine);
    requestAnimationFrame(checkOnline);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toggleSidebar]);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarCollapsed ? 64 : 260 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="h-full bg-bg-surface border-r border-border-strong flex flex-col shrink-0 z-10 relative overflow-hidden"
    >
      {/* Top region (drag area for Tauri) */}
      <div className="h-6 w-full shrink-0 absolute top-0 left-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

      {/* Main sidebar content wrapper */}
      <div className="flex flex-col flex-1 h-full w-[260px] pt-6">
        <SidebarHeader />
        
        <SidebarNav activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {!isSidebarCollapsed && (
          <>
            <SidebarSearch value={searchQuery} onChange={setSearchQuery} />
            <ConversationList searchQuery={searchQuery} />
          </>
        )}
        
        <div className={cn(
          "mt-auto bg-bg-surface z-20 shrink-0 border-t border-border-strong",
          isSidebarCollapsed ? "w-[64px]" : "w-[260px] px-2 pb-3 pt-3"
        )}>
           <SidebarFooter isSidebarCollapsed={isSidebarCollapsed} isOnline={isOnline} />
        </div>
      </div>
    </motion.aside>
  );
}
