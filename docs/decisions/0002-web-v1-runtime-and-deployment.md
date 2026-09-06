# ADR 0002: Web v1 runtime and deployment

- Status: Accepted
- Date: 2026-09-05
- Owners: Project owner
- Supersedes: None

## Context

Vigilante is being rebuilt as a private, local-first research product, but the first launch target for this checkpoint is web only. The repository currently has governance and a validated static design prototype, but no production app framework, package manager, test runner, or deployment pipeline.

The owner asked to use Supabase for auth and Vercel for frontend deployment if access is available. Connected access was confirmed read-only for Supabase, Vercel, Render, and Cloudflare. Creating cloud resources, applying migrations, changing DNS, deploying, tagging, or publishing releases still requires explicit authorization under the repository rules.

## Decision drivers

- Teach the local-to-production workflow with clear stages: local dev, tests, preview deployment, production promotion, observability, and rollback.
- Keep the approved one-conversation product model as the first screen.
- Use a stack that supports authenticated server rendering, protected server code, streaming responses, and Vercel preview deployments.
- Keep the future local-first desktop/runtime direction possible by isolating product boundaries from hosting details.
- Prefer common, well-documented tools for a solo new-grad maintainer.

## Options considered

### Option A: Next.js App Router on Vercel

Next.js provides Server Components, Route Handlers, Server Actions, and first-class Vercel deployment behavior. It fits Supabase SSR auth, gives a small backend-for-frontend without a separate service, and keeps previews close to production. The cost is framework complexity and serverless runtime constraints.

### Option B: Vite React SPA on Vercel

A client-rendered SPA is simpler to scaffold, but it pushes too much auth/data logic into the browser or forces a separate backend early. That conflicts with the need to keep provider secrets server-side and teach production backend boundaries.

### Option C: Vercel frontend plus Render API service

A separate API on Render is useful for long-running workers or heavier retrieval jobs, but it adds deployment, auth, CORS, observability, and service-boundary complexity before v1 needs it.

### Option D: Cloudflare Pages/Workers

Cloudflare would be strong for edge-first routing, DNS, and worker-based APIs. The owner specifically requested Vercel for the frontend, and Supabase SSR auth examples align well with Next.js/Vercel.

## Decision

Build web v1 as a TypeScript Next.js App Router application deployed on Vercel. Use npm with a committed `package-lock.json` for simple reproducibility. Target Node.js 22+ for local and CI execution because current Supabase client-library guidance no longer supports Node.js 20 after 2026-06-30.

Use Vercel preview deployments for branch validation and the `main` production branch for production deployment once explicitly authorized. Do not use Render or Cloudflare in the initial runtime path. Keep Render available for future workers and Cloudflare available for DNS/WAF/custom domain work after a production domain is chosen.

## Consequences

- The production web app runs in a serverless/backend-for-frontend model, so route handlers cannot rely on persistent local filesystem state or long-lived process memory.
- Server Actions and Route Handlers are treated as public endpoints; every mutation validates authentication and row ownership.
- Environment variables are separated by local, preview, and production targets. Secrets are configured through `.env.local`, Supabase, and Vercel settings, never committed.
- GitHub remains the review boundary. Vercel deployment is a later release operation, not implied by local implementation.
- The web v1 stack is hosted-first, so future local-first desktop runtime work must keep using adapter boundaries instead of importing Vercel-specific assumptions into core product logic.

## Validation

- Local scripts pass: format, lint, typecheck, tests, build, and governance.
- CI runs the same checks before merge.
- A Vercel preview deployment is created only after explicit authorization, then verified with browser smoke tests and runtime log checks.
- Production deployment is a separate explicit authorization after preview verification.
