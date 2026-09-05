# Release Checklist

## Prepare

- [ ] Release scope and target version are approved.
- [ ] `main` contains only reviewed, accepted changes.
- [ ] `VERSION` and all derived manifests are synchronized.
- [ ] `CHANGELOG.md` has a dated section for the target version.
- [ ] Compatibility changes and data migrations are documented and tested.
- [ ] Formatting, lint, type, unit, integration, build, and packaging checks pass.
- [ ] The packaged desktop application has been exercised on each supported platform.
- [ ] Privacy, security, backup/recovery, and failure paths relevant to the release are checked.
- [ ] Known limitations and skipped checks are documented with impact.

## Go/no-go

- [ ] No open release-blocking defect or unmitigated high-impact risk remains.
- [ ] Install and upgrade paths work from the oldest supported version.
- [ ] Release notes describe user-visible changes, fixes, compatibility, and known issues.
- [ ] The exact commit SHA and generated artifacts are recorded.
- [ ] Explicit authorization has been given to create the tag and draft release.

## Publish

- [ ] Create an annotated `v<version>` tag from the approved `main` commit.
- [ ] Build artifacts from that tag in CI; do not rebuild unrecorded local state.
- [ ] Verify artifact names, checksums, signatures/notarization status, and release metadata.
- [ ] Mark alpha, beta, and RC versions as prereleases.
- [ ] Review the draft release and obtain explicit publication authorization.
- [ ] Publish without moving the tag or replacing released assets.

## After release

- [ ] Verify the public release page, download, install, and launch path.
- [ ] Open a fresh `Unreleased` changelog section if needed.
- [ ] Record follow-up issues and update the project risk register.
