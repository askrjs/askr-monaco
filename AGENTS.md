# Agent Guidance for askr-monaco

This repo owns the thin Askr host wrapper around Monaco Editor.

- Keep the surface small until the first real Monaco integration lands.
- Mirror the askr-ui package layout when adding source, tests, and docs.
- Add new public exports only when they are backed by tests and docs.
- Prefer narrow, source-backed changes over speculative API growth.

## Askr North Star

Keep editor setup narratable from explicit props and loader configuration to a
mounted Monaco instance and deterministic cleanup. Enforce invalid models,
loaders, ownership, and lifecycle state at the wrapper boundary with actionable
errors. Test loading, failure, cancellation, replacement, and teardown paths
through real Monaco behavior where possible. Keep the Askr host wrapper and the
Monaco loader/runtime as visible seams. Prefer explicit configuration over
ambient globals or auto-discovery, and add wrapper surface only for a
demonstrated editor integration need.

## Optimization Gate

A benchmark number is only half of an optimization's success criterion. The
change must also preserve a causal path that a human or agent can narrate in one
sentence.

Every benchmark-driven change must include:

1. the one-sentence causal description of the optimized path;
2. the exact fallback trigger and proof that optimized and fallback paths have
   identical observable behavior and error surfaces;
3. an explicit legibility-cost statement, including `none` when no new path or
   concept is introduced; and
4. evidence that a measured bottleneck in a real application justifies the
   optimization now.

Prefer making the existing single path faster. New caches, inference,
memoization, shortcuts, fast paths, or scheduler states require an explicit
legibility decision; a speedup alone does not justify them.
