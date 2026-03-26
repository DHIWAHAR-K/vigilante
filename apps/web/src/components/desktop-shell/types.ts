import { DesktopContextItem, QueryMode } from '@/lib/desktop/client';

export interface PendingAttachment {
  id: string;
  name: string;
  path: string;
  kind: 'file' | 'image';
  contextItem: DesktopContextItem;
}

export interface ModePreset {
  mode: QueryMode;
  label: string;
  subtitle: string;
}
