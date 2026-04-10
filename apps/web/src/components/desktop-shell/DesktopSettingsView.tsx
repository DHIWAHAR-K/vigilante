'use client';

import React, { useMemo } from 'react';
import { ArrowLeft, Check, Download, HardDriveDownload, Loader2, Maximize2, Minus, ShieldCheck, X } from 'lucide-react';
import { minimizeWindow, toggleMaximizeWindow, closeWindow } from '@/lib/desktop/client';

import {
  CatalogModel,
  ModelInfo,
  ModelInstallJob,
  Theme,
} from '@/lib/desktop/client';
import { cn } from '@/lib/utils';
import { ThemeSegmentedControl } from '@/components/theme/ThemeSegmentedControl';

import { formatBytes, formatModelSize } from './utils';

interface DesktopSettingsViewProps {
  activeInstallJobs: ModelInstallJob[];
  modelCatalog: CatalogModel[];
  onBackToChat: () => void;
  onCancelInstall: (jobId: string) => void;
  onInstallModel: (modelId: string) => void;
  onSelectModel: (modelId: string) => void;
  onThemeChange: (theme: Theme) => void;
  runtimeModels: ModelInfo[];
  selectedModelId: string | null;
  theme: Theme;
}

export function DesktopSettingsView({
  activeInstallJobs,
  modelCatalog,
  onBackToChat,
  onCancelInstall,
  onInstallModel,
  onSelectModel,
  onThemeChange,
  runtimeModels,
  selectedModelId,
  theme,
}: DesktopSettingsViewProps) {
  const installedModelIds = useMemo(
    () => new Set(runtimeModels.map((model) => model.id)),
    [runtimeModels],
  );

  const installJobByModelId = useMemo(() => {
    return activeInstallJobs.reduce<Record<string, ModelInstallJob>>((accumulator, job) => {
      accumulator[job.modelId] = job;
      return accumulator;
    }, {});
  }, [activeInstallJobs]);

  return (
    <main className="desktop-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-bg-base">
      {/* Titlebar drag region with window controls */}
      <div
        data-tauri-drag-region
        className="flex h-11 shrink-0 items-center pl-20 pr-4"
      >
        <div data-tauri-drag-region className="flex-1" />
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => void minimizeWindow()}
            className="rounded p-1.5 text-text-muted transition hover:bg-bg-elevated hover:text-text-primary"
            title="Minimize"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => void toggleMaximizeWindow()}
            className="rounded p-1.5 text-text-muted transition hover:bg-bg-elevated hover:text-text-primary"
            title="Maximize / Restore"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => void closeWindow()}
            className="rounded p-1.5 text-text-muted transition hover:bg-bg-elevated hover:text-destructive"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-6 lg:px-10">
        <div>
          <div>
            <button
              onClick={onBackToChat}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-surface px-3 py-1.5 text-[12px] text-text-secondary transition hover:bg-bg-elevated hover:text-text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to chat
            </button>
            <h1 className="text-display-sm text-text-primary">Settings</h1>
            <p className="mt-2 max-w-2xl text-body-sm text-text-secondary">
              Vigilante keeps everything on-device. Choose your theme and manage the local models
              available in the desktop composer.
            </p>
          </div>
        </div>

        <section className="desktop-panel-strong w-full rounded-[28px] p-6">
          <div className="mb-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-text-muted">
            <ShieldCheck className="h-3.5 w-3.5" />
            Appearance
          </div>
          <h2 className="text-heading-md text-text-primary">Theme</h2>
          <p className="mt-2 max-w-full text-body-sm text-text-secondary">
            Choose how Vigilante looks across the desktop shell.
          </p>

          <div className="mt-5">
            <ThemeSegmentedControl value={theme} onChange={onThemeChange} />
          </div>
        </section>

        <section className="desktop-panel-strong rounded-[32px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-text-muted">
                <HardDriveDownload className="h-3.5 w-3.5" />
                Local Models
              </div>
              <h2 className="text-heading-md text-text-primary">Choose models for this desktop</h2>
              <p className="mt-2 max-w-2xl text-body-sm text-text-secondary">
                Downloaded models stay on this machine and become available in the composer as soon
                as they are ready.
              </p>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-bg-surface px-4 py-3 text-right">
              <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Selected Model</p>
              <p className="mt-2 text-[13px] text-text-primary">{selectedModelId ?? 'None selected'}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {modelCatalog.map((model) => {
              const installJob = installJobByModelId[model.id];
              const isInstalled = installedModelIds.has(model.id);
              const isSelected = selectedModelId === model.id;

              return (
                <article
                  key={model.id}
                  className="rounded-[26px] border border-border-subtle bg-bg-surface px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[16px] font-medium text-text-primary">{model.name}</h3>
                        {isSelected && (
                          <span className="rounded-full border border-accent/15 bg-accent/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-text-primary">
                            In use
                          </span>
                        )}
                        {isInstalled && !isSelected && (
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-300">
                            Installed
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-body-sm text-text-secondary">{model.description}</p>
                    </div>

                    <div className="shrink-0 rounded-2xl border border-border-subtle bg-bg-base px-3 py-2 text-right">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-text-muted">Size</p>
                      <p className="mt-1 text-[13px] text-text-primary">{formatModelSize(model.sizeBytes)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-bg-elevated px-2.5 py-1 text-[11px] text-text-secondary">
                      {model.parameterSize}
                    </span>
                    <span className="rounded-full bg-bg-elevated px-2.5 py-1 text-[11px] text-text-secondary">
                      {model.contextWindow.toLocaleString()} ctx
                    </span>
                    {model.family && (
                      <span className="rounded-full bg-bg-elevated px-2.5 py-1 text-[11px] text-text-secondary">
                        {model.family}
                      </span>
                    )}
                    {model.minMemoryGb && (
                      <span className="rounded-full bg-bg-elevated px-2.5 py-1 text-[11px] text-text-secondary">
                        {model.minMemoryGb} GB RAM
                      </span>
                    )}
                  </div>

                  {installJob && (
                    <div className="mt-5 rounded-2xl border border-border-subtle bg-bg-base px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[12px] font-medium text-text-primary">
                            {installJob.message ?? 'Downloading…'}
                          </p>
                          <p className="mt-1 text-[11px] text-text-muted">
                            {installJob.progressPercent}% complete
                            {installJob.downloadedBytes && installJob.totalBytes
                              ? ` · ${formatBytes(installJob.downloadedBytes)} of ${formatBytes(installJob.totalBytes)}`
                              : ''}
                          </p>
                        </div>

                        <button
                          onClick={() => onCancelInstall(installJob.id)}
                          className="rounded-full border border-border-subtle bg-bg-surface px-3 py-1.5 text-[11px] text-text-secondary transition hover:bg-bg-elevated hover:text-text-primary"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-elevated">
                        <div
                          className="h-full rounded-full bg-accent transition-[width] duration-300"
                          style={{ width: `${installJob.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[12px] text-text-muted">
                      {model.tags.slice(0, 3).join(' · ') || 'General purpose'}
                    </div>

                    {installJob ? (
                      <button
                        disabled
                        className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-bg-elevated px-4 py-2 text-[12px] font-medium text-text-muted"
                      >
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Downloading
                      </button>
                    ) : isInstalled ? (
                      <button
                        onClick={() => onSelectModel(model.id)}
                        disabled={isSelected}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium transition',
                          isSelected
                            ? 'cursor-default bg-accent text-bg-base'
                            : 'border border-border-subtle bg-bg-base text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {isSelected ? 'Selected' : 'Use model'}
                      </button>
                    ) : (
                      <button
                        onClick={() => onInstallModel(model.id)}
                        className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[12px] font-medium text-bg-base transition hover:bg-accent-bright"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
