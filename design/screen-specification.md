# Single-conversation screen specification

Current owner-directed scope: one conversation canvas for chat, research, and web research. Left sidebar is history only. No Notebook, Research section, Sources library, mobile bottom tabs, or manually resizable composer.

## Visual system

| Token | Value |
| --- | --- |
| Canvas | `#111111` |
| History sidebar | `#191919` |
| Composer/dialog surface | `#1d1d1d` |
| Primary / secondary text | `#f5f5f5` / `#ababab` |
| Accent | `#ffffff` |
| Divider | `#333333` |
| Typography | System sans-serif; input 16px/24px |
| Empty heading | 22–24px, regular weight; one line when space allows |
| Header | 60px minimum on phone, 65px on desktop |
| Reading/composer width | 760px maximum; empty state 640px |
| Composer radius | 16px |
| Standard action target | Phone/touch: 44×44px; fine-pointer desktop composer: 36×36px; inline textual citations: 18×20px; Sources action: at least 44px high |

Use thin grayscale borders, neutral selection, a white Send button, and generous reading space. All colors are achromatic, including citations, uncertainty indicators and focus rings. The empty screen has one modest heading and a compact composer, with no tagline, suggestion cards, decorative gradients, or header divider. On expanded desktop layouts the sidebar header holds the Vigilante wordmark, history search, and Hide sidebar; New sits below that toolbar. The expanded desktop main canvas has no extra header controls. Collapsed desktop shows a 56px rail; the phone header contains History, the wordmark, and New conversation. No Local mode badge, status cards, or bottom workspace/saved/preview footer.

## Responsive layout

| Layout | Contract |
| --- | --- |
| Under 960px | One column. Header History button opens conversation drawer. No bottom navigation. |
| From 960px | 240px history sidebar and flexible conversation area. History button disappears while the sidebar is expanded; hiding it creates a 56px rail with Show sidebar, New and Search. |
| All widths | App uses visible viewport height. Message list flexes and scrolls. Composer consumes its own space below messages; it does not cover the answer. |
| Empty conversation | “What do you want to know?” sits above the composer in the same canvas. The desktop composition sits above the vertical midpoint, following the reference; phones retain balanced vertical centering. No secondary home dashboard or recent-work cards. |
| Short height, at most 500px | Smaller greeting, tighter composer spacing; All primary controls remain reachable. |

History uses a borderless graphite surface, a 65px desktop toolbar, a quiet History label below it, 12px inner gutters, and 44px minimum row heights. Title text is 13px/20px. The active row has a neutral `#2c2c2c` background and a subtle leading marker; keyboard focus remains visible inside the scroll area.

Phone drawer: at most 320px or 88% of viewport width, full visible viewport height, scrollable, with title search, conversation titles and Close. Desktop history search is a 480px maximum modal using the same results list. Search does not run a web query. Source/permission/model dialogs: at most 560px wide, 12px viewport margins, internal scrolling. Use native modal semantics and return focus on close.

Safe-area padding is applied to the header, drawer, and composer. Listen to visual viewport resize to adapt to available height, without treating desktop emulation as evidence of actual iOS/Android keyboard behavior.

## One screen, multiple conversation states

`#new` is an empty conversation. `#conversation-<id>` selects a conversation. Those URLs identify history entries, not different product sections. The prototype uses `replaceState`, so browser Back is not a navigation-history implementation. An unknown/stale legacy view resets to an empty conversation; do not recreate the removed views.

History and Web/attachment/draft state belong to each conversation. New conversation is a sidebar action on desktop and a topbar action on phones. Only sending its first message adds a new history entry. Selecting a history row displays that entry's messages. Sidebar titles wrap to two lines before truncating, with the complete stored title in a native tooltip; messages and long words wrap inside the conversation.

Assistant messages may include text, inline run status, citations, a Sources action, and retry. Citation details stay in a dialog. No permanent right-side panel is included in this simpler version.

## History controls

Hide/show switches between a 240px sidebar and a 56px icon rail. It is a per-page desktop view preference. It must preserve the transcript, draft, input height and selected conversation. The narrow layout always uses the mobile header and drawer. Crossing 960px closes an open history dialog; the desktop collapse preference is restored when returning to desktop. Rail controls follow the same visual and keyboard order: Show sidebar, New conversation, Search conversations.

