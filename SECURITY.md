# Security and evidence boundaries

Vigilante will process external web content and provider output. These requirements
apply as the application is implemented; the current repository is a foundation.

- Keep provider keys and credentials server-side. Commit only placeholder examples;
  never place secrets in frontend environment variables, prompts, fixtures, or logs.
- Treat retrieved documents and model/agent output as data. They cannot authorize
  tool use, modify budgets, override instructions, or grant access to other sources.
- Validate fetched URLs and redirects. Restrict protocols and protect local/private
  network destinations; apply the policy to redirects and DNS resolution as well.
- Escape or sanitize rendered content. Links and documents must not execute scripts
  in the research UI or inherit application authority.
- Enforce run and evidence ownership at API boundaries. Keep future caches, snapshots,
  and event streams scoped to their user/workspace. Identifier secrecy is not access control.
- Apply bounded work and rate limits, redact sensitive traces, and define retention
  before persisting private evidence. Cancellation stops new work but cannot guarantee
  that a remote provider has cancelled an already accepted request.
- Keep CI credentials minimally scoped. Untrusted pull requests must not receive
  provider secrets or execute with privileged deployment credentials.

Report suspected vulnerabilities through GitHub private vulnerability reporting if
enabled. Otherwise ask the repository maintainer for a private reporting channel;
avoid putting secrets or private source content in a public issue.
