'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, Sparkles, Server, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRuntimeStore } from '@/store/useRuntimeStore';

interface DetectRuntimeStepProps {
  onNext: () => void;
}

export function DetectRuntimeStep({ onNext }: DetectRuntimeStepProps) {
  const { status, ensureReady, isChecking, engines, selection } = useRuntimeStore();

  useEffect(() => {
    ensureReady();
  }, [ensureReady]);

  const isReady = status === 'ready';
  const isCheckingOrStarting = isChecking || status === 'starting';

  const getRunningEngines = () => engines.filter(e => e.status === 'running');
  const runningEngines = getRunningEngines();
  const hasInstalledModels = engines.some(e => e.models.length > 0);

  const getStatusContent = () => {
    if (status === 'checking') {
      return {
        title: 'Checking your local runtimes',
        description: 'Detecting available AI engines on your device.',
        statusIcon: <Loader2 className="w-6 h-6 text-accent animate-spin" />,
        statusText: 'Detecting...',
        cardClass: 'bg-accent/10',
      };
    }
    if (status === 'starting') {
      return {
        title: 'Starting local AI',
        description: 'Getting your local AI assistant ready.',
        statusIcon: <Loader2 className="w-6 h-6 text-accent animate-spin" />,
        statusText: 'Starting...',
        cardClass: 'bg-accent/10',
      };
    }
    if (status === 'ready') {
      const engineNames = runningEngines.map(e => e.name).join(', ');
      return {
        title: "You're all set",
        description: `Running: ${engineNames}`,
        statusIcon: <CheckCircle2 className="w-6 h-6 text-success" />,
        statusText: hasInstalledModels ? `${engines.reduce((sum, e) => sum + e.models.length, 0)} models installed` : 'Ready',
        cardClass: 'bg-success/10',
      };
    }
    if (status === 'no_models') {
      const engineNames = runningEngines.map(e => e.name).join(', ');
      return {
        title: 'AI engine ready',
        description: `${engineNames} is running. Choose a model to get started.`,
        statusIcon: <Sparkles className="w-6 h-6 text-accent" />,
        statusText: 'No models installed yet',
        cardClass: 'bg-accent/10',
      };
    }
    // error state
    return {
      title: 'Something went wrong',
      description: 'We couldn\'t detect any local AI runtimes.',
      statusIcon: <Server className="w-6 h-6 text-error" />,
      statusText: 'No runtime detected',
      cardClass: 'bg-error/10',
    };
  };

  const content = getStatusContent();

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0 }}
        className="text-heading-lg text-text-primary mb-2 text-center"
      >
        {content.title}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="text-body-sm text-text-secondary mb-8 text-center"
      >
        {content.description}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full bg-bg-surface border border-border-subtle rounded-xl p-6 mb-8"
      >
        <div className="flex items-center gap-4">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", content.cardClass)}>
            {content.statusIcon}
          </div>
          <div>
            <p className="text-body-md font-medium text-text-primary">
              Local AI Runtime
            </p>
            <p className="text-caption text-text-muted">
              {content.statusText}
            </p>
          </div>
        </div>

        {status === 'ready' && (
          <div className="mt-4 pt-4 border-t border-border-subtle flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-caption text-text-muted">
              {selection ? `Using ${selection.modelId}` : 'Ready to use'}
            </span>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.5 }}
        className="w-full max-w-[280px] mx-auto"
      >
        {status === 'no_models' ? (
          <button
            onClick={onNext}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-3 rounded-lg",
              "bg-accent text-bg-base font-medium",
              "hover:bg-accent-hover transition-colors"
            )}
          >
            Choose a Model
          </button>
        ) : status === 'ready' ? (
          <button
            onClick={onNext}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-3 rounded-lg",
              "bg-accent text-bg-base font-medium",
              "hover:bg-accent-hover transition-colors"
            )}
          >
            Get Started
          </button>
        ) : status === 'error' ? (
          <button
            onClick={onNext}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-3 rounded-lg",
              "bg-accent text-bg-base font-medium",
              "hover:bg-accent-hover transition-colors"
            )}
          >
            Browse Models
          </button>
        ) : (
          <button
            onClick={() => ensureReady()}
            disabled={isCheckingOrStarting}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-3 rounded-lg",
              "bg-accent text-bg-base font-medium",
              "hover:bg-accent-hover transition-colors",
              isCheckingOrStarting && "opacity-70 cursor-not-allowed"
            )}
          >
            {isCheckingOrStarting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Please wait...
              </>
            ) : (
              'Try Again'
            )}
          </button>
        )}
      </motion.div>
    </div>
  );
}
