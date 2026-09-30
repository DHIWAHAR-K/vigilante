# Shared contracts

This directory reserves the API/web contract boundary. It contains guidance only;
there are no implemented schemas or generated clients yet.

The [architecture](../ARCHITECTURE.md) proposes run creation, state retrieval,
cancellation, and an SSE event stream. The first runnable milestone should define
versioned request, result, and event schemas with compatibility fixtures here.

Specify lifecycle transitions, ordering/replay behavior, cursor retention, errors,
ownership, provisional/partial/final output, citation references, and usage accounting.
Choose one source of truth for schemas and document any generated code. Do not
independently maintain incompatible Python and TypeScript definitions.
