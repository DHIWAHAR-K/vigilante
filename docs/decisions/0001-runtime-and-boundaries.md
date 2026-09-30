# ADR 0001: Runtime direction and application boundaries

- Date: 2026-09-30
- Status: Accepted direction; implementation and version selection pending.

## Context

Vigilante needs fast cited answers, parallel research, and optional debate. External
model and retrieval calls dominate the expected workload, but no local measurements
yet establish their relative cost or latency. The initial project should make those
tradeoffs measurable without committing to a search index or large agent platform.

The user accepted Python for the research backend and Next.js/TypeScript for the web
experience. The [research review](../research/research-agent-landscape-2026-09-29.md)
supports examining a small async coordinator and purchasing retrieval initially.

## Decision

Use a Python asynchronous backend in `apps/api/`, with FastAPI planned as the HTTP
transport, and a Next.js TypeScript application in `apps/web/`. Start as a modular
application with one API deployment. There is no application implementation yet.

Organize backend behavior by `research`, `evidence`, `debate`, `providers`, and `runs`.
Domain records and policies remain independent of transport, SDKs, and agent frameworks.
Application use cases orchestrate domain-owned interfaces. Provider/storage adapters
implement those interfaces and are wired at the application boundary.

Own scheduling, evidence, verification, and the user experience. Initially obtain
search/extraction through external services. Do not build a crawler fleet, search
index, model-training pipeline, or microservice topology for the first milestone.

All model/retrieval credentials stay server-side. Reserve `contracts/` for shared
wire schemas; do not share Python internals or vendor objects with the web client.
Use a run resource and SSE for progress, with separate cancellation requests and
an authoritative state endpoint. The operations and event envelope in
[ARCHITECTURE.md](../../ARCHITECTURE.md) are proposals to specify before implementation.

Select supported runtime versions, package managers, and skeleton dependencies after
compatibility checks during the runnable-skeleton milestone. Select retrieval/model
providers using the subsequent benchmark. Choose persistence when required by explicit
recovery and retention behavior. Record real setup commands after verifying them.

## Consequences

- Async I/O and bounded parallel tasks match the anticipated workload; speed remains
  a measurement objective, not a property guaranteed by choosing Python or FastAPI.
- A separate frontend/backend requires explicit versioned contracts and compatibility
  checks, but allows UI and research internals to change independently.
- External retrieval reduces initial scope and introduces rate limits, variable
  latency, usage charges, and provider failure modes that adapters must expose.
- A small coordinator is easier to instrument; it requires deliberate cancellation,
  budget accounting, retry limits, and run-state handling rather than relying on defaults.
- A deployment without durable run storage cannot promise crash recovery or replay
  across restarts. Choose and test persistence before making those guarantees.

## Alternatives and revisit conditions

A hosted research API is a useful baseline but offers less control over evidence and
debate. A general agent harness may save work when its tested lifecycle, persistence,
or tool support outweighs its complexity. Evaluate that tradeoff without coupling
domain logic to its state types. A fully TypeScript application remains viable but
does not match the accepted runtime direction.

Follow the roadmap: runnable skeleton, then a provider/single-researcher baseline on
30–50 representative questions, then parallel research and bounded debate. Use
separate equal-cost and equal-deadline trials. Add more retrieval as a debate control;
include fixed evidence and live sources, repeated trials, and a human-reviewed subset.
Record model/provider versions, configuration, dates, latency,
quality, and cost. Revisit the coordinator or deployment topology when measured
bottlenecks, recovery needs, or concurrent load justify a specific change.
