# Current conversation-design validation

Validated 2026-09-05 in the Codex in-app browser. The current black-and-white revision has a 240px sidebar, 56px collapsed rail, 640px empty composer, and compact neutral controls. All screenshots reflect this revision; earlier measurement files remain labeled baselines.

## Current phone, citation and brand refinement

- Verified 16 empty/populated observations at 320×568, 375×667, 390×844, 430×932, 768×1024, 812×375, 960×700 and 1440×1000. Message/composer widths fit, message height remained positive, and no overlap occurred. All logo images loaded. See [phone-citation-checks.json](screens/phone-citation-checks.json).
- Measured phone brand centering within 0.004 CSS pixels of the viewport midpoint. The reusable SVG places the v symmetrically about (12, 12) in a 24×24 viewBox.
- Phone composer exposes only More options, Web and Send/Stop; desktop retains direct model selection. After Use sample sources, no source-chip element or sample-source text appeared in the composer.
- More options → Choose model opened model selection. More options → Add sources opened source selection. Nested dialog changes focus Close; closing returns to More options.
- The compact [1] reference opened Community archive field guide and Escape restored focus to that reference. Citation circles are replaced with transparent inline text targets; the answer-level Sources action remains available.
- Five-line phone input measured 128px and retained `resize: none`; keyboard deletion cleared it. Full reference captures were refreshed, including source and options dialogs.
- Browser console had no warnings/errors. Syntax, governance, document links, grayscale colors and SVG parsing checked after this refinement.

## Earlier black-and-white revision

- Followed the directly inspected Perplexity composition: sidebar toolbar, New below it, quiet history list, collapsed icon rail, and elevated centered welcome/composer. Phone keeps History/wordmark/New in its header.
- Verified every explicit CSS hex color is achromatic. Browser measurements confirmed a `rgb(17, 17, 17)` canvas and `rgb(255, 255, 255)` Send button.
- Checked ten layout observations across 1440×1000, 960×700, 390×844, 320×568 and 812×375. Expanded/collapsed desktop, phone drawer, populated/empty landscape, and multiline phone input fit without horizontal overflow or message/composer overlap. See [monochrome-checks.json](screens/monochrome-checks.json).
- Confirmed the desktop rail measures 56px and expanded sidebar 240px. Keyboard order follows Show sidebar → New conversation → Search conversations. Search selection opened the matching transcript.
- Collapsing preserved a two-line draft and its 56px input height. New from the rail opened an empty conversation. Five-line phone input measured 128px, with a 44px Send target.
- Refreshed all eight screen captures. Browser console, JavaScript syntax, governance, document links and whitespace checks passed.

## Earlier conversation checks

- Verified the current interface has one conversation screen, history-only left sidebar/drawer, no Notebook/Research/Source-library destinations, no bottom tabs, no permanent evidence panel, and no bottom workspace/saved/preview text.
- Before the sidebar refinement, checked empty and populated conversation layouts at 320×568, 375×667, 390×844, 430×932, 768×1024, 812×375, 900×700, 1024×768, and 1440×1000. Measured message/composer horizontal overflow, available message height, and composer/message overlap. All 18 observations passed for that baseline; actual observations are in `screens/layout-checks.json`.
- Input at a 390px phone width: one line 32px; five lines 128px; long draft capped at 192px with internal scrolling. Keyboard select-all and Backspace returned it to 32px and disabled Send. Computed `resize` is `none`.
- Switching between two history entries restored their separate drafts, including a multiline draft and its input height.
- Sending with Web enabled opened an exact-query dialog; accepting added the simulated response to the same conversation transcript and history entry. No Research/Web section was opened.
- Sending then stopping in an existing conversation retained the partial response, restored the exact submitted question, and left the response stopped.
- History drawer selection closes the drawer. Escape closes dialogs and restores focus.
- Browser console showed no warnings or errors. JavaScript syntax, repository governance, diff whitespace, and relative Markdown links checked before delivery.

## Earlier sidebar refinement

- Verified the 240px sidebar at 960×700, 1024×768, and 1440×1000; the History drawer at 320×568 and 390×844; and the hidden-sidebar transition at 959×700. Rows, conversation content, composer, and open drawers had no horizontal overflow. Measurements are in [sidebar-checks.json](screens/sidebar-checks.json).
- Selected a desktop history row using Enter and verified the matching transcript and active state. Switching back restored its draft.
- A long conversation title wrapped to two lines in a 64px row without overflow; full stored title remains available in the native tooltip. Normal rows measured 44px.
- Selecting a phone history entry closed the drawer and opened the matching conversation. Escape closed the drawer and restored focus to History. No browser warnings or errors were reported.
- Updated desktop captures and phone drawer capture. The conversation/composer-only phone captures remain applicable.

## Earlier live-reference history controls

Following direct inspection of Perplexity in Opera, verified the current sidebar controls in the local prototype:

- Desktop Hide sidebar and Show sidebar preserve a two-line draft and its 56px input height. Focus moves to the available restore/collapse button.
- Search focuses its field on desktop, matches titles case-insensitively, displays no-results text, and opens the first match with Enter. The matching transcript was verified.
- Fixed native search-input Escape behavior so Escape closes the dialog with populated text and restores focus to the search trigger.
- Phone history initially focuses Close. Filtering and selecting a result closes the drawer and restores the matching conversation. Escape with populated text restores focus to History. Cmd+K opened history successfully.
- An open desktop search dialog closed when crossing to the mobile breakpoint.
- Geometry checked at 1440×1000 (search open and sidebar hidden), 960×700 (hidden and expanded), 390×844 and 320×568 (phone history open). All six observations had no dialog/message/composer horizontal overflow or message/composer overlap. See [history-controls-checks.json](screens/history-controls-checks.json).
- No browser warnings or errors were reported. Syntax, governance, Markdown links and whitespace were checked after the change.

The earlier layout observations remain baseline checks; the checks above cover this revision's changed controls. Physical keyboard/viewport behavior on iOS and Android remains unverified.

## Limits

The prototype has no actual model, retrieval, source ingestion, durable persistence, or phone runtime. Physical iOS/Android hardware, virtual keyboards, screen readers, zoom, performance and full accessibility conformance were not tested. Visual-viewport and safe-area handling still require real-device verification. The browser's empty-string fill helper did not clear the field; actual keyboard deletion was used to verify shrinking.

A first Stop attempt on a newly created web conversation completed before the browser tool could click Stop. The existing-conversation test exercised Stop successfully. No claim is made about production inference timing.

## Captures

- [Empty desktop conversation](screens/empty-desktop.png)
- [Desktop conversation and history](screens/conversation-desktop.png)
- [Empty phone conversation](screens/empty-phone.png)
- [Phone conversation](screens/conversation-phone.png)
- [Phone history drawer](screens/history-phone.png)
- [Automatically grown phone composer](screens/composer-grown-phone.png)
- [Desktop history search](screens/history-search-desktop.png)
- [Collapsed desktop sidebar](screens/sidebar-collapsed-desktop.png)
- [Phone source details](screens/source-phone.png)
- [Phone conversation options](screens/options-phone.png)

Screens are illustrative viewport captures. Use `index.html` for actual scrolling, history, text sizing, source dialogs, and inline states. The handoff's full acceptance list includes further production checks, not blanket passed claims.
