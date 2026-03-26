import {
  DesktopContextItem,
  OllamaRuntimeStatusInfo,
  QueryMode,
  WorkspaceContextItem,
} from '@/lib/desktop/client';

import { ModePreset, PendingAttachment } from './types';

const imagePattern = /\.(avif|bmp|gif|heic|jpeg|jpg|png|svg|webp)$/i;

export const MODE_PRESETS: ModePreset[] = [
  { mode: 'ask', label: 'Write', subtitle: 'Draft and answer' },
  { mode: 'research', label: 'Learn', subtitle: 'Search and synthesize' },
  { mode: 'deep_research', label: 'Code', subtitle: 'Investigate deeply' },
];

export function formatPreviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function deriveTitle(query: string) {
  const first = query.trim().split(/[.!?\n]/)[0] ?? query.trim();
  return first.length <= 54 ? first : `${first.slice(0, 53)}…`;
}

export function buildContextItem(item: WorkspaceContextItem): DesktopContextItem {
  return {
    id: item.id,
    kind:
      item.kind === 'directory'
        ? 'directory'
        : item.kind === 'thread'
          ? 'thread'
          : item.kind === 'url'
            ? 'url'
            : 'file',
    title: item.title,
    path: item.path,
    value: item.path ?? item.title,
  };
}

export function inferWorkspaceName(path: string) {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? 'Workspace';
}

export function runtimeLabel(status: OllamaRuntimeStatusInfo | null) {
  switch (status?.status) {
    case 'running':
      return 'Ready';
    case 'available':
      return 'No models';
    case 'stopped':
      return 'Stopped';
    case 'not_installed':
      return 'Not installed';
    case 'error':
      return 'Unavailable';
    default:
      return 'Checking';
  }
}

export function runtimeTone(status: OllamaRuntimeStatusInfo | null) {
  switch (status?.status) {
    case 'running':
      return 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10';
    case 'available':
      return 'text-amber-200 border-amber-500/20 bg-amber-500/10';
    case 'stopped':
    case 'not_installed':
    case 'error':
      return 'text-rose-300 border-rose-500/20 bg-rose-500/10';
    default:
      return 'text-text-secondary border-border-subtle bg-bg-surface/70';
  }
}

export function formatModelSize(sizeBytes: number) {
  if (sizeBytes >= 1024 ** 3) {
    return `${(sizeBytes / 1024 ** 3).toFixed(1)} GB`;
  }
  if (sizeBytes >= 1024 ** 2) {
    return `${(sizeBytes / 1024 ** 2).toFixed(1)} MB`;
  }
  return `${sizeBytes} B`;
}

export function resolveGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 5) {
    return 'Hello, night owl';
  }
  if (hour < 12) {
    return 'Hello, early bird';
  }
  if (hour < 18) {
    return 'Hello, daylight thinker';
  }
  if (hour < 22) {
    return 'Hello, evening researcher';
  }
  return 'Hello, night owl';
}

export function createAttachment(path: string): PendingAttachment {
  const cleanPath = path.trim();
  const name = cleanPath.split(/[\\/]/).filter(Boolean).at(-1) ?? cleanPath;
  const kind = imagePattern.test(name) ? 'image' : 'file';
  const id = `attachment:${cleanPath}`;

  return {
    id,
    name,
    path: cleanPath,
    kind,
    contextItem: {
      id,
      kind: 'file',
      title: name,
      path: cleanPath,
      value: cleanPath,
    },
  };
}

export function extractDroppedPaths(files: FileList) {
  const paths: string[] = [];

  Array.from(files).forEach((file) => {
    const candidate = (file as File & { path?: string }).path;
    if (candidate) {
      paths.push(candidate);
    }
  });

  return paths;
}

export function modeLabel(mode: QueryMode) {
  return mode.replaceAll('_', ' ');
}
