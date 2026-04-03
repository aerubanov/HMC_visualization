---
name: Samplers Comparison Architecture Patterns
description: Key patterns and decisions from implementing the samplers-comparison branch bug fixes
type: project
---

Per-chain error isolation pattern: `SamplingChain.step()` wraps the sampler call in try/catch and stores errors in `this.error`. Errors do NOT propagate to the global `error` state in `useSamplingController`. Tests that previously checked `result.current.error` for sampler-thrown errors must now check `result.current.chains[0].error`.

**Why:** One chain's math failure should not stop other chains from sampling.

**How to apply:** When writing tests for error handling in sampling, always distinguish between per-chain errors (`chain.error`) and global parsing errors (`error`, e.g. invalid logP syntax).

`acceptedCount` is a dedicated integer counter on `SamplingChain` — separate from `samples.length`. The `TracePlots` acceptance rate formula uses `acceptedCount` as numerator (not `samples.length`), so that the denominator `acceptedCount + rejectedCount` is always accurate regardless of how samples are sliced or filtered.

`removeChain` is guarded by `isRunning`: returns early if sampling is active.

`resetChain(id)` resets a single chain without affecting others — exposed on the hook return.

`chainErrors` (a `Map<id, message>`) is exposed alongside the global `error` string for per-chain error UI.

The init `useEffect` for creating `SamplingChain` refs depends on `chainIdsKey` (joined string of ids), not the full `chains` array, to avoid re-running on every `syncChainsState` call.

`addChain()` both sets the ref AND pushes to state — the `useEffect` skips creation since the id is already in the map.
