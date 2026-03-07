import React from 'react';
import { MoreHorizontal, Edit2, Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface Conversation {
  id: string;
  title: string;
  time?: string;
  active?: boolean;
}

interface ConversationItemProps {
  item: Conversation;
}

export function ConversationItem({ item }: ConversationItemProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div 
      className="relative flex items-center group w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setMenuOpen(false); }}
    >
      <button 
        className={cn(
          "w-full flex items-center justify-between px-3 h-9 rounded-lg transition-colors text-left relative overflow-hidden",
          item.active 
            ? "bg-bg-elevated text-text-primary font-medium" 
            : "text-text-secondary hover:bg-bg-surface hover:text-text-primary"
        )}
      >
        {item.active && (
          <motion.div 
            layoutId="active-indicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full" 
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
        
        <span className="text-[13px] truncate pr-4 relative z-10 flex-1">
          {item.title}
        </span>
        
        {/* Timestamp - visible unless hovered and not active */}
        {!isHovered && item.time && (
          <span className="text-[11px] text-text-muted font-mono shrink-0 pl-2">
            {item.time}
          </span>
        )}
      </button>

      {/* Action Menu Trigger - visible on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-border-subtle bg-bg-surface md:bg-transparent md:group-hover:bg-bg-elevated transition-colors"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Quick Context Menu (Mock) */}
            {menuOpen && (
              <div className="absolute top-full right-0 mt-1 w-32 bg-bg-surface border border-border-strong rounded-lg shadow-shadow-md py-1 z-50">
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors">
                  <Edit2 className="w-3 h-3" /> Rename
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors">
                  <Download className="w-3 h-3" /> Export
                </button>
                <div className="h-[1px] w-full bg-border-subtle my-1" />
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-error hover:bg-error-subtle transition-colors">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
