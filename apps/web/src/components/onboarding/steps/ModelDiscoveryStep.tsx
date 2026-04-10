'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Loader2, Sparkles, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRuntimeStore, ModelInfo } from '@/store/useRuntimeStore';

interface ModelDiscoveryStepProps {
  onNext: () => void;
}

interface ModelCardProps {
  model: ModelInfo;
  isSelected: boolean;
  index: number;
  onSelect?: () => void;
}

function ModelCard({ model, isSelected, index, onSelect }: ModelCardProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 + index * 0.06, ease: 'easeOut' }}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border transition-all",
        isSelected
          ? "bg-accent/10 border-accent/30"
          : "bg-bg-surface border-border-subtle hover:border-accent/20"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center",
        isSelected ? "bg-accent" : "bg-bg-elevated"
      )}>
        <Cpu className={cn("w-6 h-6", isSelected ? "text-bg-base" : "text-text-muted")} />
      </div>
      
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <p className="text-body-md font-medium text-text-primary">
            {model.name}
          </p>
          {isSelected && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-medium">
              <Sparkles className="w-3 h-3" />
              Selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-caption text-text-muted">{model.size}</span>
          <span className="text-caption text-text-muted">•</span>
          <span className="text-caption text-text-muted">{model.engineId}</span>
        </div>
      </div>
    </motion.div>
  );

  if (onSelect) {
    return (
      <button onClick={onSelect} className="w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}

export function ModelDiscoveryStep({ onNext }: ModelDiscoveryStepProps) {
  const { installedModels, selection, selectModel, status, refreshStatus, isChecking } = useRuntimeStore();

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleSelect = (model: ModelInfo) => {
    selectModel(model.engineId, model.id);
  };

  const canContinue = installedModels.length > 0 && selection !== null;

  if (status === 'checking' || isChecking || status === 'starting') {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0 }}
          className="text-heading-lg text-text-primary mb-2 text-center"
        >
          Finding available models
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="text-body-sm text-text-secondary mb-8 text-center"
        >
          Checking what's installed on your device.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-12"
        >
          <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
          <p className="text-body-sm text-text-muted">Scanning for models...</p>
        </motion.div>
      </div>
    );
  }

  if (installedModels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0 }}
          className="text-heading-lg text-text-primary mb-2 text-center"
        >
          No models installed
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="text-body-sm text-text-secondary mb-8 text-center"
        >
          You'll need to download a model to use the AI assistant.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full bg-bg-surface border border-border-subtle rounded-xl p-8 mb-8 text-center"
        >
          <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Download className="w-8 h-8 text-accent" />
          </div>
          <p className="text-body-md font-medium text-text-primary mb-2">
            Ready to download
          </p>
          <p className="text-body-sm text-text-muted">
            After setup, you can download models like Llama 3.2, Mistral, or CodeLlama.
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.5 }}
          onClick={onNext}
          className={cn(
            "w-full max-w-[280px] py-3 rounded-lg",
            "bg-accent text-bg-base font-medium",
            "hover:bg-accent-hover transition-colors"
          )}
        >
          Continue
        </motion.button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0 }}
        className="text-heading-lg text-text-primary mb-2 text-center"
      >
        Choose a model
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="text-body-sm text-text-secondary mb-8 text-center"
      >
        Select the AI model you'd like to use.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full mb-8"
      >
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
          {installedModels.map((model, index) => (
            <ModelCard
              key={model.id}
              model={model}
              isSelected={selection?.modelId === model.id}
              index={index}
              onSelect={() => handleSelect(model)}
            />
          ))}
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.5 }}
        onClick={onNext}
        disabled={!canContinue}
        className={cn(
          "w-full max-w-[280px] py-3 rounded-lg",
          "bg-accent text-bg-base font-medium",
          "hover:bg-accent-hover transition-colors",
          !canContinue && "opacity-50 cursor-not-allowed"
        )}
      >
        Continue
      </motion.button>
    </div>
  );
}
