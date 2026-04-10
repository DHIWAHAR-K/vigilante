'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { OnboardingBackground } from './OnboardingBackground';
import { OnboardingProgressDots } from './OnboardingProgressDots';
import { WelcomeStep } from './steps/WelcomeStep';
import { DetectRuntimeStep } from './steps/DetectRuntimeStep';
import { ModelDiscoveryStep } from './steps/ModelDiscoveryStep';
import { ModelSelectStep } from './steps/ModelSelectStep';
import { ReadyStep } from './steps/ReadyStep';

export type OnboardingVariant = 'welcome' | 'detect' | 'discover' | 'select' | 'ready';

interface OnboardingFlowProps {
  isOpen: boolean;
  onComplete: () => void;
}

const steps: { id: string; variant: OnboardingVariant }[] = [
  { id: 'welcome', variant: 'welcome' },
  { id: 'detect', variant: 'detect' },
  { id: 'discover', variant: 'discover' },
  { id: 'select', variant: 'select' },
  { id: 'ready', variant: 'ready' },
];

const stepVariants = {
  enter: { opacity: 0, y: 20 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export function OnboardingFlow({ isOpen, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  // ensureReady is called by DetectRuntimeStep; no extra store access needed here.

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setCurrentStep(0);
    onComplete();
  };

  if (!isOpen) return null;

  const currentVariant = steps[currentStep].variant;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] flex flex-col"
    >
      {/* Background */}
      <OnboardingBackground variant={currentVariant} />

      {/* Progress Dots */}
      <div className="relative z-10 pt-8 pb-4">
        <OnboardingProgressDots total={steps.length} current={currentStep} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial="enter"
            animate="center"
            exit="exit"
            variants={stepVariants}
            transition={{
              duration: 0.25,
              ease: 'easeOut',
            }}
            className="w-full max-w-md"
          >
            {currentStep === 0 && <WelcomeStep onNext={handleNext} />}
            {currentStep === 1 && <DetectRuntimeStep onNext={handleNext} />}
            {currentStep === 2 && <ModelDiscoveryStep onNext={handleNext} />}
            {currentStep === 3 && <ModelSelectStep onNext={handleNext} />}
            {currentStep === 4 && <ReadyStep onComplete={handleComplete} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Back button */}
      {currentStep > 0 && currentStep < 4 && (
        <div className="relative z-10 p-6">
          <button
            onClick={handleBack}
            className="text-body-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            ← Back
          </button>
        </div>
      )}
    </motion.div>
  );
}
