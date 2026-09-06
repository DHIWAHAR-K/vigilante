# Changelog

All notable changes to Vigilante will be recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Rebuild governance, versioning, review, and release rules.
- Proposed responsive product designs, minimal single-conversation prototype with a black-and-white Perplexity-style layout, refined phone screens, compact inline citations, a centered SVG mark, and searchable conversation history, and coding-agent handoff in `design/`.
- Accepted v1 web architecture decisions for the Next.js/Vercel runtime, Supabase auth/data boundary, and AI/retrieval consent boundary.
- Added a buildable Next.js web foundation with Supabase SSR auth, protected app routing, conversation persistence boundaries, web-consent capture, local quality scripts, and CI web checks.

## Historical releases

The previous implementation used `mark_*` tags and inconsistent manifest versions. Its GitHub releases, tags, and commit history were removed during the authorized repository reset. Rebuild releases use `v<MAJOR.MINOR.PATCH>` tags, including prerelease suffixes where applicable.
