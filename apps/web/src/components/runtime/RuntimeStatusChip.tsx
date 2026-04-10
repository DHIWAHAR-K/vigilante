'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRuntimeStore } from '@/store/useRuntimeStore';
import { pulseGlowVariants } from '@/lib/motion-config';

interface RuntimeStatusChipProps {
  onClick?: () => void;
}

export function RuntimeStatusChip({ onClick }: RuntimeStatusChipProps) {
  const { status, selection, installedModels } = useRuntimeStore();

  const isReady = status === 'ready' || status === 'no_models';
  const isWorking = status === 'ready';
  const isLoading = status === 'checking' || status === 'starting';

  const modelInfo = selection ? installedModels.find(m => m.id === selection.modelId) : null;
  const displayName = modelInfo?.name || selection?.modelId || 'Select Model';

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg",
        "bg-bg-elevated border border-border-subtle",
        "hover:border-accent/30 transition-colors",
        "group cursor-pointer"
      )}
    >
      {/* Status indicator */}
      <div className="relative">
        {isLoading ? (
          <Loader2 className="w-3 h-3 text-accent animate-spin" />
        ) : (
          <div className={cn(
            "w-2 h-2 rounded-full",
            isReady ? "bg-success" : "bg-text-muted"
          )} />
        )}
        {isWorking && (
          <motion.div
            variants={pulseGlowVariants}
            initial="idle"
            animate="active"
            className="absolute inset-0 rounded-full bg-success"
          />
        )}
      </div>

      {/* Model name */}
      <span className="text-caption text-text-secondary group-hover:text-text-primary transition-colors">
        {displayName}
      </span>

      {/* Chevron */}
      <ChevronRight className="w-3 h-3 text-text-muted group-hover:text-accent transition-colors" />
    </button>
  );
}

export function RuntimeIndicator() {
  const { status } = useRuntimeStore();

  if (status === 'ready') {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
        <span className="text-mono-xs text-text-muted">Local</span>
      </div>
    );
  }

  return null;
}
