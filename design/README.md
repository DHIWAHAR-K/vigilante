# Vigilante conversation design

Current direction: one conversation screen for chat, research, and web research. The owner's explicit correction replaces the earlier multi-section concept.

## Checkpoint

- Outcome: a minimal conversation UI on desktop and phone, with conversation history as the only left-sidebar content.
- Boundaries: design prototype and fictional in-memory conversations; no production model, web retrieval, native shell, or persistence.
- Acceptance: no Notebook, Research destination, source library, or mobile bottom navigation; all work stays in its conversation; history restores each conversation; the textarea grows and shrinks as text changes without a resize handle; long drafts remain scrollable; sources are inspected from answers.
- Validation plan: inspect desktop and phone layouts, switch conversation histories and drafts, test local/web modes on the same screen, type/paste/delete multiline text, check growth cap and short-height layouts, inspect source dialogs and focus, run syntax and governance checks.
- Live-reference refinement: group the brand, history search, and collapse control in a 240px sidebar header. Search filters conversation titles in an on-demand dialog; the phone drawer includes the same search. Collapse creates a slim rail with Show sidebar, New and Search. Validate search/no-results/selection, Escape and focus return, collapse/restore with a multiline draft, and responsive transitions.
- Black-and-white revision: follow the inspected Perplexity composition with New in the desktop sidebar, a collapsible 56px icon rail, a compact centered composer, and neutral grayscale colors throughout. Preserve history-only navigation and automatic input growth. Validate expanded/collapsed and phone states, keyboard behavior, and grayscale colors before refreshing captures.
- Phone/citation refinement: center the header brand, use a lighter reading layout and three composer controls on phones, move phone model selection into the plus menu, remove sample-source chips, and render citations as compact bracketed references. Use one reusable SVG with a geometrically centered v. Validate phone geometry, source links, model access, automatic growth, and logo alignment.
- Version impact: none.

## Preview

Open `index.html` directly or serve `design/` with `python3 -m http.server 4173 --directory design`. The preview at http://127.0.0.1:4173 is local to this computer. No installation or external assets are required.

Desktop: a black-and-white Perplexity-style layout with New and conversation history on the left, a 56px collapsed rail, and one conversation canvas and composer. Phone: the same conversation with a History button, a New conversation button, and the composer. No bottom tabs. Web is a composer option, not another destination. Sources open from an answer.

## Handoff

- [How Vigilante works](how_vigilante_works.md): product behavior and implementation sequence.
- [Screen specification](screen-specification.md): layout, components, and responsive contracts.
- [References](references.md): assistant-ui and Perplexity design research.
- [Validation](validation.md): executed checks and remaining limitations.
- `screens/`: current desktop/phone captures; superseded screen captures are removed.

The product/native/runtime architecture still follows G1/G2 approval in the repository. Phone layout is required; local inference on phones is not established by this mockup. All conversation content is fictional; reload resets it. No previous implementation is restored.
