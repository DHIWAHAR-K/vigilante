'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Cpu, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VigilanteLogo } from '@/components/brand/VigilanteLogo';
import { useRuntimeStore } from '@/store/useRuntimeStore';

interface ReadyStepProps {
  onComplete: () => void;
}

export function ReadyStep({ onComplete }: ReadyStepProps) {
  const { selection, installedModels } = useRuntimeStore();
  const selectedModelInfo = selection ? installedModels.find(m => m.id === selection.modelId) : null;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto text-center">
      {/* Logo - larger */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          duration: 0.4, 
          delay: 0,
          ease: [0.25, 0.46, 0.45, 0.94] 
        }}
        className="mb-6"
      >
        <div className="w-28 h-28 mx-auto">
          <VigilanteLogo className="w-full h-full" />
        </div>
      </motion.div>

      {/* Heading */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15, ease: 'easeOut' }}
        className="text-display-sm text-text-primary font-serif mb-3"
      >
        You're ready.
      </motion.h2>

      {/* Body */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25, ease: 'easeOut' }}
        className="text-body-md text-text-secondary mb-6"
      >
        Your local research engine is set up and ready to use.
      </motion.p>

      {/* Model Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.35, ease: 'easeOut' }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8"
      >
        <Cpu className="w-4 h-4 text-accent" />
        <span className="text-body-sm font-medium text-accent">
          {selectedModelInfo?.name || selection?.modelId || 'No model selected'}
        </span>
        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
      </motion.div>

      {/* CTA Button - largest, most prominent */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onComplete}
        className={cn(
          "w-full max-w-[280px] py-4 px-6 rounded-lg",
          "bg-accent text-bg-base font-medium text-body-md",
          "hover:bg-accent-hover transition-colors",
          "shadow-xl shadow-accent/25"
        )}
      >
        Open Vigilante
        <ArrowRight className="inline-block w-5 h-5 ml-2" />
      </motion.button>
    </div>
  );
}
