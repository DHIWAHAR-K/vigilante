# Rebuild Project Plan

Status: **GREEN — product definition**

Governance and repository controls are complete. Implementation has not started. The current objective is to define and approve the product milestone before choosing the architecture or creating a foundation.

## Gates

| Gate | Deliverables | Exit decision |
| --- | --- | --- |
| G0 Governance | Development, solo review, commit, version, and release rules | Establish the governance root commit and repository controls |
| G1 Product | Users, problems, scope, non-goals, supported platforms, success measures | Approve a first product milestone |
| G2 Architecture | Component boundaries, stack, data ownership, local inference, migration, security, ADRs | Approve the foundation design |
| G3 Foundation | Buildable skeleton, shared commands, CI, version sync, packaging smoke test | Approve vertical-slice work |
| G4 Alpha | Core workflows complete enough for internal use | Begin alpha releases |
| G5 Beta/RC | Feature-complete, migration/packaging tested, blockers controlled | Advance release channel |
| G6 Stable | Release checklist satisfied and publication approved | Publish stable rebuild |

## Immediate decisions after G0

1. Define the primary user and the first complete research workflow.
2. Confirm supported macOS versions and hardware targets.
3. Decide which legacy data and behavior must migrate or remain compatible.
4. Choose the UI shell, native boundary, local model runtime, persistence model, and web-retrieval boundary through decision records.
5. Define privacy, offline behavior, update/distribution, and failure-recovery requirements.

## Dependencies

| Need | Required by | Owner | Fallback if unresolved |
| --- | --- | --- | --- |
| Approved product milestone | Architecture | Project owner | Limit design to reversible experiments |
| Supported platform matrix | Foundation/packaging | Project owner | Target current Apple Silicon macOS only |
| Legacy migration contract | Storage architecture | Project owner | Preserve legacy files read-only and ship no import initially |
| Local model/runtime choice | Chat vertical slice | Architecture decision | Define an adapter and validate one runtime first |
| Distribution/signing choice | Release candidate | Project owner | Internal unsigned prerelease only |

## Risk register

| ID | Risk | Likelihood | Impact | Owner | Mitigation | Status |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | Legacy behavior silently becomes rebuild scope | High | High | Project owner | Approve scope/non-goals; import only through acceptance criteria | Open |
| R-002 | Framework decisions precede product requirements | Medium | High | Architecture owner | Complete G1; use ADRs with alternatives and consequences | Open |
| R-003 | Local-model behavior varies across hardware | High | High | Implementation owner | Define hardware matrix; benchmark during foundation | Open |
| R-004 | Data migration damages user conversations | Medium | High | Storage owner | Read-only import, fixtures, backups, rollback tests | Open |
| R-005 | Packaging is deferred until late | Medium | High | Release owner | Require a packaging smoke test at G3 | Open |
| R-006 | Admin bypass weakens solo review policy | Medium | Medium | Repository owner | Use bypass only for recovery; audit rules at G0/G3 | Open |

Review this register at each gate and whenever scope or architecture changes. Replace role owners with named owners when the contributor model is known.
