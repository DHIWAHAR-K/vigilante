# ADR 0003: Web v1 auth and data

- Status: Accepted
- Date: 2026-09-05
- Owners: Project owner
- Supersedes: None

## Context

Vigilante web v1 needs user accounts, durable conversation history, drafts, sources, message citations, AI run status, and one-shot web-research consent. The current repository has only a static in-memory design prototype.

Supabase access is available through the connected plugin. One Supabase organization exists, and two inactive projects are visible, but no Vigilante project has been selected or created. Supabase project creation can have cost implications and must be confirmed before any resource is created. Database migrations must be reviewed before applying to a real project.

## Decision drivers

- Use the owner-requested Supabase integration for authentication and persistence.
- Keep user research data isolated by owner.
- Make authorization enforceable at the database layer, not only in application code.
- Support SSR authentication for a Next.js web app without exposing privileged keys to the browser.
- Keep persisted schema changes explicit and reviewable as product contracts.

## Options considered

### Option A: Supabase Auth and Supabase Postgres

Supabase provides managed Auth, Postgres, migrations, Row Level Security, and browser/server client libraries. It is a good v1 fit because auth and storage can be learned together while still using a real relational database.

### Option B: Auth.js plus Prisma and hosted Postgres

This gives more direct control and broad ecosystem support, but it requires more auth plumbing and a separate database provider. It is less aligned with the owner's requested tooling.

### Option C: Clerk plus hosted database

Clerk is strong for auth UX, but it separates identity from persistence and adds another account/vendor before v1 needs it.

### Option D: Firebase Auth and Firestore

Firebase is fast for prototypes, but Vigilante's data is relational: conversations, ordered messages, source references, citations, runs, and consent records. PostgreSQL is a clearer fit.

## Decision

Use Supabase Auth and Supabase Postgres for web v1. Integrate Supabase with Next.js using `@supabase/ssr` and cookie-backed sessions. Use the publishable Supabase key in browser code and keep service-role or secret keys out of all client bundles.

Create migration files for the initial v1 data model:

- `profiles`
- `conversations`
- `messages`
- `sources`
- `message_sources`
- `runs`
- `web_consents`

Enable Row Level Security on every exposed table. Policies must use `TO authenticated` plus owner predicates such as `(select auth.uid()) = user_id`; authentication alone is not authorization. Avoid `SECURITY DEFINER` functions in v1 unless a later ADR justifies them. Do not rely on user-editable metadata claims for authorization.

## Consequences

- Persisted tables, fields, and migration behavior become compatibility contracts once shipped.
- The app needs clear local, preview, and production Supabase environments or branches before production deploys.
- Supabase SSR auth can change; dependencies must be pinned, and auth behavior must be verified against current docs during implementation.
- RLS bugs are security bugs. Tests or manual SQL verification must prove cross-user isolation before production.
- Existing inactive Supabase projects must not be repurposed without owner confirmation.

## Validation

- Migration SQL is reviewed before any apply operation.
- Local or project-branch RLS checks prove a user can only access their own conversations, messages, sources, runs, and consent records.
- Next.js protected routes validate identity server-side using Supabase's verified auth methods.
- Browser bundles are checked so secret/service-role keys are not exposed.
- The app works locally with documented `.env.local` variables and builds in CI without committed secrets.
