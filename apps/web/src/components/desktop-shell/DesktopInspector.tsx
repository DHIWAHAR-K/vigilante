'use client';

import { motion } from 'framer-motion';
import { Download, ExternalLink, Globe, Link2, Radar, Settings2 } from 'lucide-react';

import type {
  AttachmentSummary,
  Citation,
  OllamaRuntimeStatusInfo,
  ResearchProgressEvent,
  ThreadDetail,
  WebSource,
} from '@/lib/desktop/client';
import { cn } from '@/lib/utils';
import { attachmentKindLabel, formatBytes, runtimeLabel, runtimeTone } from './utils';

interface DesktopInspectorProps {
  activeThread: ThreadDetail | null;
  citations: Citation[];
  attachments: AttachmentSummary[];
  threadSources: WebSource[];
  runtimeStatus: OllamaRuntimeStatusInfo | null;
  researchProgress: ResearchProgressEvent | null;
  exportPath: string | null;
  onExportMarkdown: () => void;
  onExportJson: () => void;
  onOpenSettings: () => void;
}

export function DesktopInspector({
  activeThread,
  citations,
  attachments,
  threadSources,
  runtimeStatus,
  researchProgress,
  exportPath,
  onExportMarkdown,
  onExportJson,
  onOpenSettings,
}: DesktopInspectorProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 18 }}
      className="desktop-inspector w-[360px] shrink-0 border-l border-border-subtle"
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-border-subtle px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.26em] text-text-muted">Inspector</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-text-primary">Research state</h3>
              <p className="mt-1 text-xs text-text-muted">
                Citations, attachments, exports, and runtime context.
              </p>
            </div>
            <button onClick={onOpenSettings} className="desktop-icon-button" title="Open settings">
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <section className="desktop-card gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text-primary">Runtime</p>
                <p className="mt-1 text-xs text-text-muted">
                  {runtimeStatus?.baseUrl ?? 'http://127.0.0.1:11434'}
                </p>
              </div>
              <span className={cn('desktop-pill', runtimeTone(runtimeStatus))}>
                {runtimeLabel(runtimeStatus)}
              </span>
            </div>
            {researchProgress && (
              <div className="rounded-2xl border border-accent/20 bg-accent/8 px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-accent">
                  {researchProgress.phase.replaceAll('_', ' ')}
                </p>
                <p className="mt-2 text-sm text-text-primary">{researchProgress.message}</p>
              </div>
            )}
          </section>

          <section className="desktop-card gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text-primary">Thread exports</p>
                <p className="mt-1 text-xs text-text-muted">
                  Save the current conversation as Markdown or JSON.
                </p>
              </div>
              <Download className="h-4 w-4 text-text-muted" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={onExportMarkdown} disabled={!activeThread} className="desktop-secondary-button justify-center px-3 py-2.5 disabled:opacity-50">
                Markdown
              </button>
              <button onClick={onExportJson} disabled={!activeThread} className="desktop-secondary-button justify-center px-3 py-2.5 disabled:opacity-50">
                JSON
              </button>
            </div>
            {exportPath && <p className="break-all text-xs text-text-muted">{exportPath}</p>}
          </section>

          <section className="desktop-card gap-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-text-muted" />
              <div>
                <p className="text-sm font-medium text-text-primary">Citations</p>
                <p className="text-xs text-text-muted">{citations.length} source references</p>
              </div>
            </div>
            {citations.length > 0 ? (
              <div className="space-y-2">
                {citations.map((citation) => (
                  <a
                    key={citation.id}
                    href={citation.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-border-subtle bg-bg-base/80 px-3 py-3 transition-colors hover:border-accent/25"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium text-text-primary">
                          [{citation.index}] {citation.title}
                        </p>
                        {citation.domain && <p className="mt-1 text-xs text-text-muted">{citation.domain}</p>}
                      </div>
                      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" />
                    </div>
                    {citation.excerpt && (
                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-text-secondary">
                        {citation.excerpt}
                      </p>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <EmptyCard icon={Link2} text="Citations from web retrieval appear here when a research-enabled answer finishes." />
            )}
          </section>

          <section className="desktop-card gap-3">
            <div className="flex items-center gap-2">
              <Radar className="h-4 w-4 text-text-muted" />
              <div>
                <p className="text-sm font-medium text-text-primary">Attachments</p>
                <p className="text-xs text-text-muted">{attachments.length} local files linked to this chat</p>
              </div>
            </div>
            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="rounded-2xl border border-border-subtle bg-bg-base/80 px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-medium text-text-primary">
                          {attachment.displayName}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          {attachmentKindLabel(attachment.kind)} · {formatBytes(attachment.sizeBytes)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyCard icon={Radar} text="Uploaded files and images remain local and show up here after they are attached to the conversation." />
            )}
          </section>

          <section className="desktop-card gap-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-text-muted" />
              <div>
                <p className="text-sm font-medium text-text-primary">Fetched pages</p>
                <p className="text-xs text-text-muted">{threadSources.length} cached web sources</p>
              </div>
            </div>
            {threadSources.length > 0 ? (
              <div className="space-y-2">
                {threadSources.map((source) => (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-border-subtle bg-bg-base/80 px-3 py-3 transition-colors hover:border-accent/25"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium text-text-primary">{source.title}</p>
                        {source.domain && <p className="mt-1 text-xs text-text-muted">{source.domain}</p>}
                      </div>
                      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" />
                    </div>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-text-secondary">
                      {source.excerpt}
                    </p>
                  </a>
                ))}
              </div>
            ) : (
              <EmptyCard icon={Globe} text="Fetched pages from research runs will be listed here with their cached excerpts." />
            )}
          </section>
        </div>
      </div>
    </motion.aside>
  );
}

function EmptyCard({
  icon: Icon,
  text,
}: {
  icon: typeof Link2;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border-medium bg-bg-base/60 px-4 py-4">
      <Icon className="h-4 w-4 text-text-muted" />
      <p className="mt-3 text-xs leading-5 text-text-muted">{text}</p>
    </div>
  );
}
