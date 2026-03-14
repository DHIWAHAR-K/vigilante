'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ThemeSegmentedControl } from '@/components/theme/ThemeSegmentedControl';
import { homeFadeIn } from '@/lib/motion-config';
import { useRuntimeStore } from '@/store/useRuntimeStore';
import { Server, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const router = useRouter();
  const { status, models, isChecking, checkRuntime } = useRuntimeStore();

  useEffect(() => {
    checkRuntime();
  }, [checkRuntime]);

  const isConnected = status === 'running' || status === 'available';

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={homeFadeIn}
      className="flex flex-col min-h-full w-full bg-bg-base"
    >
      {/* Back button */}
      <div className="px-8 pt-6">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-body-sm">Back to Chat</span>
        </button>
      </div>

      <div className="w-full max-w-3xl mx-auto px-8 py-8 h-full flex flex-col gap-12">
        
        <div className="flex flex-col gap-2">
          <h1 className="text-display-md text-text-primary">Settings</h1>
          <p className="text-text-secondary text-body-sm mt-1">Manage your application preferences and local providers.</p>
        </div>

        {/* Appearance Section */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-heading-sm text-text-primary">Appearance</h2>
            <div className="h-[1px] w-full bg-border-subtle mt-2" />
          </div>

          <div className="flex flex-col md:flex-row gap-12 items-start md:items-center">
            <div className="flex flex-col gap-2 max-w-xs">
              <span className="text-label-md text-text-primary">Interface Theme</span>
              <span className="text-body-sm text-text-muted">
                Select or customize your UI theme. Auto follows your system appearance.
              </span>
            </div>

            <div className="flex-1 w-full">
              <ThemeSegmentedControl />
            </div>
          </div>
        </section>

        {/* Providers Section */}
        <section className="flex flex-col gap-6 mt-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-heading-sm text-text-primary">Model Providers</h2>
            <div className="h-[1px] w-full bg-border-subtle mt-2" />
          </div>

          <div className="flex flex-col gap-4">
            <div className={cn(
              "p-6 rounded-xl border flex flex-col gap-2 relative overflow-hidden group",
              isConnected
                ? "bg-bg-surface border-border-subtle"
                : "bg-warning/5 border-warning/20"
            )}>
              <div className={cn(
                "absolute top-0 left-0 w-1 h-full",
                isConnected ? "bg-success opacity-80" : "bg-warning opacity-80"
              )} />
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-text-muted" />
                  <span className="text-label-md text-text-primary">Ollama (Local)</span>
                </div>
                {isChecking ? (
                  <span className="flex items-center gap-2 text-mono-xs text-text-muted bg-bg-elevated px-2 py-0.5 rounded-md">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Checking
                  </span>
                ) : isConnected ? (
                  <span className="flex items-center gap-2 text-mono-xs text-success bg-success-subtle px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-mono-xs text-warning bg-warning-subtle px-2 py-0.5 rounded-md">
                    <AlertCircle className="w-3 h-3" />
                    {status === 'not-installed' ? 'Not Installed' : 'Disconnected'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mt-2">
                {models.length > 0 && (
                  <p className="text-caption text-text-secondary">
                    {models.length} model{models.length !== 1 ? 's' : ''} installed
                  </p>
                )}
              </div>

              {!isConnected && !isChecking && (
                <p className="text-caption text-warning mt-2">
                  Make sure Ollama is running. Run <code className="bg-bg-elevated px-1 rounded">ollama serve</code> in your terminal.
                </p>
              )}
            </div>

            {/* Models List */}
            {models.length > 0 && (
              <div className="ml-4">
                <p className="text-caption text-text-muted mb-2">Installed Models</p>
                <div className="flex flex-wrap gap-2">
                  {models.map((model) => (
                    <span
                      key={model.id}
                      className="text-mono-xs text-text-secondary bg-bg-elevated px-2 py-1 rounded border border-border-subtle"
                    >
                      {model.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

      </div>
    </motion.div>
  );
}
