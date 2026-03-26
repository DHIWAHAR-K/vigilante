'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, Search, Settings2, X } from 'lucide-react';

import {
  AppSettings,
  ModelInfo,
  OllamaRuntimeStatusInfo,
  RuntimeSettings,
} from '@/lib/desktop/client';
import { cn } from '@/lib/utils';

import { formatModelSize, runtimeLabel, runtimeTone } from './utils';

interface DesktopSettingsPanelProps {
  onClose: () => void;
  onEnsureRuntime: () => void;
  onProbeRuntime: () => void;
  onSave: () => void;
  onSettingsChange: (settings: AppSettings) => void;
  onRuntimeChange: (settings: RuntimeSettings) => void;
  open: boolean;
  runtimeBusy: boolean;
  runtimeModels: ModelInfo[];
  runtimeStatus: OllamaRuntimeStatusInfo | null;
  runtimeDraft: RuntimeSettings | null;
  settingsBusy: boolean;
  settingsDraft: AppSettings | null;
  settingsNotice: string | null;
}

export function DesktopSettingsPanel({
  onClose,
  onEnsureRuntime,
  onProbeRuntime,
  onSave,
  onSettingsChange,
  onRuntimeChange,
  open,
  runtimeBusy,
  runtimeModels,
  runtimeStatus,
  runtimeDraft,
  settingsBusy,
  settingsDraft,
  settingsNotice,
}: DesktopSettingsPanelProps) {
  if (!settingsDraft || !runtimeDraft) {
    return null;
  }

  const effectiveModels = runtimeModels.length > 0 ? runtimeModels : runtimeStatus?.models ?? [];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-x-0 top-8 z-50 mx-auto flex w-[min(920px,calc(100vw-32px))] max-w-[920px] flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#151412]/96 shadow-[0_36px_90px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Customize</p>
                <h2 className="mt-1 font-serif text-[30px] tracking-[-0.02em] text-[#f1e8df]">
                  Desktop settings
                </h2>
              </div>
              <button onClick={onClose} className="desktop-pill">
                <X className="h-3.5 w-3.5" />
                Close
              </button>
            </div>

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.1fr,0.9fr]">
              <div className="space-y-6">
                <section className="desktop-panel-strong rounded-[28px] p-5">
                  <div className="mb-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-text-muted">
                    <Settings2 className="h-3.5 w-3.5" />
                    Experience
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-[12px] text-text-secondary">Theme</span>
                      <select
                        value={settingsDraft.appearance.theme}
                        onChange={(event) =>
                          onSettingsChange({
                            ...settingsDraft,
                            appearance: {
                              ...settingsDraft.appearance,
                              theme: event.target.value as AppSettings['appearance']['theme'],
                            },
                          })
                        }
                        className="desktop-field"
                      >
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="system">System</option>
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-[12px] text-text-secondary">Font size</span>
                      <select
                        value={settingsDraft.appearance.fontSize}
                        onChange={(event) =>
                          onSettingsChange({
                            ...settingsDraft,
                            appearance: {
                              ...settingsDraft.appearance,
                              fontSize: event.target.value as AppSettings['appearance']['fontSize'],
                            },
                          })
                        }
                        className="desktop-field"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </label>
                  </div>

                  <label className="mt-4 flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div>
                      <p className="text-[12px] text-text-primary">Enable web search by default</p>
                      <p className="mt-1 text-[11px] text-text-muted">
                        Let research runs fetch current sources automatically.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsDraft.search.enabledByDefault}
                      onChange={(event) =>
                        onSettingsChange({
                          ...settingsDraft,
                          search: {
                            ...settingsDraft.search,
                            enabledByDefault: event.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                  </label>
                </section>

                <section className="desktop-panel-strong rounded-[28px] p-5">
                  <div className="mb-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-text-muted">
                    <Search className="h-3.5 w-3.5" />
                    Runtime
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-[12px] text-text-secondary">Base URL</span>
                      <input
                        value={runtimeDraft.ollamaBaseUrl}
                        onChange={(event) =>
                          onRuntimeChange({
                            ...runtimeDraft,
                            ollamaBaseUrl: event.target.value,
                          })
                        }
                        className="desktop-field"
                      />
                    </label>

                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-[12px] text-text-secondary">Default model</span>
                      <select
                        value={runtimeDraft.defaultModel ?? settingsDraft.defaultProvider.modelId}
                        onChange={(event) =>
                          onRuntimeChange({
                            ...runtimeDraft,
                            defaultModel: event.target.value,
                          })
                        }
                        className="desktop-field"
                      >
                        {effectiveModels.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name} ({formatModelSize(model.sizeBytes)})
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button onClick={onProbeRuntime} className="desktop-pill">
                      Probe runtime
                    </button>
                    <button
                      onClick={onEnsureRuntime}
                      disabled={runtimeBusy}
                      className="desktop-pill disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {runtimeBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Ensure ready
                    </button>
                    <span className={cn('rounded-full border px-3 py-1.5 text-[11px]', runtimeTone(runtimeStatus))}>
                      {runtimeLabel(runtimeStatus)}
                    </span>
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="desktop-panel-strong rounded-[28px] p-5">
                  <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-text-muted">
                    Available models
                  </p>

                  <div className="desktop-scrollbar max-h-[360px] space-y-2 overflow-y-auto pr-1">
                    {effectiveModels.length > 0 ? (
                      effectiveModels.map((model) => {
                        const active =
                          (runtimeDraft.defaultModel ?? settingsDraft.defaultProvider.modelId) === model.id;

                        return (
                          <button
                            key={model.id}
                            onClick={() =>
                              onRuntimeChange({
                                ...runtimeDraft,
                                defaultModel: model.id,
                              })
                            }
                            className={cn(
                              'w-full rounded-[22px] border px-4 py-3 text-left transition',
                              active
                                ? 'border-accent/25 bg-accent/10'
                                : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.05]',
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[13px] text-text-primary">{model.name}</p>
                                <p className="mt-1 text-[11px] text-text-muted">
                                  {formatModelSize(model.sizeBytes)}
                                  {model.family ? ` · ${model.family}` : ''}
                                </p>
                              </div>
                              {active && (
                                <span className="rounded-full border border-accent/25 bg-accent/10 px-2 py-1 text-[10px] text-accent">
                                  Selected
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-4 text-[12px] text-text-muted">
                        No local models were detected yet. Keep the runtime running, then probe again.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-3 text-[12px] text-text-secondary">
                  {settingsNotice ?? 'Changes here stay local and apply to the desktop app only.'}
                </section>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/8 px-6 py-4">
              <button onClick={onClose} className="desktop-pill">
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={settingsBusy}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[12px] font-medium text-[#16120d] transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-60"
              >
                {settingsBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save settings
              </button>
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
