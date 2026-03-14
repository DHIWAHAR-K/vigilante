'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Cpu, Download, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { ThemeSegmentedControl } from '@/components/theme/ThemeSegmentedControl';
import { homeFadeIn } from '@/lib/motion-config';
import { useRuntimeStore, ModelInfo } from '@/store/useRuntimeStore';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/api/client';
import type { EngineId, CatalogModel } from '@/lib/api/client';

export default function SettingsPage() {
  const router = useRouter();
  const {
    status,
    installedModels,
    engines,
    selection,
    isChecking,
    catalogModels,
    pullJob,
    refreshStatus,
    selectModel,
    loadCatalog,
    startPull,
    pollPullJob,
  } = useRuntimeStore();

  const [activeTab, setActiveTab] = useState<'installed' | 'catalog'>('installed');
  const [isPulling, setIsPulling] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);

  useEffect(() => {
    refreshStatus();
    loadCatalog();
  }, []);

  useEffect(() => {
    if (pullJob && (pullJob.status === 'downloading' || pullJob.status === 'verifying' || pullJob.status === 'queued')) {
      const interval = setInterval(() => {
        pollPullJob(pullJob.id);
      }, 1000);
      return () => clearInterval(interval);
    }
    if (pullJob && (pullJob.status === 'complete' || pullJob.status === 'failed')) {
      setIsPulling(false);
      if (pullJob.status === 'complete') {
        refreshStatus();
      }
      if (pullJob.status === 'failed') {
        setPullError(pullJob.error || 'Pull failed');
      }
    }
  }, [pullJob]);

  const isReady = status === 'ready' || status === 'no_models';

  const handleSelectModel = (model: ModelInfo) => {
    selectModel(model.engineId, model.id);
  };

  const handlePullModel = (model: CatalogModel) => {
    setPullError(null);
    setIsPulling(true);
    startPull(model.engineId, model.id);
  };

  const getEngineName = (engineId: EngineId): string => {
    const engine = engines.find(e => e.id === engineId);
    return engine?.name || engineId;
  };

  const getEngineStatus = (engineId: EngineId): string => {
    const engine = engines.find(e => e.id === engineId);
    return engine?.status || 'unknown';
  };

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

      <div className="w-full max-w-3xl mx-auto px-8 py-8 h-full flex flex-col gap-8">
        
        <div className="flex flex-col gap-2">
          <h1 className="text-display-md text-text-primary">Settings</h1>
          <p className="text-text-secondary text-body-sm mt-1">Manage your AI models and runtimes.</p>
        </div>

        {/* Runtime Status Banner */}
        <div className={cn(
          "p-4 rounded-xl border flex items-center justify-between",
          isReady ? "bg-success/5 border-success/20" : "bg-warning/5 border-warning/20"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isReady ? "bg-success" : "bg-warning"
            )} />
            <span className="text-body-sm text-text-primary">
              {isReady ? 'Runtime ready' : 'Runtime not ready'}
            </span>
            <span className="text-caption text-text-muted">
              {engines.filter(e => e.status === 'running').map(e => e.name).join(', ') || 'No engines running'}
            </span>
          </div>
          <button
            onClick={() => refreshStatus()}
            disabled={isChecking}
            className="text-caption text-accent hover:text-accent-hover transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Model Tabs */}
        <div className="flex gap-1 p-1 bg-bg-elevated rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('installed')}
            className={cn(
              "px-4 py-2 rounded-md text-body-sm transition-colors",
              activeTab === 'installed'
                ? "bg-bg-surface text-text-primary"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            Installed ({installedModels.length})
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={cn(
              "px-4 py-2 rounded-md text-body-sm transition-colors",
              activeTab === 'catalog'
                ? "bg-bg-surface text-text-primary"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            Available ({catalogModels.length})
          </button>
        </div>

        {/* Installed Models Tab */}
        {activeTab === 'installed' && (
          <div className="flex flex-col gap-4">
            {installedModels.length === 0 ? (
              <div className="p-8 rounded-xl bg-bg-elevated border border-border-subtle text-center">
                <Cpu className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="text-body-md text-text-primary mb-2">No models installed</p>
                <p className="text-body-sm text-text-muted mb-4">
                  Switch to the "Available" tab to install models.
                </p>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="px-4 py-2 rounded-lg bg-accent text-bg-base text-body-sm hover:bg-accent-hover transition-colors"
                >
                  Browse Models
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {installedModels.map((model) => {
                  const isSelected = selection?.modelId === model.id && selection?.engineId === model.engineId;
                  return (
                    <motion.div
                      key={`${model.engineId}-${model.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-4 rounded-xl border flex items-center justify-between transition-all",
                        isSelected
                          ? "bg-accent/5 border-accent/30"
                          : "bg-bg-surface border-border-subtle hover:border-accent/20"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          isSelected ? "bg-accent" : "bg-bg-elevated"
                        )}>
                          <Cpu className={cn("w-5 h-5", isSelected ? "text-bg-base" : "text-text-muted")} />
                        </div>
                        <div>
                          <p className={cn(
                            "text-body-md font-medium",
                            isSelected ? "text-accent" : "text-text-primary"
                          )}>
                            {model.name}
                          </p>
                          <div className="flex items-center gap-2 text-caption text-text-muted">
                            <span>{model.size}</span>
                            <span>•</span>
                            <span className="capitalize">{model.engineId}</span>
                            {isSelected && (
                              <>
                                <span>•</span>
                                <span className="text-accent">Selected</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {!isSelected && (
                        <button
                          onClick={() => handleSelectModel(model)}
                          className="px-3 py-1.5 rounded-lg text-body-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                        >
                          Select
                        </button>
                      )}
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-accent" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Catalog Tab */}
        {activeTab === 'catalog' && (
          <div className="flex flex-col gap-4">
            {pullJob && (pullJob.status === 'downloading' || pullJob.status === 'verifying' || pullJob.status === 'queued') && (
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-body-sm font-medium text-text-primary">
                    Installing {pullJob.modelId}
                  </p>
                  <span className="text-caption text-accent">{pullJob.progressPercent}%</span>
                </div>
                <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${pullJob.progressPercent}%` }}
                  />
                </div>
                <p className="text-caption text-text-muted mt-2">
                  {pullJob.message || 'Downloading...'}
                </p>
              </div>
            )}

            {pullError && (
              <div className="p-4 rounded-xl bg-error/5 border border-error/20 flex items-center justify-between">
                <p className="text-body-sm text-error">{pullError}</p>
                <button onClick={() => setPullError(null)}>
                  <X className="w-4 h-4 text-error" />
                </button>
              </div>
            )}

            <div className="space-y-2">
              {catalogModels.map((model) => {
                const isInstalled = installedModels.some(
                  m => m.engineId === model.engineId && m.name === model.name
                );
                const isAvailable = getEngineStatus(model.engineId) === 'running';
                
                return (
                  <motion.div
                    key={`${model.engineId}-${model.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-bg-surface border border-border-subtle"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-body-md font-medium text-text-primary">{model.name}</p>
                          {model.tags.includes('recommended') && (
                            <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-medium">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-caption text-text-muted mt-1">{model.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-caption text-text-muted">
                          <span>{formatBytes(model.sizeBytes)}</span>
                          <span>•</span>
                          <span>{model.parameterSize}</span>
                          <span>•</span>
                          <span className="capitalize">{model.engineId}</span>
                        </div>
                      </div>
                      <div>
                        {isInstalled ? (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm text-success bg-success/10">
                            <CheckCircle2 className="w-4 h-4" />
                            Installed
                          </span>
                        ) : isAvailable ? (
                          <button
                            onClick={() => handlePullModel(model)}
                            disabled={isPulling}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm text-bg-base bg-accent hover:bg-accent-hover transition-colors disabled:opacity-50"
                          >
                            {isPulling ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Installing...
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4" />
                                Install
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm text-text-muted bg-bg-elevated">
                            <AlertCircle className="w-4 h-4" />
                            {getEngineName(model.engineId)} not running
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Appearance Section */}
        <section className="flex flex-col gap-6 mt-4">
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

      </div>
    </motion.div>
  );
}
