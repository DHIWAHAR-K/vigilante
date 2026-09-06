# Rebuild Project Plan

Status: **YELLOW — v1 web foundation validated**

Governance and repository controls are complete. The v1 web foundation now has accepted architecture decisions, a buildable Next.js app, Supabase SSR auth wiring, protected app routing, initial RLS-backed schema contracts, and local validation scripts. The current objective is to choose or create the actual Supabase project, apply migrations in a reviewed environment, and connect the next vertical slice without restoring the deleted previous implementation.

## Gates

| Gate            | Deliverables                                                                            | Exit decision                                                |
| --------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| G0 Governance   | Development, solo review, commit, version, and release rules                            | Establish the governance root commit and repository controls |
| G1 Product      | Users, problems, scope, non-goals, supported platforms, success measures                | Approve a first product milestone                            |
| G2 Architecture | Component boundaries, stack, data ownership, local inference, migration, security, ADRs | Approve the foundation design                                |
| G3 Foundation   | Buildable skeleton, shared commands, CI, version sync, deployment smoke test            | Approve vertical-slice work                                  |
| G4 Alpha        | Core workflows complete enough for internal use                                         | Begin alpha releases                                         |
| G5 Beta/RC      | Feature-complete, migration/packaging tested, blockers controlled                       | Advance release channel                                      |
| G6 Stable       | Release checklist satisfied and publication approved                                    | Publish stable rebuild                                       |

## Immediate decisions after G0

1. Define the primary user and the first complete research workflow.
2. Confirm supported macOS versions and hardware targets.
3. Decide whether user data created by prior releases needs a supported import path.
4. Choose the UI shell, native boundary, local model runtime, persistence model, and web-retrieval boundary through decision records.
5. Define privacy, offline behavior, update/distribution, and failure-recovery requirements.

## V1 web checkpoint

The first implementation checkpoint targets a web-only milestone while preserving the longer-term local-first direction. Accepted decisions for the checkpoint:

- [ADR 0002](decisions/0002-web-v1-runtime-and-deployment.md): TypeScript Next.js App Router on Vercel, npm, Node.js 22+, with Render and Cloudflare deferred.
- [ADR 0003](decisions/0003-web-v1-auth-and-data.md): Supabase Auth and Supabase Postgres with SSR sessions, migrations, and RLS.
- [ADR 0004](decisions/0004-web-v1-ai-and-retrieval.md): Server-side AI/retrieval adapters with explicit one-shot web consent.

Implemented checkpoint surface:

- Root `/` redirects to the protected `/app` conversation workspace.
- `/sign-in`, `/sign-up`, and `/auth/callback` support Supabase email/password auth flows.
- `/app` lists user-owned conversations, loads selected messages, and creates persisted conversation turns through server actions.
- The Web toggle opens a one-shot consent dialog before recording a web-mode run. The actual retrieval adapter remains intentionally stubbed until provider, logging, and privacy behavior are approved.
- `npm run check` validates formatting, linting, type checking, unit tests, production build, and governance.

## Dependencies

| Need                        | Required by          | Owner                 | Fallback if unresolved                           |
| --------------------------- | -------------------- | --------------------- | ------------------------------------------------ |
| Approved product milestone  | Architecture         | Project owner         | Limit design to reversible experiments           |
| Supported platform matrix   | Foundation/packaging | Project owner         | Target current Apple Silicon macOS only          |
| Prior-release data decision | Storage architecture | Project owner         | Ship no import initially                         |
| Local model/runtime choice  | Chat vertical slice  | Architecture decision | Define an adapter and validate one runtime first |
| Distribution/signing choice | Release candidate    | Project owner         | Internal unsigned prerelease only                |

## Risk register

| ID    | Risk                                                     | Likelihood | Impact | Owner                | Mitigation                                                                  | Status |
| ----- | -------------------------------------------------------- | ---------- | ------ | -------------------- | --------------------------------------------------------------------------- | ------ |
| R-001 | Previous product behavior silently becomes rebuild scope | High       | High   | Project owner        | Approve scope/non-goals; add compatibility only through acceptance criteria | Open   |
| R-002 | Framework decisions precede product requirements         | Medium     | High   | Architecture owner   | Complete G1; use ADRs with alternatives and consequences                    | Open   |
| R-003 | Local-model behavior varies across hardware              | High       | High   | Implementation owner | Define hardware matrix; benchmark during foundation                         | Open   |
| R-004 | Data migration damages user conversations                | Medium     | High   | Storage owner        | Read-only import, fixtures, backups, rollback tests                         | Open   |
| R-005 | Packaging is deferred until late                         | Medium     | High   | Release owner        | Require a packaging smoke test at G3                                        | Open   |
| R-006 | Admin bypass weakens solo review policy                  | Medium     | Medium | Repository owner     | Use bypass only for recovery; audit rules at G0/G3                          | Open   |

Review this register at each gate and whenever scope or architecture changes. Replace role owners with named owners when the contributor model is known.
