import React from 'react';
import { Search } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';

interface SidebarSearchProps {
  value: string;
  onChange: (val: string) => void;
}

export function SidebarSearch({ value, onChange }: SidebarSearchProps) {
  const { isSidebarCollapsed } = useUIStore();

  if (isSidebarCollapsed) return null;

  return (
    <div className="px-4 mb-4 w-full shrink-0">
      <div className="relative group">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" />
        <input 
          type="text"
          placeholder="Search conversations..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-8 bg-transparent border border-border-subtle hover:border-border-medium rounded-lg pl-8 pr-3 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent-subtle transition-all"
        />
      </div>
    </div>
  );
}