Title search is case-insensitive and trims surrounding whitespace. The input stays focused as results update. Show “No conversations found.” for no matches and announce the result count. Enter selects the first result; Escape closes even when search text is present. Cmd/Ctrl+K opens history search. The phone drawer starts on Close, so the keyboard appears only when the user focuses search.

## Automatic composer sizing

The native textarea starts at 32px, uses `resize: none`, and measures its content on every input event. Pasting, deleting, switching conversations, and resizing trigger the same sizing logic. Cap: `max(56, min(192, floor(visualViewportHeight × 0.28)))` pixels. Beyond the cap, use internal vertical scrolling. Clearing returns it to 32px and disables Send.

The input always uses 16px text. Desktop controls are Add sources, Web, Local model, and Send/Stop. Phone controls are More options (+), Web, and Send/Stop; Choose model and Add sources live inside the plus menu. No attachment or sample-source chip/row appears in the composer. No expanding handle or dedicated expansion button. On phone, there are no extra mode-navigation controls. Web answers appear in the same message list.

Enter sends only on fine-pointer devices, Shift+Enter inserts a newline, and IME composition must not send. Coarse-pointer Enter inserts a newline; tap Send. During generation, Send becomes Stop. A real application must preserve draft and stream state without rebuilding focused DOM on each token.

## Phone reading and brand

The phone header uses a 44px / flexible / 44px grid: History, centered brand, New. Use the shared 24px SVG mark in header and assistant labels. The v endpoints span 7.5–16.5 on both axes, centering the glyph inside its 24×24 viewBox.

The phone empty state uses a balanced, centered 24px heading above a full-width composer with 12px side margins. Conversation text uses 15px body copy and 20px side margins. Questions are plain 18px medium-weight text; desktop keeps the established question bubble. Textarea growth reduces the message viewport without overlaying it. Focus is expressed through the composer border instead of a second rectangle inside the input.

Citations are small, transparent bracketed text links: [1], [2], [3], using 10px text in an 18×20px inline target. They retain source-specific accessible names and keyboard focus. This uses the inline-link target-size exception; the answer-level Sources control provides a larger 44px alternative. No filled numeric circles remain. Source dialogs keep the quotation, locator, and close behavior.

Opening a different view inside the same dialog moves focus to Close; closing returns focus to the original trigger. All surface colors remain grayscale.

## Review scenarios

| Scenario | Expected result |
| --- | --- |
| Empty canvas | Greeting, one composer, history/new controls; no extra sections |
| Select a saved conversation | Correct independent transcript, context, draft and Web option |
| Send local question | User/assistant messages in current conversation; new history row for a first send |
| Send Web question | Exact-query permission dialog; acceptance returns to the same transcript |
| Cancel Web permission | Draft preserved; no outgoing operation or new user message |
| Inspect source | Matching fixture quotation and locator; Close/Escape restores context |
| Stop a response | Timer cancelled, partial text retained, submitted question restored |
| Retry stopped/unavailable response | Retry same assistant response without duplicating the user message |
| Type 1, 5, and 40 lines | Grow from minimum, cap long input, then scroll internally |
| Delete all text | Shrink to minimum and disable Send |
| Switch between drafts | Each existing history entry restores its own text and input height |
| Short phone height | Header, composer and message viewport fit; no message/composer overlap |

## Required validation

Inspect empty and populated states at 320, 375, 390, 430, 768, 900, 1024 and 1440px, with short-height and landscape cases. Check actual DOM dimensions, message/composer scroll widths, and available message viewport height, not only body overflow. Exercise history drawer and source dialogs using keyboard and pointer. Verify growth/shrink/paste, safe output escaping, draft isolation, stop/retry, and Web results staying in the same conversation.

Record only executed checks in [validation.md](validation.md). Physical devices, virtual keyboards, screen readers, zoom, model quality, persistence and real retrieval remain separate checks. CSS and `app.js` are the executable visual/interaction reference; screenshots are secondary samples.
