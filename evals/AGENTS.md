# Evaluation work

Inherit the repository root `AGENTS.md`. This file adds evaluation-specific guidance.

- Follow the protocol in `README.md`. Keep benchmark cases, runner code, and measured results distinct.
- Never fabricate source captures, results, costs, or latency measurements. Identify synthetic or proposed cases as such rather than presenting them as observed user queries. Mark proposed targets and unrun configurations explicitly.
- Compare strategies with the same case set and document model, prompt, provider, source-access, cache, and budget differences. Run equal-dollar and equal-deadline comparisons separately.
- Preserve failed, timed-out, and incomplete runs in results. Record actual attempts, retries, and costs; do not report only successful runs.
- Retain initial claims and subsequent revisions so harmful answer changes and debate-routing errors can be evaluated.
- Keep source identifiers and captured evidence traceable through synthesis and grading. A working URL alone does not establish claim support.
- Version datasets, configurations, rubrics, and grader prompts. Keep credentials and private content out of fixtures and reports.
- Use a human-reviewed subset to check automated judgments. Report uncertainty and sample size; do not present a small pilot as a production latency guarantee.
- Add runnable commands only when their implementation exists and the commands have been verified.

At the documentation-foundation milestone, no benchmark runner or measured baseline exists. Update this status when implementation and measurements are added.
