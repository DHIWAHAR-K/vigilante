import { describe, expect, it } from 'vitest';

import { isComposerSubmitShortcut } from './composerSubmitShortcut';

describe('isComposerSubmitShortcut', () => {
  it('returns true for Cmd+Enter', () => {
    expect(
      isComposerSubmitShortcut({ key: 'Enter', metaKey: true, ctrlKey: false, shiftKey: false }),
    ).toBe(true);
  });

  it('returns true for Ctrl+Enter', () => {
    expect(
      isComposerSubmitShortcut({ key: 'Enter', metaKey: false, ctrlKey: true, shiftKey: false }),
    ).toBe(true);
  });

  it('returns false for plain Enter', () => {
    expect(
      isComposerSubmitShortcut({ key: 'Enter', metaKey: false, ctrlKey: false, shiftKey: false }),
    ).toBe(false);
  });

  it('returns false for Shift+Enter', () => {
    expect(
      isComposerSubmitShortcut({ key: 'Enter', metaKey: true, ctrlKey: false, shiftKey: true }),
    ).toBe(false);
  });
});
