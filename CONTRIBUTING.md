# Contributing

Read [AGENTS.md](AGENTS.md), [ARCHITECTURE.md](ARCHITECTURE.md), and the instructions
within the directory you are changing. Use [the roadmap](docs/ROADMAP.md) to keep
work aligned with the current milestone.

## Changes

1. Inspect the working tree and current branch; preserve unrelated work.
2. Keep each change focused on a concrete behavior or repository improvement.
3. Specify cross-application contracts before coupling the API and web client.
4. Update relevant documentation and decision records alongside the change.
5. Run the checks that exist for the affected component, then review the diff.

Use scoped branches such as `feat/research-baseline` or `docs/evidence-contract`.
The existing GitHub rules require changes to `main` through a pull request, a passing
`Policy` check, resolved review threads, and squash merging. Check the current rules
before publishing. Do not force-push shared branches or use account bypass privileges.
The foundation's `Policy` job runs the repository check; extend it with appropriate
application checks as runnable components are introduced.

## Validation

Run `python3 scripts/check_repository.py` and `git diff --check` for the current
foundation. No application test/build command exists yet. Add and document those
commands with the first runnable components.

Test observable behavior, especially evidence support, budget admission, cancellation,
provider failures, and contract compatibility. Deterministic tests should use fixtures
and fake adapters. Live benchmarks belong to the separate [evaluation workflow](evals/README.md),
with provider/model identifiers, date, configuration, budgets, and measured results.

Do not describe targets, fixture responses, or vendor claims as local measurements.
Document validation limitations and unfinished work directly in the change description.

## Commit messages

Use `type(scope): imperative description`. Common types are `feat`, `fix`, `docs`,
`test`, `refactor`, `perf`, `build`, `ci`, and `chore`; common scopes include `api`,
`web`, `contracts`, `evals`, `research`, and `repo`.

Examples:

```text
docs(research): record the research-agent landscape
feat(api): enforce a shared run deadline
fix(web): preserve source links during answer revisions
test(evals): cover unsupported citation failures
```

One commit should represent one coherent change. Explain consequential tradeoffs in
the body. Describe compatibility changes explicitly. Inspect staged content before
committing; do not include credentials, generated caches, or unrelated changes.

## Decisions and dependencies

Create a numbered ADR in `docs/decisions/` for changes to runtime direction, provider
selection, durable state, shared contracts, or debate policy. Include context, decision,
alternatives, consequences, status, date, and the evidence that would trigger a revisit.

Check official dependency documentation and compatibility before adding packages.
Introduce lockfiles with the selected package managers. Check licenses and preserve
required notices when reusing third-party code; the project license is not selected yet.
