'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, CheckCircle2, AlertCircle, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
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

function StatusSection({ 
  icon: Icon, 
  label, 
  value, 
  status 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  status?: 'success' | 'warning' | 'error';
}) {
  const statusStyles = {
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
  };
  
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center">
        <Icon className={cn("w-4 h-4", status ? statusStyles[status] : "text-text-muted")} />
      </div>
      <div>
        <p className="text-caption text-text-muted">{label}</p>
        <p className={cn("text-body-sm", status ? statusStyles[status] : "text-text-primary")}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function RuntimeCenter({ isOpen, onClose }: RuntimeCenterProps) {
  const { 
    status, 
    isOnline, 
    models, 
    selectedModel, 
    ollamaVersion,
    selectModel,
    checkRuntime 
  } = useRuntimeStore();
  
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (isOpen && status === 'checking') {
      checkRuntime();
    }
  }, [isOpen]);

  const handleCheck = async () => {
    setIsChecking(true);
    await checkRuntime();
    setIsChecking(false);
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
                <h2 className="text-heading-sm font-medium text-text-primary">Local Runtime</h2>
                <p className="text-caption text-text-muted mt-0.5">Ollama & model management</p>
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
              {/* Status Cards */}
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 gap-3"
              >
                <motion.div variants={listItemVariants} className="p-4 rounded-lg bg-bg-elevated border border-border-subtle">
                  <StatusSection 
                    icon={Cpu}
                    label="Ollama"
                    value={status === 'not-installed' ? 'Not installed' : ollamaVersion || 'Available'}
                    status={status === 'running' ? 'success' : status === 'not-installed' ? 'error' : 'warning'}
                  />
                </motion.div>
                
                <motion.div variants={listItemVariants} className="p-4 rounded-lg bg-bg-elevated border border-border-subtle">
                  <StatusSection 
                    icon={isOnline ? CheckCircle2 : AlertCircle}
                    label="Network"
                    value={isOnline ? 'Online' : 'Offline'}
                    status={isOnline ? 'success' : 'warning'}
                  />
                </motion.div>
              </motion.div>

              {/* Models Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-body-sm font-medium text-text-primary">Installed Models</h3>
                  <button
                    onClick={handleCheck}
                    disabled={isChecking}
                    className="flex items-center gap-1.5 text-caption text-accent hover:text-accent-hover transition-colors"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", isChecking && "animate-spin")} />
                    Refresh
                  </button>
                </div>
                
                {status === 'checking' || isChecking ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                  </div>
                ) : status === 'not-installed' ? (
                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <p className="text-body-sm text-warning">
                      Ollama is not installed. 
                      <a 
                        href="https://ollama.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline ml-1 inline-flex items-center gap-1"
                      >
                        Install Ollama <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                ) : (
                  <motion.div 
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2"
                  >
                    {models.map((model) => (
                      <ModelCard
                        key={model.id}
                        model={model}
                        isSelected={model.id === selectedModel}
                        onSelect={() => selectModel(model.id)}
                      />
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Selected Model Info */}
              {selectedModel && (
                <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                  <p className="text-caption text-accent mb-1">Active Model</p>
                  <p className="text-body-md font-medium text-text-primary">
                    {models.find(m => m.id === selectedModel)?.name || selectedModel}
                  </p>
                  <p className="text-caption text-text-muted mt-1">
                    {models.find(m => m.id === selectedModel)?.size} • Local inference
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border-subtle">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg bg-bg-elevated hover:bg-border-subtle text-body-sm transition-colors"
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
