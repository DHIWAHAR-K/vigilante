# Reference UI Transplant Design

## Goal

Replace Vigilante's current desktop chat UI with the visual shell from `DHIWAHAR-K/neat-chat-interface`, while preserving Vigilante's existing desktop behavior, data flow, and Tauri integrations.

## What Will Change

- Replace the current left rail/sidebar with the reference repo's Claude-style sidebar layout and collapse behavior.
- Replace the current empty-state workspace with the reference repo's centered welcome screen and composer.
- Replace the active-thread surface with the reference repo's header, message spacing, and chat composer treatment.
- Replace the current global theme tokens with a palette and spacing system aligned to the reference repo.

## What Will Not Change

- Thread loading, thread selection, archive/delete behavior, and workspace switching stay powered by Vigilante's existing desktop client.
- Query submission, streaming updates, runtime probing, exports, citations, and inspector/settings panels remain functional.
- File attachments and workspace mentions remain available, even where the reference repo did not support the same exact data model.
- The app remains branded as Vigilante rather than inheriting the reference repo's product naming.

## Mapping

### Sidebar

- Source inspiration: `src/components/chat/ChatSidebar.tsx`
- Vigilante target: `apps/web/src/components/desktop-shell/DesktopSidebar.tsx`
- Adaptations:
  - Keep `New chat`, conversation list, delete action, settings entry, inspector entry.
  - Keep workspace awareness, but present it inside the transplanted sidebar shell.
  - Do not bring over non-functional `Projects`, `Artifacts`, or `Code` sections unless they are represented as inert placeholders during styling.

### Welcome and Active Chat Surface

- Source inspiration: `src/pages/Index.tsx`, `src/components/chat/WelcomeScreen.tsx`, `src/components/chat/ChatMessage.tsx`
- Vigilante target: `apps/web/src/components/desktop-shell/DesktopWorkspace.tsx`
- Adaptations:
  - Empty state becomes the centered greeting plus reference-style input.
  - Thread state gets the simpler header and message stack from the reference UI.
  - Assistant citations and research-progress notices remain visible within the new layout.

### Composer

- Source inspiration: `src/components/chat/ChatInput.tsx`
- Vigilante target: `apps/web/src/components/desktop-shell/DesktopComposer.tsx`
- Adaptations:
  - Preserve file attachment chips and mention results.
  - Preserve model, mode, web-search, and image/upload controls.
  - Re-style those controls to sit behind the reference repo's lighter, rounded composer shell.

### Theme

- Source inspiration: `src/index.css`
- Vigilante target: `apps/web/src/app/globals.css`
- Adaptations:
  - Move Vigilante away from the current blue-glow desktop treatment.
  - Adopt the reference repo's softer neutral palette and cleaner surface hierarchy.
  - Keep enough token compatibility so existing components continue to render without a full CSS rewrite.

## Risks

- The reference repo is a Vite app with different assumptions, so the transplant must be structural rather than a direct copy-paste.
- Vigilante has more desktop-specific controls than the reference repo, so some parts will need visual translation rather than exact duplication.
- There are existing uncommitted changes in the worktree, so edits must avoid unrelated files.

## Validation

- Typecheck the web app after the transplant.
- Manually verify:
  - empty state,
  - active thread rendering,
  - sidebar collapse/expand,
  - send flow,
  - attachment chips,
  - mention picker visibility,
  - inspector/settings access.
