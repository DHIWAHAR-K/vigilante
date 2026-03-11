'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface OnboardingProgressDotsProps {
  total: number;
  current: number;
}

export function OnboardingProgressDots({ total, current }: OnboardingProgressDotsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <motion.div
          key={index}
          layout
          className={cn(
            "h-2 rounded-full transition-all",
            index === current 
              ? "w-6 bg-accent" 
              : index < current 
                ? "w-2 bg-accent/60" 
                : "w-2 bg-border-subtle"
          )}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30
          }}
        />
      ))}
    </div>
  );
}
