# ADR 0004: Web v1 AI and retrieval boundary

- Status: Accepted
- Date: 2026-09-05
- Owners: Project owner
- Supersedes: None

## Context

Vigilante is an AI research workspace. The approved interaction model keeps ordinary chat, source-backed questions, and web research inside one conversation. The static prototype simulates model responses and web consent, but production web v1 needs a boundary that can later support real model providers and retrieval without leaking user data or hard-coding a hosted-only architecture.

The README still points toward a private, local-first product. Web v1 is hosted on Vercel, so the architecture must be honest about what is local, what is server-side, and what leaves the user's device.

## Decision drivers

- Never call model or search providers directly from browser code.
- Make web retrieval explicit, request-specific, inspectable, and cancellable.
- Keep local/web/source-backed responses in one conversation renderer.
- Allow the AI provider to change without rewriting UI or storage.
- Preserve a future path to local inference in the desktop app.

## Options considered

### Option A: Server-side AI and retrieval adapters

The UI sends authenticated requests to Vigilante server routes. Server code validates ownership and consent, then calls an AI or retrieval adapter. This keeps secrets private and makes logging, rate limits, errors, and future provider swaps manageable.

### Option B: Direct browser calls to AI/search providers

Direct calls reduce backend code, but they expose keys or require unsafe client credentials. They also make consent, audit trails, and future local runtime support harder.

### Option C: Dedicated worker service from day one

A worker service on Render or another host could handle long-running research jobs, crawling, and indexing. That is likely useful later, but it is not necessary for the first authenticated conversation slice.

## Decision

Use server-side adapters for AI generation and web retrieval. The v1 foundation will include deterministic local stubs or recoverable "provider unavailable" behavior so the product can be built and tested without a production model key. Real provider selection is deferred until the relevant credentials, cost limits, and privacy terms are approved.

When web research is enabled, the app must show the exact outgoing query, destination, and included data before any external retrieval call. Declining consent creates no outbound request, run, or message. Accepting consent records a one-shot `web_consents` row tied to the conversation/run and does not become blanket permission for future queries.

Sources remain attached to messages and conversation context. Citations are inspection links, not proof that a claim is independently verified.

## Consequences

- The first vertical slice can be production-shaped without depending on paid AI usage.
- Real streaming can be added behind the adapter later, likely with the Vercel AI SDK or a direct provider SDK after current docs and model IDs are verified.
- Serverless time limits may constrain long research jobs. If v1 grows beyond short request/response runs, introduce a worker service through a new ADR.
- Logs must avoid storing sensitive prompt/source content unless a later privacy policy and retention decision permits it.
- Web consent and run records become part of the audit trail and must be protected by RLS.

## Validation

- Tests prove web-consent denial creates no external call or persisted run.
- Tests prove browser code imports no provider-secret modules.
- Missing provider configuration renders an inline recoverable state.
- Future preview/production deployments are verified with runtime logs to confirm calls happen through server routes only.
