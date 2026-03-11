'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, FileText, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRuntimeStore, ModelInfo } from '@/store/useRuntimeStore';

interface ModelDiscoveryStepProps {
  onNext: () => void;
}

interface ModelCardProps {
  model: ModelInfo;
  isRecommended: boolean;
  index: number;
  onSelect?: () => void;
  isSelectable?: boolean;
}

function ModelCard({ model, isRecommended, index, onSelect, isSelectable }: ModelCardProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 + index * 0.06, ease: 'easeOut' }}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border transition-all",
        "bg-bg-surface border-border-subtle hover:border-accent/20",
        isSelectable && "cursor-pointer"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center",
        isRecommended ? "bg-accent" : "bg-bg-elevated"
      )}>
        <Cpu className={cn("w-6 h-6", isRecommended ? "text-bg-base" : "text-text-muted")} />
      </div>
      
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <p className="text-body-md font-medium text-text-primary">
            {model.name}
          </p>
          {isRecommended && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-medium">
              <Sparkles className="w-3 h-3" />
              Recommended
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-caption text-text-muted">{model.size}</span>
        </div>
      </div>
    </motion.div>
  );

  if (isSelectable && onSelect) {
    return (
      <button onClick={onSelect} className="w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}

export function ModelDiscoveryStep({ onNext }: ModelDiscoveryStepProps) {
  const { models, selectedModel, selectModel, status } = useRuntimeStore();

  const handleSelect = (modelId: string) => {
    selectModel(modelId);
  };

  const canContinue = models.length > 0;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
      {/* Heading */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0 }}
        className="text-heading-lg text-text-primary mb-2 text-center"
      >
        Your installed models
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="text-body-sm text-text-secondary mb-8 text-center"
      >
        We found these models on your system.
      </motion.p>

      {/* Loading State */}
      {status === 'checking' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-12"
        >
          <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
          <p className="text-body-sm text-text-muted">Discovering models...</p>
        </motion.div>
      )}

      {/* Models List */}
      {status !== 'checking' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full mb-8"
        >
          {models.length === 0 ? (
            <div className="flex flex-col items-center py-12 px-6 bg-bg-surface border border-border-subtle rounded-xl">
              <div className="w-16 h-16 rounded-xl bg-bg-elevated flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-text-muted" />
              </div>
              <p className="text-body-md text-text-primary font-medium mb-2">
                No models found
              </p>
              <p className="text-body-sm text-text-muted text-center mb-4">
                Pull a model to get started with Vigilante
              </p>
              <code className="text-caption text-accent bg-accent/10 px-3 py-1.5 rounded-lg">
                ollama pull llama3.2
              </code>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
              {models.map((model, index) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  isRecommended={model.id === 'llama3.2'}
                  index={index}
                  onSelect={() => handleSelect(model.id)}
                  isSelectable={true}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Continue Button */}
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
