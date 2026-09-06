# How Vigilante works

Vigilante has **one conversation screen**. Ordinary questions, research, source-based questions, and web research all happen in that conversation. The left sidebar contains conversation history only. There is no bottom status, saved-state, workspace, or preview footer. On a phone, history opens from a header button; there are no bottom navigation tabs.

This document incorporates the owner's explicit correction to the earlier design. Do not implement Notebook, a separate Research destination, a global Sources library, dashboards, or a manually resizable query bar from superseded designs.

The Vigilante mark is `assets/vigilante-mark.svg`, reused in the header and assistant label. Its v path is centered at (12, 12) inside a 24×24 viewBox; do not use a text glyph whose font baseline shifts the mark. The phone header centers the brand between History and New.

The visual design follows the inspected Perplexity layout with Vigilante branding and an entirely neutral palette: near-black canvas, charcoal surfaces, white primary controls, and grayscale text, selections, citations, and focus states.

## Product and design authority

The [repository README](../README.md) establishes a private, local-first research product. The owner's current UI requirements are more specific: a minimal conversation interface, conversation-only history, and an automatically growing composer. References to notes in the README do not authorize adding a separate notebook feature.

The HTML/CSS/JavaScript here is a reviewable prototype. Application shell, runtime, storage, hardware support, and production phone deployment still follow the G1/G2 gates in [PROJECT_PLAN](../docs/PROJECT_PLAN.md) and [DEVELOPMENT](../docs/DEVELOPMENT.md). [ADR 0001](../docs/decisions/0001-proposed-research-workflow.md) records the current direction without choosing those technologies. No old implementation is restored and no product version changes.

## The complete interaction

1. **Start a conversation.** New is directly below the desktop sidebar header, including as a plus icon in the collapsed rail. On phones, New conversation is in the top bar. The same canvas initially shows “What do you want to know?” above a compact composer. The empty content is at most 640px wide, with no tagline or suggestion cards.
2. **Ask.** Type into the composer. It grows automatically with text, pasted paragraphs, or line breaks. It shrinks again when text is removed.
3. **Choose context if needed.** Add sources through the plus button. Web stays in the composer. On phones, the plus opens Conversation options with Add sources and Choose model; desktop keeps model selection directly in the composer. Neither action navigates away.
4. **Research in place.** Send adds the question and the assistant's response to the current message list. Follow-up questions, tool activity, web results, citations, and recoverable failures all belong there.
5. **Inspect evidence.** Small bracketed references such as [1], or an answer's Sources button open a compact dialog. Closing it returns to the same conversation and scroll position. No permanent right sidebar is needed.
6. **Continue later.** Select a conversation from history. Its messages, draft, Web selection, and attachment state return in the same canvas.

A local answer and a web-research answer must share the same message renderer and composer. Web is a per-conversation option, not a page, product section, or separate kind of history.

## Conversation history

Desktop uses a 240px history sidebar. Its top row contains the Vigilante wordmark, Search conversations, and Hide sidebar. New, a quiet History label, and recent conversation titles sit below. It has no app navigation, notes, sources, model controls, or profile cards. Selecting a title restores that conversation. Titles use up to two lines before truncating; the complete stored title remains available through a native hover tooltip and accessibility APIs. Rows use neutral text, a subtle background and a small selection marker for the active conversation.

Hide sidebar reduces the desktop sidebar to a 56px icon rail containing Show sidebar, New conversation, and Search conversations. Show sidebar restores the 240px history list. This view preference remains in page memory, preserves messages and drafts, and resets on reload. New remains in the sidebar on desktop and in the main header on phones.

Search conversations opens a compact dialog and focuses its search field on desktop. Filter stored conversation titles case-insensitively, show an explicit no-results state, and use Enter to select the first match. Escape closes the dialog and returns focus to its trigger. Cmd/Ctrl+K opens history search when another dialog is not already open. Search does not contact a provider.

Below 960 CSS pixels, the sidebar is hidden and a History header button opens the same list in a left drawer. The drawer has a Close button, title search, and Escape support. Initial focus stays on Close so opening history does not immediately open the phone keyboard. Selecting an item closes it. New conversation remains directly reachable in the phone header.

The prototype seeds three independent fictional conversations. Sending the first message in a new conversation inserts it into history; each conversation maintains its own message array, draft, Web option, and sample attachment flag. Data remains in page memory and resets on reload. Durable restore across app restarts is a production requirement to specify through the storage ADR, not a capability of this preview. Starting another blank conversation discards the previous unsent blank-conversation draft; existing history entries retain their drafts when switching.

## Composer behavior

Use a labeled native textarea with one initial line and `resize: none`. The input is initially 32px high. Recalculate after typing, paste, deletion, conversation restoration, and viewport changes:

1. Reset its height to `auto` so it can shrink.
2. Measure its `scrollHeight`.
3. Clamp height from 32px to `max(56px, min(192px, floor(visibleViewportHeight × 0.28)))`.
4. Enable internal vertical scrolling only when the content exceeds that cap.

