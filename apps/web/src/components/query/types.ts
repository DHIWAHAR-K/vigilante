export type ContextItemType = 'doc' | 'url' | 'chat';

export interface ContextItem {
  id: string;
  type: ContextItemType;
  title: string;
}
