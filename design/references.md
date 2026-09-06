# Design research and visual rationale

Researched 2026-09-05 using the official assistant-ui site and documentation. These references inform interaction design; assistant-ui is not installed or selected as Vigilante's production stack.

## Official references

| Reference | Relevant pattern | Vigilante adaptation |
| --- | --- | --- |
| [assistant-ui](https://www.assistant-ui.com/) | Composable conversation interface | One conversation canvas with conversation history and source dialogs |
| [Thread](https://www.assistant-ui.com/elements/thread) | Message viewport, welcome/history states, composer, follow-up suggestions | Stable conversation shell, distinct author roles, source-backed sample answers and follow-ups |
| [Composer primitive](https://www.assistant-ui.com/docs/primitives/composer) | Native form, textarea, send/cancel; attachment and runtime status | Automatically growing composer with visible Web control, empty-submit prevention and Stop behavior |
| [Tool fallback](https://www.assistant-ui.com/elements/tool-fallback) | Visible tool-call status and expandable detail | Compact source-review disclosure and explicit recovery states |
| [Tools](https://www.assistant-ui.com/docs/tools) | Custom tool UI, including human participation | Reviewable outgoing search query with deliberate allow/deny controls |

If React is approved later, evaluate ThreadPrimitive, ComposerPrimitive, MessagePrimitive and a runtime adapter against Vigilante's native boundary. A library's local runtime abstraction is not proof of on-device inference. Verify the execution destination separately. Do not copy hosted API examples into this local-first product without an accepted privacy and runtime design.

## Current visual direction

The owner requested a Perplexity-like professional style. The live [Perplexity homepage](https://www.perplexity.ai/) was inspected on 2026-09-05 for restrained dark surfaces, a prominent composer, and minimal navigation. Vigilante uses its own system-sans typography, black-and-white palette and neutral primary controls, fictional content, and original local SVG icons.

The owner's later correction establishes one conversation interface, history-only sidebar, automatic input growth, and minimal phone UI. This replaces earlier multi-section interpretations. Web research stays inside the same transcript; source details open from answers. There is no notebook, global source library, bottom tab bar, or permanent evidence panel in the current design.

The owner’s supplied Perplexity screenshot further narrows the visual direction: a modest regular-weight heading, compact composer, narrow sidebar, and generous empty space. The current design follows that composition with a 240px history sidebar and 640px empty composer, without importing the reference’s additional product navigation.

The assistant-ui references above inform composable messages, composer behavior, and inline tool states. They do not authorize copying a hosted execution architecture. No external fonts/assets or runtime dependencies are required by this static prototype.

## Live browser inspection

On 2026-09-05, inspected the owner's already-open [Perplexity homepage](https://www.perplexity.ai/) in Opera GX through Computer. The ChatGPT extension was visible in the browser toolbar, but direct Computer access provided the page and controls without an extension installation.

Inspected the expanded sidebar, collapsed icon rail and restore control, session-search overlay, attachment menu, model menu, and Search menu containing Deep research. Closed the menus and restored the expanded home view afterward. No query was submitted, file uploaded, model changed, or personal conversation copied. This inspection covers home/navigation and composer menus, not a generated answer or mobile Perplexity layout.

| Observed pattern | Current Vigilante design decision |
| --- | --- |
| Brand, search and collapse grouped in the sidebar header | Group the wordmark, title search, and Hide sidebar; move the wordmark out of the expanded desktop main header |
| Session search appears only when opened | Use a compact title-search dialog on desktop and a search field inside the phone history drawer |
| Collapsed sidebar releases reading space | Reduce the desktop sidebar to a 56px icon rail with Show sidebar, New and Search; retain drafts and transcript |
| Attachment, model and search modes open from the composer | Keep existing compact composer controls and research within the conversation |
| Low-contrast surfaces and restrained active rows | Retain a quiet graphite history list, small heading, and compact centered composer |

Vigilante keeps the owner's history-only scope. Perplexity's Projects, Computer, Artifacts, account promotions and additional destinations are not adopted. The brand/search/collapse grouping and responsive adaptation are design choices based on observation, not a claim of pixel-identical reproduction.

The owner subsequently requested the same Perplexity design with a black-and-white palette. The current revision follows its sidebar toolbar/New/history hierarchy, collapsed rail, elevated centered welcome/composer composition, and compact desktop controls. All colored accents have been replaced with grayscale values. Vigilante branding and the established history-only product scope remain.

The latest owner correction removes sample-source chips from the query bar and large numeric citation badges. Phone adaptations center the brand, simplify the composer to three controls, move model selection into the plus menu, and use plain question typography. Inline bracketed references replace circles. The original Vigilante SVG centers the v geometrically rather than relying on font baseline alignment.
