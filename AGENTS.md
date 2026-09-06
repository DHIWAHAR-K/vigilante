# Repository Instructions

## Current phase

- Vigilante is maintained by one person. Use the solo-maintainer review policy in `docs/GITHUB_RULES.md`.
- This is the clean Vigilante rebuild tree. The previous implementation and its local recovery copies were permanently deleted on 2026-09-05 and must not be restored or reintroduced.
- Governance and design precede implementation. Read `docs/PROJECT_PLAN.md`, `docs/DEVELOPMENT.md`, and `docs/VERSIONING.md` before changing the project.
- Derive the rebuild architecture from approved product requirements. Record durable choices in `docs/decisions/` before foundation work.

## Git authorization

- Prepare complete, reviewable checkpoints locally.
- Never commit, push, open or merge a pull request, create or move a tag, change repository settings, or publish a release without explicit user authorization covering that checkpoint and action.
- Stage only explicit paths after reviewing the diff. Never use blanket staging commands.
- Work on a short-lived `codex/<type>-<topic>` branch. Do not commit directly to `main`.
- Local hooks block direct pushes to `main` and tag pushes; approved releases use the release workflow.
- Use the required Conventional Commit format from `CONTRIBUTING.md`. Keep version bumps for release-preparation checkpoints.

## Quality

- Define acceptance criteria and a validation plan before implementation.
- Run checks appropriate to the changed behavior and report any check that could not run.
- Keep generated binaries, local data, caches, credentials, and private configuration out of Git.
- Update documentation and `CHANGELOG.md` when behavior or supported contracts change.
- Treat persisted data, configuration, exports, and documented integrations as compatibility contracts once declared.

## Releases

- `VERSION` is the product version source of truth. Keep all future application manifests synchronized with it.
- Use `v<version>` Git tags. Do not create new `mark_*` tags.
- Follow `docs/RELEASE_CHECKLIST.md`; release/tag/publication authorization is separate from implementation authorization.
