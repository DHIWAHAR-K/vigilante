# Evaluation protocol

This directory defines how Vigilante will test whether parallel research and bounded debate improve supported answers within a useful time and cost budget. No case dataset, runner, provider comparison, or measured score exists yet. The [roadmap](../docs/ROADMAP.md) describes the implementation sequence.

## Cases and evidence

Curate an initial 30–50 representative general-web questions across straightforward current facts, comparisons, obscure discovery, conflicting sources, and long documents. Do not manufacture results or assume all questions have one correct answer. Each case should specify its scope, an as-of date when relevant, required claims or coverage criteria, acceptable uncertainty, and a human-reviewable success rubric.

Maintain two complementary tracks:

- **Fixed evidence:** captured, versioned source passages and metadata for reproducible reasoning and synthesis comparisons. Record source identity, URL, publication/update date when known, capture time, and stable passage IDs. Preserve the content as well as its hash.
- **Live web:** real retrieval to test discovery, source availability, freshness, and extraction. Preserve run evidence and dates so later grading uses the information available at run time.

Keep tuning cases separate from held-out evaluation cases. Changes to prompts, routing, or models must identify which split informed the change. Begin with a pilot; expand the sample before making reliable tail-latency or broad quality claims.

## Strategies and controls

Compare at least these configurations:

| Configuration | Purpose |
|---|---|
| One capable researcher with cited synthesis | Establish the simplest useful baseline. |
| Two or three scoped researchers in parallel, then synthesis | Measure the value of independent coverage. |
| Parallel research plus bounded debate | Test independent initial assessments, one evidence-grounded challenge/rebuttal round, and adjudication that can retain uncertainty. |
| Parallel research plus additional retrieval | Spend a comparable incremental budget on new evidence instead of debate. |

Budget debate, any targeted retrieval, adjudication, final synthesis, and verification within the overall run allowance. Record whether debate was forced or chosen by the router. Separate critique, additional retrieval, and judging in ablations so their contributions can be distinguished.

Run **equal-dollar** and **equal-wall-clock-deadline** comparisons separately; they answer different questions. Fix case order or randomize it reproducibly, and keep model versions, source access, synthesis settings, and cache conditions comparable. Any intentional model or tool differences must be disclosed. For provider comparisons, hold the synthesis model and evidence allowances constant and retain provider-specific settings.

Repeat trials and report the number of repetitions, variance, and exclusions. Separate cold-cache and warm-cache runs. Include concurrency, provider stalls, extraction failures, retries, and deadline expiry. Report actual resource use alongside allowances; an unfinished run still counts.

## Measurements

Record a run trace with configuration versions, source passages, initial assessments, revisions, routing decisions, tool attempts, model usage, and event timestamps. Grade answer quality at both the provisional and final stages where both exist.

| Measure | Operational definition |
|---|---|
| Factual correctness | Material claims assessed against the case rubric and relevant evidence. Distinguish errors from justified uncertainty. |
| Claim coverage | Required case information supplied, including material contrary evidence and limitations. |
| Citation support and coverage | Whether cited passages entail the associated claims, and how many material factual claims have adequate support. Report both; citation presence alone is insufficient. |
| Source independence | Whether apparently separate sources share an original report, dataset, or copied claim. Count correlated evidence explicitly. |
| Currentness | Whether evidence and claims answer the requested as-of date; distinguish publication date, event date, and capture date. |
| Harmful revisions | Initially correct claims changed into incorrect claims after critique, debate, or synthesis. Preserve claim-level before/after evidence. |
| Router errors | Unnecessary debate and missed beneficial debate, assessed through paired debate/no-debate runs or a reviewed sample. Do not infer usefulness solely from a confidence score. |
| First evidence latency | Time from accepted request to the first relevant supporting source passage available to the system. |
| First useful cited output latency | Time to the first user-visible, substantive cited finding; record whether it is provisional. A status message or citation without a finding does not qualify. |
| Final checked latency | Time to the completed answer after its configured verification, including retries and synthesis. “Checked” describes the completed procedure, not guaranteed correctness. |
| Reliability | Completion, timeout, provider-error, and incomplete-answer rates, including cancellations and partial responses. |
| Cost | Actual inference, search, extraction, retries, and grading costs, with product-run and evaluation-only costs reported separately. Record pricing date and cache effects. |

Report p50/p95 for latency milestones with sample sizes, success/timeout rates, and deadlines. Do not silently drop runs missing a milestone or treat a timed-out run as a fast completion. Report successful-run latency separately where necessary and identify the incomplete observations. Small pilots provide directional evidence, not dependable production p95 estimates.

Define satisfactory completion per case before running the comparison: the answer must satisfy required coverage, support its material factual claims, meet the case's correctness threshold, and disclose unresolved conflicts appropriately. Report the rate of satisfactory completion and total product-run spend across **all** attempts divided by satisfactory completions. If none succeed, that cost ratio is undefined, not zero.

Use a human-reviewed, stratified subset that includes errors, conflicting evidence, timeouts/partial outputs, and apparently successful answers. Check automated graders against that subset and disclose disagreements. Blind reviewers to the strategy where practical; fluent writing and model agreement are not correctness criteria.

## Initial performance hypotheses

- **Simple cited answers:** completed response in 10–20 seconds.
- **Ordinary broader research:** supported synthesis in 30–60 seconds with two or three parallel researchers.
- **Deep research:** an explicit allowance in minutes, with progressive output.

These are unmeasured hypotheses, not acceptance guarantees or competitor benchmarks. Document the workload and full verification path for each target. Keep first evidence, provisional cited output, and final checked answer distinct. Any debate must fit the total deadline, and substantive corrections to provisional output must be visible.

## Decision record

Each comparison should preserve its case/configuration versions, run count, budget rules, raw traces, grading rubric, human-review findings, aggregate results, uncertainty, and limitations. Prefer the simplest strategy that earns its added latency and cost through better supported answers. Record conclusions in a [decision record](../docs/decisions/) before expanding product scope.
