# Web working rules

Inherit [root instructions](../../AGENTS.md). Scope: `apps/web/`.
Read [architecture](../../ARCHITECTURE.md) before changing API integration or run behavior.

- This directory is a foundation placeholder. Next.js and TypeScript are accepted
  directions; runtime versions, dependencies, and runnable commands remain unselected.
- Keep research orchestration, model calls, and retrieval credentials in the API.
  Never expose provider secrets through browser code, public environment variables,
  serialized server props, logs, or client-facing errors.
- Consume versioned wire contracts from `contracts/`; do not mirror provider objects
  or backend domain internals. Handle unknown versions and recoverable errors explicitly.
- Render provisional, partial, and final output distinctly. Show meaningful corrections,
  remaining uncertainty, source passages, and cancellation progress accessibly.
- Treat the run-state endpoint as authoritative. Deduplicate replayed SSE events,
  detect sequence gaps, recover from expired cursors, and release subscriptions when
  views change. An interrupted connection does not prove the research was cancelled.
- Render retrieved text safely. Validate source links and sanitize any rich content;
  source text must not execute scripts or change application behavior.
- Prefer simple components and keyboard-accessible interactions. Stream progress
  without excessive announcements or forced focus changes; preserve reading position.
- Verify meaningful flows once implemented: reconnect/replay, partial results,
  cancellation races, source inspection, and keyboard use. Report real commands and
  outcomes; avoid claiming working screens or tests while this is documentation only.
