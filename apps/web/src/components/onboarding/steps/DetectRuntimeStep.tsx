'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRuntimeStore } from '@/store/useRuntimeStore';

interface DetectRuntimeStepProps {
  onNext: () => void;
}

interface DetectionRowProps {
  label: string;
  status: 'checking' | 'success' | 'error' | 'warning';
  value?: string;
  delay: number;
}

function DetectionRow({ label, status, value, delay }: DetectionRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay, ease: 'easeOut' }}
      className="flex items-center justify-between py-3 border-b border-border-subtle last:border-0"
    >
      <span className="text-body-sm text-text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        {status === 'checking' && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
        {status === 'success' && <CheckCircle2 className="w-4 h-4 text-success" />}
        {status === 'error' && <AlertCircle className="w-4 h-4 text-error" />}
        {status === 'warning' && <AlertCircle className="w-4 h-4 text-warning" />}
        {value && (
          <span className={cn(
            "text-body-sm font-medium",
            status === 'success' && "text-success",
            status === 'error' && "text-error",
            status === 'warning' && "text-warning",
            status === 'checking' && "text-text-muted"
          )}>
            {value}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function DetectRuntimeStep({ onNext }: DetectRuntimeStepProps) {
  const { status, checkRuntime, isOnline, isChecking } = useRuntimeStore();

  useEffect(() => {
    checkRuntime();
  }, [checkRuntime]);

  const isRunning = status === 'running';
  const canContinue = isRunning;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
      {/* Heading */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0 }}
        className="text-heading-lg text-text-primary mb-2 text-center"
      >
        Checking your local runtime
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="text-body-sm text-text-secondary mb-8 text-center"
      >
        Vigilante works best with Ollama installed locally.
      </motion.p>

      {/* Detection Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full bg-bg-surface border border-border-subtle rounded-xl p-5 mb-8"
      >
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border-subtle">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Server className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-body-md font-medium text-text-primary">Ollama Runtime</p>
            <p className="text-caption text-text-muted">Local AI inference engine</p>
          </div>
        </div>

        <DetectionRow
          label="Server Status"
          status={isChecking ? 'checking' : isRunning ? 'success' : 'error'}
          value={isChecking ? 'Checking…' : isRunning ? 'Running' : 'Not running'}
          delay={0.3}
        />

        <DetectionRow
          label="Network"
          status={isOnline ? 'success' : 'warning'}
          value={isOnline ? 'Online' : 'Offline'}
          delay={0.34}
        />
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.5 }}
        className="flex flex-col gap-3 w-full max-w-[280px] mx-auto"
      >
        {!isRunning && (
          <a
            href="https://ollama.com"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center justify-center gap-2 w-full py-2.5 rounded-lg",
              "bg-bg-elevated border border-border-subtle",
              "hover:border-accent/30 transition-colors",
              "text-body-sm text-text-secondary"
            )}
          >
            Download Ollama
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        <div className="flex gap-3">
          {!isRunning && (
            <button
              onClick={() => checkRuntime()}
              disabled={isChecking}
              className={cn(
                "flex-1 py-2.5 rounded-lg",
                "bg-bg-elevated border border-border-subtle",
                "hover:border-accent/30 transition-colors",
                "text-body-sm text-text-secondary"
              )}
            >
              Check Again
            </button>
          )}

          <button
            onClick={onNext}
            disabled={!canContinue}
            className={cn(
              "flex-1 py-2.5 rounded-lg",
              "bg-accent text-bg-base font-medium",
              "hover:bg-accent-hover transition-colors",
              !canContinue && "opacity-50 cursor-not-allowed"
            )}
          >
            Continue
          </button>
        </div>
      </motion.div>
    </div>
  );
}
