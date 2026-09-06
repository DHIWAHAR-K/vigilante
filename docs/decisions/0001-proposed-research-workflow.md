# ADR 0001: Unified conversation workflow

- Status: Proposed
- Date: 2026-09-05
- Owners: Project owner
- Supersedes: None

## Context

The owner requested a local design package and then explicitly clarified the interaction model: chat, research, and web research share one conversation screen; the left sidebar is only conversation history; the composer grows automatically; phone UI stays minimal. Earlier separate notebook/research/source-library designs were assistant assumptions and are removed.

## Decision drivers

- Follow explicit product direction instead of inferring extra sections from broad README language.
- Keep conversation continuity across local and web research.
- Make typing, history, and evidence usable on phones without duplicate navigation.

## Options considered

### Option A: One conversation interface

A single message stream with a growing composer, conversation history, Web option, and source dialogs. This is the owner's requested interface.

### Option B: Separate research, notebook, and source-library sections

Adds navigation and saved-note workflows that the owner did not request. Rejected for this design scope.

## Decision

Implement the design reference for Option A. History is the only desktop left-sidebar content; phone history is a drawer. History search opens on demand, and the desktop sidebar can hide without losing the conversation or draft. New lives in the desktop sidebar/rail and the phone header. Sources are inspected from messages. Local/web research are options within the same conversation. There are no mobile bottom tabs and no manual textarea resize control.

This records user-directed interface constraints without accepting the complete G1/G2 product or architecture milestone. No native shell, model runtime, storage engine, phone execution runtime, retrieval provider, data schema, or packaging technology is chosen. No Note entity or notebook/export feature is included in current scope.

## Consequences

Coding agents must follow the current `design/how_vigilante_works.md`, not superseded screen concepts. Production persistence, local inference availability, web consent enforcement, and phone platform support require the relevant approved architecture decisions. Version impact is none.

## Validation

Verify history selection, isolated drafts and runs, local/web questions within one transcript, source dialogs, auto-growing/shrinking textarea, and phone/desktop geometry. Record actual results and limitations in `design/validation.md` before preparing the local checkpoint for review.
