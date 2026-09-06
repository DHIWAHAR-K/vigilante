# Development Workflow

## Working agreement

Vigilante is developed through complete, reviewable checkpoints. Local edits and experiments may be frequent; repository history should describe meaningful outcomes. A request to implement work does not authorize a commit, push, pull request, merge, tag, or release unless that action is explicit.

Each checkpoint begins with:

1. Outcome: the user-visible or engineering result.
2. Boundaries: what belongs in the checkpoint and what does not.
3. Acceptance criteria: observable conditions for completion.
4. Validation plan: checks that demonstrate those conditions.
5. Version impact: none, patch, minor, major, or prerelease increment.

## Delivery stages

1. **Governance:** agree on workflow, versioning, review, and release rules.
2. **Product design:** define users, problems, supported platforms, scope, and success measures.
3. **Architecture:** choose system boundaries, dependency direction, persistence, local inference, and migration approach through decision records.
4. **Foundation:** establish only the buildable skeleton, automated checks, and version synchronization.
5. **Vertical slices:** deliver one complete user workflow per checkpoint with tests and documentation.
6. **Release candidate:** validate packaging, upgrades, privacy, recovery, release notes, and version consistency.

No stage advances until its go/no-go criteria are met. If a critical assumption changes, return to the affected gate and update the plan.

## Git workflow

- `main` contains accepted work and is never force-pushed.
- Branches follow `codex/<type>-<topic>` and remain short-lived.
- One pull request represents one coherent checkpoint. Required feedback and discussions must be resolved before squash merge.
- The pull request title becomes the squash commit subject and follows the commit standard.
- Intermediate work remains local. If local backup is needed, use a separate worktree or patch without publishing noisy history.
- Review the full staged diff and stage explicit paths. Never use blanket staging commands.

## Quality gates

The foundation must provide shared commands for formatting, linting, type checking, tests, build, and governance validation. CI runs the same commands. Each later checkpoint adds tests at the lowest useful level and exercises the real workflow where integration matters.

A checkpoint is ready only when its acceptance criteria pass, the relevant checks pass, its docs and changelog are current, and unresolved risk is stated. Skipped checks must include a reason and impact.

## Web foundation

The v1 web foundation uses Node.js 22+, npm, TypeScript, Next.js App Router, Supabase Auth/Postgres, and Vercel deployment. Run local work from the repository root:

```sh
npm install
npm run dev
npm run check
```

`npm run check` is the local pre-review gate for the web app. It runs formatting check, lint, typecheck, unit tests, build, and repository governance validation. Use `.env.local` for real Supabase values and keep `.env.example` as the public template.

Required local environment values:

```sh
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Supabase auth callback URLs must include:

- Local: `http://localhost:3000/auth/callback`
- Preview: the Vercel preview URL plus `/auth/callback`
- Production: the production domain plus `/auth/callback`

The app never needs a Supabase service-role key in browser code. Any future server-only secret must be documented separately and configured through local `.env.local` plus Vercel environment variables.

Production deployment is a separate action. First verify locally, then create a Vercel preview deployment, then promote or merge to production only after explicit authorization.

## Decision records

Create a decision record for choices that are costly to reverse or constrain several components: framework, runtime, storage, IPC, model execution, data migration, security model, supported platforms, packaging, and major dependency policy. Use the template in `docs/decisions/0000-template.md` and mark it proposed, accepted, superseded, or rejected.

## Repository controls

GitHub protects `main` from deletion and force pushes and requires pull requests, resolved discussions, and squash merging. Because Vigilante has one maintainer, required approval count is zero; the pull-request checklist, final-diff review, and required checks are the review gate. Administrators can bypass the ruleset only for repository recovery.

Local Git uses `.githooks`: the clean worktree rejects commits on `main`, runs governance checks before feature-branch commits, validates every commit subject, and permits pushes only to `codex/*` branches. Direct `main` and tag pushes are blocked.

Formal releases use the `Release` GitHub Actions workflow from a validated `main` commit. Run it with the exact version from `VERSION`; it validates the dated changelog section, creates the annotated `v<version>` tag, and publishes the GitHub release. Alpha, beta, and RC versions are marked as prereleases.

The authorized history reset and governance root commit are a one-time bootstrap exception to the no-force-push and pull-request rules. The bootstrap controls are active: the governance CI check is required, repository-level merge commits and rebase merges are disabled, and merged branches are deleted automatically.
