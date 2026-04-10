'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  conversationTitle?: string;
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete chat?',
  message = 'This will permanently remove this conversation from your history.',
  conversationTitle
}: DeleteConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      confirmButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-bg-surface border border-border-strong rounded-xl shadow-shadow-lg p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-heading-sm font-medium text-text-primary">
                    {title}
                  </h3>
                  {conversationTitle && (
                    <p className="text-caption text-text-muted mt-0.5 truncate max-w-[280px]">
                      &ldquo;{conversationTitle}&rdquo;
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors -mt-1 -mr-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-body-sm text-text-secondary mb-5">
                {message}
              </p>
              
              <div className="flex gap-2.5 justify-end">
                <button
                  onClick={onClose}
                  className={cn(
                    "px-4 h-9 rounded-lg text-caption font-medium",
                    "text-text-secondary hover:text-text-primary",
                    "hover:bg-bg-elevated transition-colors"
                  )}
                >
                  Cancel
                </button>
                <button
                  ref={confirmButtonRef}
                  onClick={handleConfirm}
                  className={cn(
                    "px-4 h-9 rounded-lg text-caption font-medium",
                    "bg-error text-white",
                    "hover:bg-error/90 transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-error/40 focus:ring-offset-1 focus:ring-offset-bg-surface"
                  )}
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
