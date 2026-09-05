# GitHub Repository Rules

Last audited: 2026-09-05

## Solo-maintainer policy

The public repository uses `main` as its default branch. Ruleset `Protection` applies to `main` and:

- blocks branch deletion and non-fast-forward updates;
- requires a pull request;
- requires zero external approvals because the repository has one maintainer;
- requires all review discussions to be resolved;
- permits only squash merge at the ruleset level;
- requires the governance check after it exists on `main`;
- allows repository administrators to bypass the ruleset for recovery only.

Repository-level settings permit squash merge only and delete merged branches automatically.

The pull request itself is the review boundary: complete its checklist, inspect the final diff after the latest push, resolve every discussion, and wait for all required checks before merging. Routine work must not use administrator bypass.

## Bootstrap exception

The 2026-09-05 repository reset was explicitly authorized to remove all old commits, tags, and releases and establish this governance root commit. It required a one-time protected-branch bypass and history replacement. The old Git history and release metadata were retained locally for recovery; the release assets were not downloaded.

This exception does not authorize later force pushes, direct `main` pushes, or tag changes.

## Required checks

The initial required check is `Governance / Policy`. During foundation work, add required format, lint, type, test, build, and packaging checks as those commands become available.

## Change control

Any later repository-settings or ruleset change requires an explicit request. Record the date, reason, old value, and new value here.
