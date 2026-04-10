'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VigilanteLogo } from '@/components/brand/VigilanteLogo';

interface WelcomeStepProps {
  onNext: () => void;
}

const staggerDelay = {
  0: { delay: 0 },
  1: { delay: 0.1 },
  2: { delay: 0.2 },
  3: { delay: 0.3 },
  4: { delay: 0.4 },
};

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto text-center">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mb-6"
      >
        <div className="w-24 h-24 mx-auto">
          <VigilanteLogo className="w-full h-full" />
        </div>
      </motion.div>

      {/* Wordmark */}
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: staggerDelay[1].delay }}
        className="text-display-md text-text-primary font-serif mb-4"
      >
        Vigilante
      </motion.h1>

      {/* Brand statement */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: staggerDelay[2].delay }}
        className="text-body-md text-text-secondary mb-10"
      >
        Private intelligence, on your terms.
      </motion.p>

      {/* CTA Button */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: staggerDelay[3].delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onNext}
        className={cn(
          "w-full max-w-[280px] py-3.5 px-6 rounded-lg",
          "bg-accent text-bg-base font-medium",
          "hover:bg-accent-hover transition-colors",
          "shadow-lg shadow-accent/20"
        )}
      >
        Get Started
        <ArrowRight className="inline-block w-4 h-4 ml-2" />
      </motion.button>

      {/* Already set up link */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: staggerDelay[4].delay }}
        className="mt-6 text-caption text-text-muted"
      >
        Already set up?{' '}
        <button
          onClick={onNext}
          className="text-accent hover:underline transition-colors"
        >
          Open app
        </button>
      </motion.p>
    </div>
  );
}
