'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type OnboardingVariant = 'welcome' | 'detect' | 'discover' | 'select' | 'ready';

interface OnboardingBackgroundProps {
  variant: OnboardingVariant;
  className?: string;
}

export function OnboardingBackground({ variant, className }: OnboardingBackgroundProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {/* Base dark background */}
      <div className="absolute inset-0 bg-bg-base" />
      
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
      
      {/* Variant-specific backgrounds */}
      {variant === 'welcome' && <WelcomeBackground />}
      {variant === 'detect' && <DetectBackground />}
      {variant === 'discover' && <DiscoverBackground />}
      {variant === 'select' && <SelectBackground />}
      {variant === 'ready' && <ReadyBackground />}
    </div>
  );
}

function WelcomeBackground() {
  return (
    <>
      {/* Large centered radial amber glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(245, 166, 35, 0.12) 0%, rgba(245, 166, 35, 0.04) 40%, transparent 70%)',
        }}
      />
      
      {/* Faint concentric rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]">
        <svg viewBox="0 0 800 800" className="w-full h-full opacity-[0.04]">
          <circle cx="400" cy="400" r="200" fill="none" stroke="#F5A623" strokeWidth="1" />
          <circle cx="400" cy="400" r="300" fill="none" stroke="#F5A623" strokeWidth="0.5" />
          <circle cx="400" cy="400" r="400" fill="none" stroke="#F5A623" strokeWidth="0.25" />
        </svg>
      </div>
    </>
  );
}

function DetectBackground() {
  return (
    <>
      {/* Soft bottom-left amber wash */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="absolute bottom-0 left-0 w-[500px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 0% 100%, rgba(245, 166, 35, 0.08) 0%, transparent 60%)',
        }}
      />
      
      {/* Scanning line animation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[1px] overflow-hidden">
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-[200px] h-full"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(245, 166, 35, 0.15), transparent)',
          }}
        />
      </div>
      
      {/* Faint radar rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px]">
        <svg viewBox="0 0 400 400" className="w-full h-full opacity-[0.03]">
          <circle cx="200" cy="200" r="100" fill="none" stroke="#F5A623" strokeWidth="0.5" />
          <circle cx="200" cy="200" r="150" fill="none" stroke="#F5A623" strokeWidth="0.25" />
          <circle cx="200" cy="200" r="200" fill="none" stroke="#F5A623" strokeWidth="0.125" />
        </svg>
      </div>
    </>
  );
}

function DiscoverBackground() {
  return (
    <>
      {/* Multiple ambient orbs */}
      {[
        { top: '20%', left: '15%', size: 80, opacity: 0.03 },
        { top: '60%', left: '10%', size: 120, opacity: 0.04 },
        { top: '30%', left: '70%', size: 100, opacity: 0.03 },
        { top: '70%', left: '60%', size: 90, opacity: 0.05 },
        { top: '15%', left: '40%', size: 60, opacity: 0.02 },
        { top: '80%', left: '85%', size: 110, opacity: 0.04 },
      ].map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            top: orb.top,
            left: orb.left,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, rgba(245, 166, 35, ${orb.opacity}) 0%, transparent 70%)`,
          }}
        />
      ))}
    </>
  );
}

function SelectBackground() {
  return (
    <>
      {/* Centered softer radial glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(245, 166, 35, 0.08) 0%, rgba(245, 166, 35, 0.03) 40%, transparent 70%)',
        }}
      />
      
      {/* Faint convergence rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]">
        <svg viewBox="0 0 600 600" className="w-full h-full opacity-[0.03]">
          <circle cx="300" cy="300" r="150" fill="none" stroke="#F5A623" strokeWidth="0.5" />
          <circle cx="300" cy="300" r="250" fill="none" stroke="#F5A623" strokeWidth="0.25" />
          <circle cx="300" cy="300" r="300" fill="none" stroke="#F5A623" strokeWidth="0.125" />
        </svg>
      </div>
    </>
  );
}

function ReadyBackground() {
  return (
    <>
      {/* Strongest centered amber glow - payoff */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(245, 166, 35, 0.15) 0%, rgba(245, 166, 35, 0.06) 30%, rgba(245, 166, 35, 0.02) 60%, transparent 80%)',
        }}
      />
      
      {/* Complete concentric rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]">
        <svg viewBox="0 0 800 800" className="w-full h-full opacity-[0.04]">
          <circle cx="400" cy="400" r="150" fill="none" stroke="#F5A623" strokeWidth="1" />
          <circle cx="400" cy="400" r="250" fill="none" stroke="#F5A623" strokeWidth="0.5" />
          <circle cx="400" cy="400" r="350" fill="none" stroke="#F5A623" strokeWidth="0.25" />
          <circle cx="400" cy="400" r="400" fill="none" stroke="#F5A623" strokeWidth="0.125" />
        </svg>
      </div>
    </>
  );
}
