# API working rules

Inherit [root instructions](../../AGENTS.md). Scope: `apps/api/`.
Read [architecture](../../ARCHITECTURE.md) and the relevant ADR before changing boundaries.

- This directory is a foundation placeholder. Python async and FastAPI are accepted
  directions; dependencies, versions, and runnable commands are not yet established.
- Organize behavior by `research`, `evidence`, `debate`, `providers`, and `runs`.
  Keep domain records/policies free of FastAPI, model SDK, and orchestration imports.
- Put external calls behind domain-owned interfaces. Construct SDK clients in the
  composition layer; normalize provider results, usage, and errors in adapters.
- Keep credentials, provider configuration, and tool permissions server-side. Validate
  input and source access at boundaries; untrusted pages and agents cannot grant access.
- Bound async concurrency, retries, timeouts, and total run work. Account for in-flight
  reservations; reserve synthesis/verification budget and propagate cancellation.
- Preserve source snapshots/passages and claim support through synthesis. Never turn
  generated summaries into original evidence or promote partial work to a final answer.
- Specify wire schemas in `contracts/` before adding transport behavior. Keep lifecycle
  transitions authoritative; replay can duplicate events and disconnect is not cancel.
- Test behavior at failure boundaries: stalled providers, cancellation races, budget
  exhaustion, unsupported citations, and event replay. Use deterministic fixtures by
  default; isolate paid/live-provider evaluations and record their configuration.
- Document implemented setup/check commands when they exist. Do not invent passing
  tests, latency numbers, crash-recovery guarantees, or support for undeployed endpoints.
