# Sampler Comparison — Bug Fixes & Quality Improvements

## Objective

Address critical bugs, race conditions, and test coverage gaps found during code review of the `samplers-comparison` branch before it is merged to `main`. The issues fall into three groups: correctness bugs, performance/stability issues, and missing test coverage.

---

## Modules / Classes

### `src/samplers/SamplingChain.js` (modify)

- Add `try/catch` inside `step()` and expose a per-chain `error` field so that a math evaluation failure in one chain does not propagate to others.
- No other changes needed — `setSamplerType()` already resets internal state correctly; the sync issue is in the hook, not here.

### `src/hooks/useSamplingController.js` (modify)

**Double instantiation fix**

- Remove `new SamplingChain()` from `addChain()`. Let the `useEffect` be the single place that creates instances. `addChain()` should only push to `setChains` state.
- Alternatively, create only in `addChain()` and remove creation from the `useEffect`. Either way, only one path may own construction.

**Chain removal safety**

- Add an `isRunning` guard to `removeChain(id)`: return early (or stop sampling first) if a simulation is in progress.

**Sampler type switch sync**

- In `setChainConfig()`, when `samplerType` changes, call `impl.setSamplerType(type)` on the ref instance _before_ updating React state, so the ref and state stay consistent.

**useEffect dependency scope**

- Replace the broad `chains` dependency in the init `useEffect` with a derived value that only changes when chain IDs are added/removed (e.g., a joined string of ids), so it does not fire on every `syncChainsState` call.

**Per-chain error state**

- Replace global `error` string with a `chainErrors` Map in state (`id → message`). Expose it in the hook return. Propagate errors from `SamplingChain.step()` catch blocks.

**`resetChain(id)` API**

- Add a `resetChain(id)` function that calls `impl.reset()` on a single chain ref and clears that chain's state in the `chains` array, without affecting other chains.

**syncChainsState optimisation**

- Avoid copying the full `samples` array on every step. Track an `acceptedCount` integer on the chain ref instead, so TracePlots can use it directly. Only copy `trajectory` (small, bounded) and the latest sample on each sync.

### `src/components/TracePlots.jsx` (modify)

- Replace `chain.samples.length` in the acceptance rate formula with `chain.acceptedCount` (a dedicated counter). The denominator becomes `chain.acceptedCount + chain.rejectedCount`.

### `src/components/Controls.jsx` (modify)

- Restore `PropTypes.arrayOf(PropTypes.shape({...}))` for the `chains` prop with the full chain shape (`id`, `samplerType`, `params`, `initialPosition`, `seed`, `samples`, `trajectory`, `rejectedCount`, `acceptedCount`, `error`).

### `src/components/TracePlots.jsx` — PropTypes (modify)

- Restore `PropTypes.arrayOf(PropTypes.shape({...}))` for `chains` and `PropTypes.shape({x: ..., y: ...})` for `rHat` and `ess`.

---

## Test Cases

### `tests/samplers/SamplingChain.test.js` (new)

1. **Initializes with HMC by default** — constructor with no config creates an `HMCSampler` instance.
2. **Initializes with Gibbs when specified** — `samplerType: 'GIBBS'` creates a `GibbsSampler`.
3. **step() updates currentParticle** — after one step, `currentParticle.q` differs from initial position.
4. **step() increments samples on acceptance** — mock sampler returns `accepted: true`; `samples.length` becomes 1.
5. **step() increments rejectedCount on rejection** — mock returns `accepted: false`; `rejectedCount` becomes 1.
6. **step() returns null-safe on missing sampler** — `this.sampler = null`; `step()` returns `null` without throwing.
7. **step() catches logP errors** — logP throws; `step()` catches, sets `this.error`, returns `null`.
8. **setParams() propagates to sampler** — spy on `sampler.setParams`; verify called with correct subset.
9. **setSamplerType() resets samples and trajectory** — switch HMC→GIBBS after sampling; `samples` and `trajectory` are empty, new sampler is `GibbsSampler`.
10. **reset() restores initial position** — sample several steps, call `reset()`; `currentParticle.q` equals `initialPosition`.

### `tests/hooks/useSamplingController.test.js` (update)

11. **addChain() adds to chains array** — call `addChain({samplerType:'GIBBS'})`; `chains` has length 2.
12. **addChain() creates exactly one ref instance** — verify `samplingChainsRef` has exactly two entries after add.
13. **removeChain() removes correct chain** — add chain, remove by id; `chains` has length 1 with correct remaining id.
14. **removeChain() is blocked while running** — call `step()` to start, then `removeChain()`; chain is still present.
15. **setChainConfig() with samplerType change syncs ref** — switch chain 0 to GIBBS; `samplingChainsRef.current.get(0).samplerType` equals `'GIBBS'`.
16. **resetChain(id) resets only target chain** — sample both chains, reset chain 0 only; chain 1 samples are unchanged.
17. **Multi-chain step() — both chains accumulate samples** — `sampleSteps(10)` with two chains; both have `~10` samples.
18. **Per-chain error does not stop other chain** — chain 0 logP throws; chain 1 continues sampling normally.

### `tests/components/TracePlots.test.jsx` (update)

19. **Fix mock chain shape** — replace `acceptedCount` with correct fields (`samples: []`, `rejectedCount`, `acceptedCount`) matching the real chain object shape.
20. **Acceptance rate uses acceptedCount** — mock chain with `acceptedCount: 8, rejectedCount: 2`; rendered rate shows `80.0%`.
21. **Zero-division guard** — mock chain with both counts at 0; renders `0.0%` without crash.
