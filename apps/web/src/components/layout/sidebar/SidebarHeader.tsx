import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

export function SidebarHeader() {
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <div className="flex items-center justify-between px-3 h-14 shrink-0 mt-2 mb-2 w-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <div className={cn("flex items-center gap-3 overflow-hidden", isSidebarCollapsed && "w-0 opacity-0")}>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-text-primary text-bg-base transition-opacity shrink-0">
          <span className="font-bold text-[14px] leading-none">V</span>
        </button>
        <span className="font-semibold text-[14px] tracking-wide text-text-primary whitespace-nowrap">Vigilante</span>
      </div>

      <button 
        onClick={toggleSidebar}
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors shrink-0",
          isSidebarCollapsed && "mx-auto"
        )}
        title={isSidebarCollapsed ? "Expand Sidebar (Cmd+B)" : "Collapse Sidebar (Cmd+B)"}
      >
        {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>
  );
}
