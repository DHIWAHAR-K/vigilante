import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { VigilanteLogo } from '@/components/brand/VigilanteLogo';

export function SidebarHeader() {
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <div className="flex items-center justify-between px-3 h-10 shrink-0 mb-4 w-full relative">
      <div className={cn("flex items-center gap-2.5 overflow-hidden", isSidebarCollapsed && "w-0 opacity-0")}>
        <div className="w-6 h-6 flex items-center justify-center shrink-0">
          <VigilanteLogo />
        </div>
        <span className="text-body-lg text-text-primary whitespace-nowrap mt-0.5">Vigilante</span>
      </div>

      {isSidebarCollapsed && (
        <div className="absolute left-[20px] top-1/2 -translate-y-1/2 w-6 h-6">
          <VigilanteLogo />
        </div>
      )}

      <button 
        onClick={toggleSidebar}
        className={cn(
          "w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors shrink-0 absolute z-10",
          isSidebarCollapsed ? "left-[18px] opacity-0 hover:opacity-100" : "right-[12px]"
        )}
        title={isSidebarCollapsed ? "Expand Sidebar (Cmd+B)" : "Collapse Sidebar (Cmd+B)"}
      >
        {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>
  );
}
