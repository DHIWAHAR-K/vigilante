import React from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Edit2, Trash2, Download, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { Conversation as ConversationType } from '@/store/useConversationStore';

interface ConversationItemProps {
  item: ConversationType;
  onDelete?: (id: string) => void;
  onSelect?: (id: string) => void;
  isActive?: boolean;
}

export function ConversationItem({ item, onDelete, onSelect, isActive }: ConversationItemProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [dropdownPos, setDropdownPos] = React.useState({ top: 0, right: 0 });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
        setIsHovered(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleClick = () => {
    if (onSelect) {
      onSelect(item.id);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(item.id);
    }
  };

  const showActions = isHovered || menuOpen;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return '1d';
    if (diffDays < 7) return `${diffDays}d`;
    
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className="relative flex items-center group w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { if (!menuOpen) setIsHovered(false); }}
    >
      <DeleteConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        conversationTitle={item.title}
      />

      <button
        onClick={handleClick}
        className={cn(
          "w-full flex items-center justify-between px-3 h-9 rounded-lg transition-colors text-left relative overflow-hidden",
          isActive
            ? "bg-bg-elevated text-text-primary font-medium"
            : "text-text-secondary hover:bg-bg-surface hover:text-text-primary"
        )}
      >
        {isActive && (
          <motion.div
            layoutId="active-indicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}

        <span className="text-body-sm truncate pr-4 relative z-10 flex-1">
          {item.title}
        </span>

        {isActive && (
          <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-accent" />
        )}

        {!showActions && (
          <span className="text-mono-xs text-text-muted shrink-0 pl-2" suppressHydrationWarning>
            {formatTime(item.updatedAt)}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 inset-y-0 flex items-center z-10"
          >
            <button
              ref={triggerRef}
              onClick={(e) => {
                e.stopPropagation();
                if (!menuOpen && triggerRef.current) {
                  const rect = triggerRef.current.getBoundingClientRect();
                  setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                }
                setMenuOpen(prev => !prev);
              }}
              className={cn(
                "w-8 h-full flex items-center justify-center rounded-md transition-colors cursor-pointer",
                menuOpen
                  ? "text-text-primary bg-bg-elevated"
                  : "text-text-muted hover:text-text-primary hover:bg-border-subtle bg-bg-surface md:bg-transparent md:group-hover:bg-bg-elevated"
              )}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {menuOpen && createPortal(
              <div
                ref={dropdownRef}
                style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right }}
                className="w-36 bg-bg-surface border border-border-strong rounded-lg shadow-shadow-md py-1 z-[200]"
              >
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-caption text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors">
                  <Edit2 className="w-3 h-3" /> Rename
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-caption text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors">
                  <Download className="w-3 h-3" /> Share
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-caption text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors">
                  <Archive className="w-3 h-3" /> Archive
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-caption text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors">
                  <Download className="w-3 h-3" /> Export
                </button>
                <div className="h-[1px] w-full bg-border-subtle my-1" />
                <button
                  onClick={handleDeleteClick}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-caption text-error hover:bg-error-subtle transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>,
              document.body
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
