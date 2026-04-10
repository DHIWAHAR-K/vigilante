'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRuntimeStore, ModelInfo } from '@/store/useRuntimeStore';

interface ModelSelectStepProps {
  onNext: () => void;
}

export function ModelSelectStep({ onNext }: ModelSelectStepProps) {
  const { installedModels, selection, selectModel } = useRuntimeStore();

  const handleSelect = (model: ModelInfo) => {
    selectModel(model.engineId, model.id);
  };

  const canContinue = !!selection;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0 }}
        className="text-heading-lg text-text-primary mb-2 text-center"
      >
        Choose your default model
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="text-body-sm text-text-secondary mb-8 text-center"
      >
        You can change this anytime in settings.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full mb-8"
      >
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
          {installedModels.map((model, index) => (
            <motion.button
              key={model.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.2 + index * 0.05, ease: 'easeOut' }}
              onClick={() => handleSelect(model)}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-xl border transition-all relative overflow-hidden",
                selection?.modelId === model.id
                  ? "bg-accent/5 border-l-4 border-l-accent border-accent/20"
                  : "bg-bg-surface border-border-subtle hover:border-accent/20"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                selection?.modelId === model.id ? "bg-accent" : "bg-bg-elevated"
              )}>
                <Cpu className={cn(
                  "w-6 h-6",
                  selection?.modelId === model.id ? "text-bg-base" : "text-text-muted"
                )} />
              </div>
              
              <div className="flex-1 text-left">
                <p className={cn(
                  "text-body-md font-medium",
                  selection?.modelId === model.id ? "text-accent" : "text-text-primary"
                )}>
                  {model.name}
                </p>
                <p className="text-caption text-text-muted">{model.size} • {model.engineId}</p>
              </div>

              {selection?.modelId === model.id && (
                <motion.div
                  layoutId="selected-indicator"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                </motion.div>
              )}
            </motion.button>
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
        Confirm
      </motion.button>
    </div>
  );
}
