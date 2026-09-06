# Changelog

All notable changes to Vigilante will be recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## 0.2.0-alpha.1 - 2026-09-06

### Added

- Rebuild governance, versioning, review, and release rules.
- Proposed responsive product designs, minimal single-conversation prototype with a black-and-white Perplexity-style layout, refined phone screens, compact inline citations, a centered SVG mark, and searchable conversation history, and coding-agent handoff in `design/`.
- Accepted v1 web architecture decisions for the Next.js/Vercel runtime, Supabase auth/data boundary, and AI/retrieval consent boundary.
- Added a buildable Next.js web foundation with Supabase SSR auth, protected app routing, conversation persistence boundaries, web-consent capture, local quality scripts, and CI web checks.
- Added a manual GitHub Actions release workflow for validating the release version, creating annotated tags, and publishing GitHub prereleases.

### Known Limitations

- The end-to-end email confirmation flow requires a real inbox; Supabase email signup, confirmation, and redirect settings are configured, but inbox-click verification was not completed during release validation.
- AI/retrieval responses are intentionally stubbed until the next approved checkpoint defines provider access, logging, and privacy controls.
- Desktop packaging is outside the v1 web release scope.

## Historical releases

The previous implementation used `mark_*` tags and inconsistent manifest versions. Its GitHub releases, tags, and commit history were removed during the authorized repository reset. Rebuild releases use `v<MAJOR.MINOR.PATCH>` tags, including prerelease suffixes where applicable.
