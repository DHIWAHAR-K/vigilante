/**
 * Returns true when the composer should submit: Cmd/Ctrl+Enter (not plain Enter).
 */
export function isComposerSubmitShortcut(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
}): boolean {
  return event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.shiftKey;
}
