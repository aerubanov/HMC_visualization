# Sampler Comparison Post-Processing Plan

## Objective

When multiple chains run with the **same sampler type**, post-processing behaves as today: samples are merged, R-hat is computed across chains, and a single set of histograms is shown.

When chains use **different sampler types**, R-hat is meaningless and is skipped. ESS is computed independently per chain. Two side-by-side histogram panels are shown (each with 2D joint + X marginal + Y marginal), one per chain, labelled with the sampler name.

---

## Modules / Classes

### `src/utils/histogramUtils.js` (modify)

Add `prepareHistogramDataPerChain(chains, burnIn)` — iterates over the chains array, slices burn-in from each chain's samples, and returns `[{ samplerType, label, samples }, ...]`. The existing `prepareHistogramData` is unchanged.

### `src/hooks/useSamplingController.js` (modify)

- Add pure helper `allChainsCompatible(chains)` (replaces `allSameSamplerType`) — returns `true` when every chain shares the same `samplerType` **and** the same sampler params (all fields in `params` except `initialPosition` and `seed`, which are chain-specific and irrelevant to convergence diagnostics).
- In the stats `useEffect`, branch on `allSameSamplerType(chains)`:
  - **Same type**: existing path unchanged — merge histogram, compute R-hat + joint ESS, set `essPerChain = null`, set `histogramDataPerChain = null`.
  - **Different types**: call `prepareHistogramDataPerChain`, set `rHat = null`, compute `calculateESS([chain.samples.slice(burnIn)])` for each chain individually, store as `essPerChain: [{ chainId, ess: {x,y} }]`, set `histogramData = null`.
- Add `essPerChain` and `histogramDataPerChain` to the hook's return value.

### `src/components/HistogramPlots.jsx` (modify)

- Accept new optional prop `histogramDataPerChain: Array<{ samplerType, label, samples }>`.
- When `histogramDataPerChain` is provided: render side-by-side columns, one per entry, each column showing all 3 plots (2D joint, X marginal, Y marginal) with a sampler-name header.
- When absent/null: render existing single-panel layout unchanged (backward-compatible).

### `src/components/TracePlots.jsx` (modify)

- Accept new optional prop `essPerChain: Array<{ chainId, ess: {x,y} }>`.
- When `essPerChain` is provided: show per-chain ESS inline with each chain's trace header row instead of the aggregate `ess` prop.
- When absent/null: existing aggregate ESS display unchanged (backward-compatible).

### `src/App.jsx` (modify)

Pass `essPerChain` and `histogramDataPerChain` from `useSamplingController` through to `TracePlots` and `HistogramPlots`.

---

## Test Cases

### `histogramUtils` (`tests/utils/histogramUtils.test.js`)

1. **Per-chain output shape** — `prepareHistogramDataPerChain` returns one entry per chain, each with `samplerType`, `label`, and `samples` fields.
2. **Burn-in slicing** — samples before `burnIn` index are excluded from each chain's output independently.
3. **No cross-chain merging** — two chains with different sampler types produce two separate entries with no samples shared between them.

### `useSamplingController` (`tests/hooks/useSamplingController.test.js`)

4. **`allChainsCompatible` — same type and params** — returns `true` when all chains share the same `samplerType` and identical `params`.
5. **`allChainsCompatible` — different type** — returns `false` when sampler types differ.
6. **`allChainsCompatible` — same type, different params** — returns `false` when sampler types match but at least one param value differs (e.g. different epsilon).
7. **`allChainsCompatible` — ignores seed and initialPosition** — returns `true` when only `seed` or `initialPosition` differ between chains.
8. **Different samplers path** — when chains differ: `rHat` is null, `essPerChain` has one entry per chain each with a valid `ess` object, `histogramDataPerChain` is populated, `histogramData` is null.
9. **Same sampler path** — when chains are the same type: `rHat` is computed, `essPerChain` is null, `histogramData` is populated, `histogramDataPerChain` is null.

### `HistogramPlots` (`tests/components/HistogramPlots.test.jsx`)

8. **Split layout renders** — with `histogramDataPerChain` containing two entries, two labelled panels are rendered.
9. **Legacy layout unchanged** — with only the existing `histogramData` prop (no `histogramDataPerChain`), the single-panel layout renders as before.

### `TracePlots` (`tests/components/TracePlots.test.jsx`)

10. **Per-chain ESS displayed** — with `essPerChain` provided, ESS values appear adjacent to each chain's trace header.
11. **Aggregate ESS fallback** — without `essPerChain`, the existing aggregate `ess` prop is displayed unchanged.
