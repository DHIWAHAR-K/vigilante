# ADR 0002: Evidence records and bounded debate

- Date: 2026-09-30
- Status: Accepted direction; schemas and execution policy pending implementation.

## Context

Parallel research, independent model answers, critique, and debate serve different
purposes. The [landscape review](../research/research-agent-landscape-2026-09-29.md)
finds mixed evidence for debate and documents synthesis/citation failures. More
agents or greater agreement cannot establish correctness. A fast research product
must make the value and cost of additional deliberation observable.

## Decision

Use structured evidence as the shared basis of research, synthesis, and debate.
The conceptual records below are a design requirement, not existing schemas:

| Record | Required meaning |
| --- | --- |
| Source | Requested/canonical URL, source identity, retrieval time, observed publication/update dates. |
| Snapshot | Captured source version, content hash, extraction metadata, access/retention constraints. |
| Passage | Stable ID within a snapshot, captured excerpt, location, extraction provenance. |
| Claim | Material assertion, relevant time/scope, passage references, support/verification status. |
| Position | Independent assessment, claims, assumptions, uncertainty, and later revisions. |
| Objection | Challenged claim or assumption, relevant evidence, and resolution or remaining uncertainty. |

Missing publication dates remain unknown. Preserve snapshots where permitted and
explicitly disclose when only metadata or excerpts are retained. A hash can identify
content changes but cannot replace retained evidence. Label generated summaries as
summaries; do not represent them as original passages. Track common origins so copied
announcements and syndication are not counted as independent corroboration.

Map final material claims to passages. Check that citations resolve to the captured
source, that the passage supports the assertion, and that dates match the question.
Unsupported claims must be removed, corrected, or presented as unresolved. Verification
does not imply perfect accuracy; retain check results and evaluate their reliability.

Debate is optional and bounded within the run's total budget:

1. Obtain two or three independent initial positions before sharing peer answers.
2. Identify material disagreement, unsupported claims, or missing assumptions.
3. Allow a limited evidence challenge, targeted retrieval, and rebuttal/revision.
4. Adjudicate using cited evidence and scope; preserve unresolved disagreement when
   the available evidence does not support a decision.
5. Verify the synthesized answer and expose substantive revisions to the user.

Keep initial assessments, objections, evidence, revisions, and the adjudication
rationale. Do not require or expose hidden chain of thought. Debate roles may share
an evidence corpus, but that does not make their conclusions or sources independent.
Model diversity is an experimental variable, not a correctness guarantee.

Set explicit ceilings for rounds, concurrency, elapsed time, tokens, tool calls, and
estimated spend before dispatch. Reserve budget for synthesis and verification.
Stop when evidence is sufficient, no useful challenge remains, cancellation arrives,
or a budget is exhausted. Debate cannot silently extend the deadline.

Output can be provisional while checks continue, partial when requested work remains
incomplete, or final after the defined checks. Final answers may explicitly retain
uncertainty; a forced consensus is not a completion criterion.

## Consequences and evaluation

Evidence records add extraction, storage, and verification work but support source
inspection, reproducibility, and diagnosis of handoff errors. Private evidence needs
access scoping and retention policies. Retrieved text and peer output are untrusted
data and cannot change tool permissions, budgets, or system instructions.

Debate adds sequential turns and may reinforce shared mistakes or overturn a correct
answer. Evaluate it against single-agent and parallel-research baselines in separate
equal-cost and equal-deadline trials, including the same extra budget spent on retrieval.
Use fixed-evidence ablations to distinguish debate from new evidence and stronger
judging. Measure citation support, contrary evidence, harmful revisions, unnecessary
debate, unresolved conflicts, latency, and cost on the initial 30–50-case set.

Revisit the routing policy if debate does not improve supported answers within the
budget. Retain user-requested debate as an explicit capability with its cost visible;
do not enable it for every query merely because multiple agents are available.
