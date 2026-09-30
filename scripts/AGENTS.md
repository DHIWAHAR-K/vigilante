# Repository tooling rules

Inherit [root instructions](../AGENTS.md). Scope: `scripts/`.

- Keep foundation checks deterministic, offline, and free of provider credentials.
- Use Python's standard library unless a concrete need justifies another dependency.
- Resolve paths from the repository location, not the caller's current directory.
- Fail with actionable file/line diagnostics; return a nonzero exit code on failure.
- Checks must not silently rewrite files or modify Git configuration and refs.
- Document exactly what a check validates and its limitations; avoid pretending
  lightweight Markdown validation is a full parser, app test, or security scanner.
