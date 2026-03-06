'use client';

import React from 'react';
import { Activity, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  return (
    <aside className="w-[56px] h-full bg-bg-base border-r border-border-subtle flex flex-col items-center py-4 shrink-0 z-10">
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Brand Icon Only */}
        <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-text-primary text-bg-base hover:opacity-90 transition-opacity">
          <span className="font-bold text-[14px] leading-none">V</span>
        </button>
      </div>

      <div className="mt-auto flex flex-col items-center gap-5 w-full pb-2">
        <IconButton icon={<Activity className="w-5 h-5 stroke-[1.5]" />} />
        <IconButton icon={<Settings className="w-5 h-5 stroke-[1.5]" />} />
      </div>
    </aside>
  );
}

function IconButton({ icon, active }: { icon: React.ReactNode; active?: boolean }) {
  return (
    <button className={cn(
      "w-10 h-10 flex items-center justify-center rounded-lg transition-colors",
      active 
        ? "text-text-primary bg-bg-surface" 
        : "text-text-muted hover:text-text-primary hover:bg-bg-surface"
    )}>
      {icon}
    </button>
  );
}
