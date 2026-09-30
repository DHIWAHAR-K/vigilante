# Vigilante

A personal research engine for fast, cited answers with parallel investigation and
optional evidence-grounded multiagent debate.

**Status: repository foundation.** Architecture, working rules, evaluation criteria,
and repository checks are in place. The API, web application, provider integrations,
and benchmark runner are not implemented yet.

The intended experience starts with useful cited findings, lets the user inspect
the evidence, and spends additional effort on difficult or disputed questions.
The accepted direction is a Python asynchronous backend with FastAPI transport and
a Next.js/TypeScript frontend. Search and extraction are initially external services;
Vigilante owns scheduling, evidence handling, verification, and the experience.

## Start here

| Document | Purpose |
| --- | --- |
| [Architecture](ARCHITECTURE.md) | Components, dependencies, run lifecycle, and proposed streaming contract. |
| [Working instructions](AGENTS.md) | Rules for coding agents and automated contributors. |
| [Contribution guide](CONTRIBUTING.md) | Change workflow, verification, and commit conventions. |
| [Roadmap](docs/ROADMAP.md) | Milestones and evidence required to complete them. |
| [Evaluation protocol](evals/README.md) | Quality, latency, citation, and cost comparisons. |
| [Architecture decisions](docs/decisions/) | Accepted direction and tradeoffs. |
| [Landscape research](docs/research/research-agent-landscape-2026-09-29.md) | Dated primary-source review that informed the project. |
| [Security guidance](SECURITY.md) | Secrets, untrusted evidence, and access boundaries. |

## Repository layout

```text
apps/
  api/             Python backend boundary and scoped instructions
  web/             Next.js frontend boundary and scoped instructions
contracts/         Shared wire-contract guidance; schemas come with implementation
evals/             Evaluation protocol and scoped instructions
scripts/           Local repository checks
docs/
  decisions/       Architecture decision records
  research/        Dated research reports
.github/           CI, ownership, and pull-request template
```

Directories describe ownership; they do not imply runnable applications.

## Check this foundation

Use Python 3.11 or later and Git. The check uses only Python's standard library and
requires no provider keys, network access, or package installation.

```sh
python3 scripts/check_repository.py
git diff --check
```

The same repository check runs in GitHub Actions. It validates required foundation
files, UTF-8 text hygiene, and local inline Markdown link destinations outside code
fences. It does not fetch external links, validate heading anchors, or test an app.

The first implementation milestone will add a runnable skeleton with explicit run
contracts and clearly identified fixtures. The next milestone compares providers
and a single-researcher baseline on 30–50 representative questions. Parallel research
and bounded debate must earn their additional time and cost against that baseline.
Runtime versions, package managers, dependency lockfiles, deployment, and providers
will be selected and documented during implementation.

Initial targets are 10–20 seconds for straightforward cited answers and 30–60 seconds
for ordinary broader research. These are hypotheses, not measured performance.
