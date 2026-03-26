'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, Loader2, PanelRightClose, Sparkles } from 'lucide-react';

import {
  Citation,
  OllamaRuntimeStatusInfo,
  ResearchProgressEvent,
  WebSource,
} from '@/lib/desktop/client';
import { cn } from '@/lib/utils';

import { runtimeLabel, runtimeTone } from './utils';

interface DesktopInspectorProps {
  citations: Citation[];
  exportPath: string | null;
  onClose: () => void;
  onEnsureRuntime: () => void;
  open: boolean;
  researchProgress: ResearchProgressEvent | null;
  runtimeBusy: boolean;
  runtimeStatus: OllamaRuntimeStatusInfo | null;
  sources: WebSource[];
}

export function DesktopInspector({
  citations,
  exportPath,
  onClose,
  onEnsureRuntime,
  open,
  researchProgress,
  runtimeBusy,
  runtimeStatus,
  sources,
}: DesktopInspectorProps) {
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
            className="fixed inset-0 z-30 bg-black/35 backdrop-blur-[2px]"
          />

          <motion.aside
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="fixed inset-y-4 right-4 z-40 hidden w-[360px] overflow-hidden rounded-[30px] border border-white/10 bg-[#151412]/96 shadow-[0_36px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl xl:flex xl:flex-col"
          >
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Inspector</p>
                <h2 className="mt-1 text-[18px] text-text-primary">Research details</h2>
              </div>
              <button onClick={onClose} className="desktop-pill">
                <PanelRightClose className="h-3.5 w-3.5" />
                Close
              </button>
            </div>

            <div className="desktop-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <section className="desktop-panel-strong rounded-[24px] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-text-primary">Runtime</p>
                    <p className="mt-1 text-[11px] text-text-muted">{runtimeStatus?.baseUrl ?? 'Local runtime'}</p>
                  </div>
                  <span className={cn('rounded-full border px-3 py-1 text-[11px]', runtimeTone(runtimeStatus))}>
                    {runtimeLabel(runtimeStatus)}
                  </span>
                </div>

                <button
                  onClick={onEnsureRuntime}
                  disabled={runtimeBusy}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-[11px] text-text-secondary transition hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {runtimeBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {runtimeBusy ? 'Checking runtime' : 'Check runtime'}
                </button>
              </section>

              {researchProgress && (
                <section className="rounded-[24px] border border-accent/20 bg-accent/8 p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-accent">
                    {researchProgress.phase.replaceAll('_', ' ')}
                  </p>
                  <p className="mt-2 text-[13px] text-text-primary">{researchProgress.message}</p>
                </section>
              )}

              {exportPath && (
                <section className="desktop-panel-strong rounded-[24px] p-4">
                  <p className="text-[11px] text-text-primary">Latest export</p>
                  <p className="mt-2 break-all text-[11px] text-text-muted">{exportPath}</p>
                </section>
              )}

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] uppercase tracking-[0.18em] text-text-muted">Citations</h3>
                  <span className="text-[11px] text-text-muted">{citations.length}</span>
                </div>

                {citations.length > 0 ? (
                  citations.map((citation) => (
                    <a
                      key={citation.id}
                      href={citation.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-[24px] border border-white/8 bg-white/[0.03] p-4 transition hover:border-white/12 hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] text-text-primary">{citation.title}</p>
                          {citation.domain && (
                            <p className="mt-1 text-[11px] text-text-muted">{citation.domain}</p>
                          )}
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                      </div>
                      {citation.excerpt && (
                        <p className="mt-3 line-clamp-4 text-[12px] text-text-secondary">
                          {citation.excerpt}
                        </p>
                      )}
                    </a>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-4 text-[12px] text-text-muted">
                    Citations will appear here after a research-enabled response.
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] uppercase tracking-[0.18em] text-text-muted">Fetched pages</h3>
                  <span className="text-[11px] text-text-muted">{sources.length}</span>
                </div>

                {sources.length > 0 ? (
                  sources.map((source) => (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-[24px] border border-white/8 bg-white/[0.03] p-4 transition hover:border-white/12 hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] text-text-primary">{source.title}</p>
                          {source.domain && (
                            <p className="mt-1 text-[11px] text-text-muted">{source.domain}</p>
                          )}
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                      </div>
                      <p className="mt-3 line-clamp-4 text-[12px] text-text-secondary">{source.excerpt}</p>
                    </a>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-4 text-[12px] text-text-muted">
                    Retrieved pages and source snapshots will appear here.
                  </div>
                )}
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
