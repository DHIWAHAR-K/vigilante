# Roadmap

Vigilante is intended to provide fast, cited web research with optional bounded multiagent debate. The [landscape review](research/research-agent-landscape-2026-09-29.md) motivates the direction; it does not establish product performance. The [evaluation protocol](../evals/README.md) defines how to test it.

## Phase 0 — repository foundation

**Documentation foundation complete.** Repository guidance, the planned architecture, research findings, evaluation protocol, and implementation sequence are documented. This milestone does not mean that an application, benchmark runner, provider integration, or measured baseline exists.

Planned ownership boundaries are `apps/api` for the Python asynchronous backend, `apps/web` for the Next.js/TypeScript interface, `contracts` for shared wire contracts, `evals` for evaluation, `scripts` for repository checks, and `docs/decisions` for architecture decisions. FastAPI is the planned backend framework.

## Phase 1 — runnable skeleton

**Not started.** Establish the smallest working API and web application, an explicit request/run/event contract, and a local development path. Demonstrate a request, streamed progress, completion, cancellation, and failure handling with clearly identified fixtures. Add bounded execution and trace identifiers before attaching real provider work.

Exit when the skeleton runs end to end with verified development/check commands and documented setup. Fixture responses must not be presented as live research or quality evidence.

## Phase 2 — evaluation harness and provider comparison

**Not started.** Curate the initial 30–50 cases, implement trace capture and grading, connect candidate retrieval/extraction providers, and measure a single-researcher baseline. Compare cold/warm caches, repeated runs, failures, and concurrent load using both fixed evidence and live-web tracks.

Exit with reproducible results and a recorded provider/model decision under separately controlled dollar and deadline budgets. Validate citation support and currentness with a human-reviewed subset. Do this before broader product expansion.

## Phase 3 — parallel research and bounded debate

**Not started.** Add two or three independently scoped researchers, persistent claim-to-passage attribution, and coherent final synthesis. Evaluate one bounded evidence challenge/rebuttal round with adjudication against the same extra budget spent on retrieval. Test router errors and harmful revisions; preserve unresolved disagreement.

Exit when measured benefits justify the additional work for an identified class of questions. Retain simpler paths when they perform better. Include synthesis and verification within every deadline and cost allowance.

## Phase 4 — usable research experience

**Not started.** Add effort controls, inspectable evidence and disagreement, source/freshness controls, progressive cited output, and visible corrections. Improve caching, cancellation, retries, and concurrency from measured traces. Expand integrations and document/report outputs only after the preceding evaluation supports the core workflow.

Exit with repeatable quality and reliability checks for the supported workloads, honest timing/cost expectations, and documented operational limits.

## Targets to validate

Initial hypotheses are 10–20 seconds for a simple completed cited answer and 30–60 seconds for ordinary broader research. Deep research uses an explicit allowance in minutes. These figures are not measured results. Track first evidence, provisional cited findings, and final checked output separately, including p50/p95, failed runs, and total cost.

Update this roadmap and the relevant decision record when evidence changes a phase, dependency, or target. Mark milestones complete only after their exit conditions are met.
