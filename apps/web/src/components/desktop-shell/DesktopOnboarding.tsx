'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Files,
  FolderSearch2,
  Loader2,
  Radar,
} from 'lucide-react';

import type {
  ModelInfo,
  OllamaRuntimeStatusInfo,
  StorageInfo,
  Workspace,
} from '@/lib/desktop/client';
import { cn } from '@/lib/utils';
import { formatBytes, runtimeLabel, runtimeTone } from './utils';

interface DesktopOnboardingProps {
  open: boolean;
  workspace: Workspace | null;
  runtimeStatus: OllamaRuntimeStatusInfo | null;
  runtimeModels: ModelInfo[];
  selectedModelId: string;
  storageInfo: StorageInfo | null;
  runtimeBusy: boolean;
  onEnsureRuntime: () => void;
  onSelectModel: (modelId: string) => void;
  onComplete: () => void;
}

const steps = ['Welcome', 'Storage', 'Runtime', 'Model', 'Ready'] as const;

export function DesktopOnboarding({
  open,
  workspace,
  runtimeStatus,
  runtimeModels,
  selectedModelId,
  storageInfo,
  runtimeBusy,
  onEnsureRuntime,
  onSelectModel,
  onComplete,
}: DesktopOnboardingProps) {
  const [step, setStep] = useState(0);
  const selectedModel = useMemo(
    () => runtimeModels.find((model) => model.id === selectedModelId) ?? runtimeModels[0] ?? null,
    [runtimeModels, selectedModelId],
  );

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-[#050608]/92 px-6 py-6 backdrop-blur-xl"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-[20%] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(244,173,82,0.18),transparent_60%)]" />
        <div className="absolute left-[12%] top-[18%] h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_68%)]" />
        <div className="absolute bottom-[12%] right-[10%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(244,173,82,0.12),transparent_68%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative z-10 flex w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/10 bg-[#0c1015]/94 shadow-[0_28px_80px_rgba(0,0,0,0.45)]"
      >
        <div className="hidden w-[300px] shrink-0 border-r border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-8 lg:block">
          <p className="text-[10px] uppercase tracking-[0.28em] text-text-muted">Welcome to Vigilante</p>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white">
            Desktop research without surrendering local control.
          </h2>
          <div className="mt-8 space-y-3">
            {steps.map((label, index) => (
              <div
                key={label}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors',
                  index === step
                    ? 'border-accent/30 bg-accent/10 text-white'
                    : 'border-transparent bg-white/[0.02] text-text-secondary',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border text-xs',
                    index <= step
                      ? 'border-accent/35 bg-accent/14 text-accent-bright'
                      : 'border-white/10 text-text-muted',
                  )}
                >
                  {index + 1}
                </span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-h-[640px] flex-1 flex-col p-6 md:p-8">
          <div className="mb-6 flex items-center gap-2">
            {steps.map((label, index) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={cn(
                    'h-2.5 rounded-full transition-all',
                    index === step ? 'w-10 bg-accent' : index < step ? 'w-6 bg-accent/70' : 'w-6 bg-white/12',
                  )}
                />
              </div>
            ))}
          </div>

          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                className="h-full"
              >
                {step === 0 && (
                  <StepLayout
                    eyebrow="Private desktop intelligence"
                    title="A Codex-grade workspace for research, retrieval, and saved local conversations."
                    body="Vigilante stores chats, attachments, cached pages, and exports on your machine. The shell is optimized for deep work, not just single prompts."
                  >
                    <FeatureList
                      items={[
                        ['Saved locally', 'Drafts, threads, and attachments persist without cloud sync.'],
                        ['File-aware', 'Attach files and images or mention workspace context inline.'],
                        ['Research-first', 'Use web retrieval and source inspection without leaving the chat.'],
                      ]}
                    />
                  </StepLayout>
                )}

                {step === 1 && (
                  <StepLayout
                    eyebrow="Local storage"
                    title="Your data directory and workspace are ready."
                    body="This app keeps its own local storage and can ground answers in selected workspaces and uploaded files."
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <MetricCard icon={Database} label="Storage path" value={storageInfo?.basePath ?? 'Loading…'} multiline />
                      <MetricCard icon={FolderSearch2} label="Active workspace" value={workspace?.name ?? 'Default workspace'} />
                      <MetricCard icon={Files} label="Saved threads" value={String(storageInfo?.threadCount ?? 0)} />
                      <MetricCard icon={Radar} label="Disk usage" value={formatBytes(storageInfo?.totalSizeBytes ?? 0)} />
                    </div>
                  </StepLayout>
                )}

                {step === 2 && (
                  <StepLayout
                    eyebrow="Runtime detection"
                    title="Check that your local model runtime is reachable."
                    body="Vigilante uses the local Ollama runtime path for desktop chat. You can continue once the runtime is available, but it is best to verify it now."
                  >
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">Ollama runtime</p>
                          <p className="mt-1 text-sm text-text-secondary">
                            {runtimeStatus?.baseUrl ?? 'http://127.0.0.1:11434'}
                          </p>
                        </div>
                        <span className={cn('desktop-pill', runtimeTone(runtimeStatus))}>
                          {runtimeLabel(runtimeStatus)}
                        </span>
                      </div>
                      <button
                        onClick={onEnsureRuntime}
                        className="desktop-primary-button mt-5 justify-center px-4 py-3"
                      >
                        {runtimeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        {runtimeBusy ? 'Checking runtime' : 'Ensure runtime'}
                      </button>
                    </div>
                  </StepLayout>
                )}

                {step === 3 && (
                  <StepLayout
                    eyebrow="Model selection"
                    title="Choose the default local model for new conversations."
                    body="You can change this later in settings. The selected model becomes the default for new threads and drafts."
                  >
                    <div className="grid gap-3">
                      {runtimeModels.length === 0 ? (
                        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-5 py-5 text-sm text-text-secondary">
                          No local models are listed yet. You can still continue and choose one later once the runtime is populated.
                        </div>
                      ) : (
                        runtimeModels.map((model) => {
                          const active = model.id === selectedModelId;
                          return (
                            <button
                              key={model.id}
                              onClick={() => onSelectModel(model.id)}
                              className={cn(
                                'rounded-[28px] border px-5 py-4 text-left transition-colors',
                                active
                                  ? 'border-accent/30 bg-accent/10'
                                  : 'border-white/10 bg-white/[0.03] hover:border-white/20',
                              )}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-base font-medium text-white">{model.name}</p>
                                  <p className="mt-1 text-sm text-text-secondary">
                                    {formatBytes(model.sizeBytes)}
                                    {model.family ? ` · ${model.family}` : ''}
                                  </p>
                                </div>
                                {active && <CheckCircle2 className="h-5 w-5 text-accent" />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </StepLayout>
                )}

                {step === 4 && (
                  <StepLayout
                    eyebrow="Ready to launch"
                    title="The redesigned desktop shell is ready."
                    body="You now have a three-pane research workspace with local history, attachments, inspector surfaces, and desktop settings."
                  >
                    <div className="grid gap-4 md:grid-cols-3">
                      <MetricCard icon={CheckCircle2} label="Runtime" value={runtimeLabel(runtimeStatus)} />
                      <MetricCard icon={Radar} label="Default model" value={selectedModel?.name ?? 'Choose later'} />
                      <MetricCard icon={Database} label="Drafts + threads" value="Stored locally" />
                    </div>
                  </StepLayout>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              className={cn(
                'desktop-secondary-button px-4 py-3',
                step === 0 && 'pointer-events-none opacity-0',
              )}
            >
              Back
            </button>

            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
                className="desktop-primary-button px-5 py-3"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={onComplete} className="desktop-primary-button px-5 py-3">
                Open desktop
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StepLayout({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <p className="text-[10px] uppercase tracking-[0.28em] text-accent">{eyebrow}</p>
      <h3 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
        {title}
      </h3>
      <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary">{body}</p>
      <div className="mt-8 flex-1">{children}</div>
    </div>
  );
}

function FeatureList({ items }: { items: [string, string][] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map(([title, body]) => (
        <div key={title} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="mt-3 text-sm leading-6 text-text-secondary">{body}</p>
        </div>
      ))}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  multiline = false,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
      <Icon className="h-5 w-5 text-accent" />
      <p className="mt-4 text-[10px] uppercase tracking-[0.24em] text-text-muted">{label}</p>
      <p className={cn('mt-2 text-sm text-white', multiline && 'break-all leading-6')}>{value}</p>
    </div>
  );
}
