'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, CheckCircle2, Loader2, RefreshCw, Sparkles, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRuntimeStore, ModelInfo } from '@/store/useRuntimeStore';
import { slideInVariants, staggerContainer, listItemVariants, TRANSITIONS } from '@/lib/motion-config';

interface RuntimeCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

function ModelCard({ model, isSelected, onSelect }: { model: ModelInfo; isSelected: boolean; onSelect: () => void }) {
  return (
    <motion.button
      variants={listItemVariants}
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg border transition-all",
        isSelected
          ? "bg-accent/10 border-accent/30"
          : "bg-bg-elevated border-border-subtle hover:border-accent/20"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center",
        isSelected ? "bg-accent" : "bg-bg-surface"
      )}>
        <Cpu className={cn("w-4 h-4", isSelected ? "text-bg-base" : "text-text-muted")} />
      </div>

      <div className="flex-1 text-left">
        <p className={cn(
          "text-body-sm font-medium",
          isSelected ? "text-accent" : "text-text-primary"
        )}>
          {model.name}
        </p>
        <p className="text-caption text-text-muted">{model.size}</p>
      </div>

      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <CheckCircle2 className="w-5 h-5 text-accent" />
        </motion.div>
      )}
    </motion.button>
  );
}

export function RuntimeCenter({ isOpen, onClose }: RuntimeCenterProps) {
  const {
    status,
    installedModels,
    engines,
    selection,
    selectModel,
    refreshStatus,
    isChecking,
  } = useRuntimeStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh status when the panel opens. The user is already in the app at
  // this point so we use a silent probe — not the full ensure lifecycle.
  useEffect(() => {
    if (isOpen) {
      refreshStatus();
    }
  }, [isOpen]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshStatus();
    setIsRefreshing(false);
  };

  const isReady = status === 'ready' || status === 'no_models';

  const getStatusText = () => {
    switch (status) {
      case 'checking': return 'Checking...';
      case 'starting': return 'Starting...';
      case 'ready': return 'Ready';
      case 'no_models': return 'Ready (no models)';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            variants={slideInVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={TRANSITIONS.smooth}
            className="fixed right-0 top-0 bottom-0 w-[400px] bg-bg-surface border-l border-border-strong z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border-subtle">
              <div>
                <h2 className="text-heading-sm font-medium text-text-primary">AI Settings</h2>
                <p className="text-caption text-text-muted mt-0.5">Local AI configuration</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-elevated transition-colors"
              >
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Status Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "p-5 rounded-xl border",
                  isReady
                    ? "bg-success/5 border-success/20"
                    : status === 'checking' || status === 'starting'
                      ? "bg-accent/5 border-accent/20"
                      : "bg-warning/5 border-warning/20"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    isReady
                      ? "bg-success/10"
                      : status === 'checking' || status === 'starting'
                        ? "bg-accent/10"
                        : "bg-warning/10"
                  )}>
                    {status === 'checking' || status === 'starting' ? (
                      <Loader2 className="w-6 h-6 text-accent animate-spin" />
                    ) : isReady ? (
                      <CheckCircle2 className="w-6 h-6 text-success" />
                    ) : (
                      <Server className="w-6 h-6 text-warning" />
                    )}
                  </div>
                  <div>
                    <p className="text-body-md font-medium text-text-primary">
                      Local AI Runtime
                    </p>
                    <p className="text-caption text-text-muted">
                      {getStatusText()}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Models Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-body-sm font-medium text-text-primary">Models</h3>
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing || status === 'checking'}
                    className="flex items-center gap-1.5 text-caption text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                    Refresh
                  </button>
                </div>

                {status === 'checking' || isRefreshing ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                  </div>
                ) : installedModels.length === 0 ? (
                  <div className="p-6 rounded-lg bg-bg-elevated border border-border-subtle text-center">
                    <Sparkles className="w-8 h-8 text-text-muted mx-auto mb-3" />
                    <p className="text-body-sm text-text-secondary mb-1">
                      No models installed
                    </p>
                    <p className="text-caption text-text-muted">
                      Download a model to get started
                    </p>
                  </div>
                ) : (
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2"
                  >
                    {installedModels.map((model) => (
                      <ModelCard
                        key={model.id}
                        model={model}
                        isSelected={selection?.modelId === model.id}
                        onSelect={() => selectModel(model.engineId, model.id)}
                      />
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Selected Model Info */}
              {selection && installedModels.length > 0 && (
                <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                  <p className="text-caption text-accent mb-1">Currently Using</p>
                  <p className="text-body-md font-medium text-text-primary">
                    {installedModels.find(m => m.id === selection.modelId)?.name || selection.modelId}
                  </p>
                  <p className="text-caption text-text-muted mt-1">
                    {installedModels.find(m => m.id === selection.modelId)?.size} • {selection.engineId}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border-subtle flex gap-2">
              <button
                onClick={() => { window.location.href = '/settings'; }}
                className="flex-1 py-2.5 rounded-lg bg-accent text-bg-base hover:bg-accent-hover text-body-sm transition-colors text-center"
              >
                Manage Models
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg bg-bg-elevated hover:bg-border-subtle text-body-sm transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
