import React from 'react';
import { Trash2 } from 'lucide-react';
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
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const handleClick = () => {
    if (onSelect) {
      onSelect(item.id);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(item.id);
    }
  };

  const showActions = isHovered;

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
      onMouseLeave={() => setIsHovered(false)}
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
            className="absolute right-0 inset-y-0 flex items-center gap-1 z-10"
          >
            <button
              onClick={handleDeleteClick}
              className="w-8 h-full flex items-center justify-center rounded-md transition-colors cursor-pointer text-text-muted hover:text-error hover:bg-error-subtle"
              title="Delete conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