The cap keeps Send and enough conversation content visible on a small phone or with a keyboard open. No drag handle, Expand button, or manual size control exists. Input font size is 16px with a 24px line height. Phone/touch composer controls have 44px targets; fine-pointer desktop composer controls use compact 36px targets.

Whitespace-only drafts cannot be sent. On fine-pointer devices, Enter sends and Shift+Enter inserts a newline; do not submit during IME composition. On coarse-pointer devices, Enter inserts a newline and the user taps Send. During a run, the input and Web option are disabled and Send becomes Stop. Stop cancels the simulated response, retains its partial text, and restores the latest submitted question in the composer. Try again retries that assistant response in place.

The message list scrolls independently above the composer. The composer is a normal flex child, so growing it reduces the scrollable message viewport instead of overlaying messages. The layout uses the visible viewport height and safe-area padding. Production Safari/Chrome keyboard and assistive-technology testing is still required.

## Web research in the same conversation

Web starts off for a new conversation. The Web button changes only that conversation's option. When sending with Web enabled, review a compact dialog showing the exact query, destination, and included data. The prototype destination is an unconnected example provider; no real request is made. Cancel preserves the draft. Search once adds the question and simulated response to the current conversation, without changing screens or creating a separate Web Research entry.

The product must enforce request-specific consent at the retrieval boundary. The actual provider, outbound payload, redirects, logging, cancellation, and consent lifetime need an ADR. Turning Web on is not blanket permission to upload local documents or history. Any new or materially changed outgoing query needs its own policy decision. Do not silently substitute a hosted model for unavailable local inference.

## Sources and evidence

Sources belong to messages and conversation context. A source dialog shows title, type, supporting passage, location, and fixture disclosure. The prototype contains three fictional Text/Markdown archive documents and matching quotations. Their numeric citation labels map to fixture source IDs; the label itself is not a durable identity.

The desktop plus, or Add sources inside the phone plus menu, offers those sample sources; it does not read a phone or Mac filesystem. Source context is shown inside that dialog. Never add sample-source chips, attachment counts, or a sample-source row to the query bar. The prototype's newly simulated replies do not retrieve or cite documents automatically. Production ingestion formats, limits, extraction, stable source revisions, and passage locators remain architecture decisions. Do not reintroduce a global source-library screen to implement attachments.

A citation means “inspect the supporting material,” not “this claim has been independently verified.” Keep missing evidence, uncertainty, and failure visible inside the answer.

## Conceptual implementation boundaries

| Boundary | Responsibility |
| --- | --- |
| Conversation UI | History list, message stream, composer, inline activity, source dialogs |
| Conversation service | Per-conversation messages, draft/context, run identity and cancellation |
| Local inference adapter | Verified model availability; request/response stream; explicit failures |
| Retrieval adapter | Explicit web operations and their consent; source metadata and excerpts |
| Local storage | Durable conversations/context, migrations, recovery; chosen through an ADR |

These are responsibilities, not an approved framework, schema, or network API. If assistant-ui is adopted later, its conversation/composer primitives should render this single interface. Its runtime abstraction does not prove that inference executes on the device.

A production conversation needs stable identity, ordered message IDs, draft, context references, and Web preference. An assistant response needs run ID, status, content, execution mode, and source references. Sources need stable revision identity and excerpt location. Persistent contracts require explicit storage/versioning decisions. A separate Note entity is not in the current scope.

## State and failure behavior

| Situation | Current prototype / required interface |
| --- | --- |
| Empty | Short greeting and composer in the conversation canvas |
| Sending | Question added once; assistant status and Stop appear in place |
| Running | Three-second fixture timer; no token streaming or real model |
| Completed | Fixed, clearly simulated reply in the same message list |
| Stopped | Partial text remains; latest submitted question restored; retry in place |
| Model unavailable | Inline error with retained question in transcript; choose model in composer and retry |
| Web consent declined | No message or request created; draft remains |
| History switch during run | Timer belongs to its conversation; completion cannot overwrite another conversation |
| Long draft | Automatic growth stops at cap; text scrolls inside the input |
| Narrow or short viewport | Composer takes its own layout space; messages remain scrollable |

The prototype deliberately contains no notebook editing, exports, setup page, state-gallery page, accounts, cloud sync, or autonomous orchestration. Avoid adding product navigation from the existence of an internal service or data type.

## Build order and acceptance

1. Match the single-screen layout and automatic textarea sizing with fixtures; validate desktop and phone use.
2. Approve remaining G1 product requirements and G2 shell/runtime/storage/phone support ADRs.
3. Build the approved foundation and packaging checks.
4. Implement durable conversation history, drafts, and isolated message streams.
5. Connect local inference with streaming, cancellation, and inline recovery.
6. Connect conversation attachments and source inspection.
7. Implement approved web retrieval and consent inside the existing conversation.

Use [screen-specification.md](screen-specification.md) for geometry and behavior tests, [validation.md](validation.md) for executed checks, and [references.md](references.md) for design research. Physical-phone testing and production inference/network/storage checks must not be inferred from browser mockup tests.
