'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ThemeSegmentedControl } from '@/components/theme/ThemeSegmentedControl';
import { homeFadeIn } from '@/lib/motion-config';

export default function SettingsPage() {
  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={homeFadeIn}
      className="flex flex-col min-h-full w-full bg-bg-base"
    >
      <div className="w-full max-w-3xl mx-auto px-8 py-16 h-full flex flex-col gap-12">
        
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Settings</h1>
          <p className="text-text-secondary text-[14px]">Manage your application preferences and local providers.</p>
        </div>

        {/* Appearance Section */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-[15px] font-medium text-text-primary">Appearance</h2>
            <div className="h-[1px] w-full bg-border-subtle mt-2" />
          </div>

          <div className="flex flex-col md:flex-row gap-12 items-start md:items-center">
            <div className="flex flex-col gap-2 max-w-xs">
              <span className="text-[14px] font-medium text-text-primary">Interface Theme</span>
              <span className="text-[13px] text-text-muted leading-relaxed">
                Select or customize your UI theme. Auto follows your system appearance.
              </span>
            </div>

            <div className="flex-1 w-full">
              <ThemeSegmentedControl />
            </div>
          </div>
        </section>

        {/* Providers Section (Placeholder) */}
        <section className="flex flex-col gap-6 mt-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[15px] font-medium text-text-primary">Model Providers</h2>
            <div className="h-[1px] w-full bg-border-subtle mt-2" />
          </div>

          <div className="flex flex-col gap-4">
            <div className="p-6 rounded-xl border border-border-subtle bg-bg-surface flex flex-col gap-2 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-success opacity-80" />
              <div className="flex justify-between items-center w-full">
                <span className="text-[14px] font-medium text-text-primary">Ollama (Local)</span>
                <span className="text-[12px] font-mono text-success bg-success-subtle px-2 py-0.5 rounded-md">Connected</span>
              </div>
              <p className="text-[13px] text-text-secondary">http://localhost:11434</p>
            </div>
          </div>
        </section>

      </div>
    </motion.div>
  );
}
