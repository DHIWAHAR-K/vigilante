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
- Review the full staged diff and stage explicit paths. The preserved legacy checkout contains untracked reference files and must never be blanket-staged.

## Quality gates

The foundation must provide shared commands for formatting, linting, type checking, tests, build, and governance validation. CI runs the same commands. Each later checkpoint adds tests at the lowest useful level and exercises the real workflow where integration matters.

A checkpoint is ready only when its acceptance criteria pass, the relevant checks pass, its docs and changelog are current, and unresolved risk is stated. Skipped checks must include a reason and impact.

## Decision records

Create a decision record for choices that are costly to reverse or constrain several components: framework, runtime, storage, IPC, model execution, data migration, security model, supported platforms, packaging, and major dependency policy. Use the template in `docs/decisions/0000-template.md` and mark it proposed, accepted, superseded, or rejected.

## Repository controls

GitHub protects `main` from deletion and force pushes and requires pull requests, resolved discussions, and squash merging. Because Vigilante has one maintainer, required approval count is zero; the pull-request checklist, final-diff review, and required checks are the review gate. Administrators can bypass the ruleset only for repository recovery.

Local Git uses `.githooks`: the clean worktree rejects commits on `main`, runs governance checks before feature-branch commits, validates every commit subject, and permits pushes only to `codex/*` branches. Direct `main` and tag pushes are blocked. The preserved-reference checkout rejects commits and pushes entirely.

The authorized history reset and governance root commit are a one-time bootstrap exception to the no-force-push and pull-request rules. The bootstrap controls are active: the governance CI check is required, repository-level merge commits and rebase merges are disabled, and merged branches are deleted automatically.
