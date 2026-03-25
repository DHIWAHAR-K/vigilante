import type {
  AttachmentKind,
  AttachmentSummary,
  OllamaRuntimeStatusInfo,
  QueryMode,
} from '@/lib/desktop/client';

export function formatPreviewDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function formatRelativeTime(value?: string | null) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatPreviewDate(value);
}

export function formatModeLabel(mode: QueryMode) {
  switch (mode) {
    case 'ask':
      return 'Ask';
    case 'research':
      return 'Research';
    case 'deep_research':
      return 'Deep Research';
    case 'rag':
      return 'RAG';
    default:
      return mode;
  }
}

export function runtimeLabel(status: OllamaRuntimeStatusInfo | null) {
  switch (status?.status) {
    case 'running':
      return 'Running';
    case 'available':
      return 'No models';
    case 'stopped':
      return 'Stopped';
    case 'not_installed':
      return 'Not installed';
    case 'error':
      return 'Error';
    default:
      return 'Unknown';
  }
}

export function runtimeTone(status: OllamaRuntimeStatusInfo | null) {
  switch (status?.status) {
    case 'running':
      return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200';
    case 'available':
      return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
    case 'stopped':
    case 'not_installed':
    case 'error':
      return 'border-rose-300/25 bg-rose-300/10 text-rose-200';
    default:
      return 'border-border-subtle bg-bg-surface text-text-muted';
  }
}

export function formatBytes(sizeBytes: number) {
  if (sizeBytes >= 1024 ** 3) {
    return `${(sizeBytes / 1024 ** 3).toFixed(1)} GB`;
  }
  if (sizeBytes >= 1024 ** 2) {
    return `${(sizeBytes / 1024 ** 2).toFixed(1)} MB`;
  }
  if (sizeBytes >= 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }
  return `${sizeBytes} B`;
}

export function deriveTitle(query: string) {
  const first = query.trim().split(/[.!?\n]/)[0] ?? query.trim();
  return first.length <= 58 ? first : `${first.slice(0, 57)}…`;
}

export function inferWorkspaceName(path: string) {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? 'Workspace';
}

export function attachmentKindLabel(kind: AttachmentKind) {
  switch (kind) {
    case 'image':
      return 'Image';
    case 'document':
      return 'Document';
    case 'code':
      return 'Code';
    case 'data':
      return 'Data';
    default:
      return 'File';
  }
}

export function isImageAttachment(attachment: Pick<AttachmentSummary, 'kind' | 'mimeType'>) {
  return attachment.kind === 'image' || attachment.mimeType.startsWith('image/');
}
