# Contributing to Vigilante

## Before implementation

Every checkpoint needs a written outcome, boundaries, acceptance criteria, and validation plan. Architecture choices with lasting consequences require an accepted decision record in `docs/decisions/`.

## Branches and pull requests

- Start from current `main` and use a short-lived `codex/<type>-<topic>` branch.
- Keep one coherent outcome per pull request. Do not mix cleanup, refactors, and features without a shared acceptance criterion.
- Stage explicit paths after reviewing the full diff. Do not use blanket staging.
- Do not commit, push, open or merge a pull request, create a tag, or publish a release without explicit authorization for that checkpoint and action.
- Use squash merge after all required checks, reviews, and discussion resolutions are complete.
- Delete the source branch after merge. Never rewrite `main` or move a published tag.

This is a solo-maintainer repository. Pull requests remain mandatory as a review boundary, but an approval from another person is not required. Complete the pull-request checklist, review the final diff after the latest push, resolve every discussion, and wait for required checks before merging. Administrator bypass is reserved for repository recovery.

## Commit and pull request titles

Use `type(scope): imperative summary` or `type(scope)!: imperative summary` for a breaking change. A scope is required; the full header is limited to 72 characters and has no trailing period.

Allowed types are `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `style`, `chore`, and `revert`.

Examples:

- `feat(chat): persist conversation history`
- `fix(runtime): recover after startup failure`
- `docs(repo): establish rebuild governance`
- `chore(release): prepare v0.2.0-alpha.2`

Use `BREAKING CHANGE:` in the body when a supported contract changes. Avoid vague summaries such as “updates,” “changes,” or “final fixes.” Pull request titles follow the same format because squash merges use them as the final commit subject.

## Ready-to-review gate

- Acceptance criteria are met and the diff contains only the agreed checkpoint.
- Relevant formatting, lint, type, unit, integration, and build checks pass.
- UI/native changes exercise the real desktop workflow when one exists.
- Dependency and lockfile changes are intentional; generated files, local data, caches, and secrets are excluded.
- Documentation, migration notes, changelog entries, and version impact are accurate.
- Checks that could not run are listed with the reason and practical risk.

See `docs/DEVELOPMENT.md` and `docs/VERSIONING.md` for the complete policy.
