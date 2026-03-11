'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Circle, Cpu, Wifi, WifiOff, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRuntimeStore } from '@/store/useRuntimeStore';
import { pulseGlowVariants } from '@/lib/motion-config';

interface RuntimeStatusChipProps {
  onClick?: () => void;
}

export function RuntimeStatusChip({ onClick }: RuntimeStatusChipProps) {
  const { status, isOnline, selectedModel, models } = useRuntimeStore();
  
  const statusConfig = {
    checking: { 
      color: 'bg-yellow-500', 
      pulse: true,
      label: 'Checking runtime...' 
    },
    available: { 
      color: 'bg-success', 
      pulse: true,
      label: 'Runtime ready' 
    },
    running: { 
      color: 'bg-success', 
      pulse: true,
      label: 'Local ready' 
    },
    stopped: { 
      color: 'bg-warning', 
      pulse: false,
      label: 'Runtime stopped' 
    },
    error: { 
      color: 'bg-error', 
      pulse: false,
      label: 'Runtime error' 
    },
    'not-installed': { 
      color: 'bg-text-muted', 
      pulse: false,
      label: 'No runtime' 
    },
  };
  
  const config = statusConfig[status];
  const modelInfo = models.find(m => m.id === selectedModel);
  
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
        <div className={cn(
          "w-2 h-2 rounded-full",
          config.color
        )} />
        {config.pulse && (
          <motion.div
            variants={pulseGlowVariants}
            initial="idle"
            animate="active"
            className={cn(
              "absolute inset-0 rounded-full",
              config.color.replace('bg-', 'bg-')
            )}
          />
        )}
      </div>
      
      {/* Model name */}
      <span className="text-caption text-text-secondary group-hover:text-text-primary transition-colors">
        {modelInfo?.name || selectedModel || 'No model'}
      </span>
      
      {/* Online/Offline indicator */}
      <div className="flex items-center gap-1 ml-1">
        {isOnline ? (
          <Wifi className="w-3 h-3 text-success" />
        ) : (
          <WifiOff className="w-3 h-3 text-text-muted" />
        )}
      </div>
      
      {/* Chevron */}
      <ChevronRight className="w-3 h-3 text-text-muted group-hover:text-accent transition-colors" />
    </button>
  );
}

export function RuntimeIndicator() {
  const { status } = useRuntimeStore();
  
  if (status === 'running' || status === 'available') {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
        <span className="text-mono-xs text-text-muted">Local</span>
      </div>
    );
  }
  
  return null;
}
