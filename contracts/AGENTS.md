# Contract working rules

Inherit [root instructions](../AGENTS.md). Scope: `contracts/`.

- Specify wire behavior at the API/web boundary, not Python or vendor internals.
- Schemas are not implemented yet. Add a schema with its owning endpoint/event,
  versioning rules, examples, and compatibility checks when that behavior is built.
- Distinguish run state from output completeness, and provisional output from final
  checked output. Define error, cancellation, replay, and partial-result behavior.
- Preserve stable run, event, source, snapshot, passage, and claim identifiers.
- Define nullable/unknown dates and unavailable usage explicitly. Do not invent
  precision, confidence calibration, or evidence guarantees.
- Keep secrets, private raw documents, provider objects, and internal reasoning out
  of public payloads. Use synthetic or redistributable fixtures.
