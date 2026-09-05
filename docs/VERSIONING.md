# Versioning and Release Policy

## Version scheme

Vigilante uses Semantic Versioning: `MAJOR.MINOR.PATCH[-PRERELEASE.NUMBER]`. The root `VERSION` file is the authoritative product version and contains no `v` prefix.

The rebuild starts at `0.2.0-alpha.1`, preserving the historical `0.1.x` lineage while marking the replacement as unstable. The intended progression is:

```text
0.2.0-alpha.1 → alpha.N → 0.2.0-beta.1 → beta.N
→ 0.2.0-rc.1 → rc.N → 0.2.0
```

- `alpha`: architecture and core workflows may change substantially.
- `beta`: planned release scope is feature-complete; compatibility and defects remain under validation.
- `rc`: release candidate; only release-blocking fixes and documentation changes are expected.
- Stable `0.2.x`: rebuild releases before the compatibility contract is mature.
- `1.0.0`: declared public compatibility contract is stable and upgrade behavior is documented.

Prerelease counters start at 1. Skipping a channel is allowed only through an explicit release decision.

## Increment rules

- Do not change the version for ordinary commits or pull requests.
- Increment the prerelease counter for each published build within a channel.
- Moving channels resets the counter to 1.
- After a stable release, use patch for compatible fixes, minor for compatible functionality, and major for incompatible changes to a supported contract.
- During `0.x`, incompatible changes require at least a minor increment and explicit migration/release notes.
- Data-schema revisions use independent sequential integers and never substitute for the product version.

Supported contracts must be declared during architecture. They include persisted user data, configuration, export formats, update behavior, and documented integrations. Internal boundaries are contracts only when documented as supported.

## Synchronization

Every future application manifest, native bundle manifest, installer metadata, and generated lockfile field must match `VERSION`. A single release-preparation command will update derived files, and CI will reject divergence. Until that tooling exists, do not add a second independently maintained version.

## Tags and changelog

- New tags use `v<version>`, for example `v0.2.0-alpha.1`.
- Historical `mark_*` tags were removed during the authorized repository reset and are retired permanently.
- Maintain `CHANGELOG.md` under `Unreleased`; move entries into a dated version section during release preparation.
- A published tag and its assets are immutable. Corrections require a new version.

## Release authorization

Version preparation, tag creation, draft release creation, and public release publication are distinct actions. Each requires explicit authorization unless a request clearly names all of them. Tags originate only from an approved, validated `main` commit. Alpha, beta, and RC releases are marked as prereleases.
