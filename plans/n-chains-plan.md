# N-Chains Support Plan

## Objective

Allow users to run more than two sampling chains simultaneously (up to 6). Replace the current hardcoded two-chain logic with a unified group-by-sampler-type approach: chains of the same type are always merged for histograms and diagnostics, regardless of count.

---

## Modules / Classes

### `src/types.ts`

- Add `colorIndex: number` to `ChainState` — palette slot assigned at creation, never reassigned.
- Add `GroupStats` interface: `{ samplerType: SamplerType; rHat: EssResult | null; ess: EssResult | null }` — per-type-group diagnostics replacing the current flat `rHat`/`ess`.

### `src/utils/plotFunctions.ts`

- Export `CHAIN_COLORS: string[]` — fixed 6-color categorical palette (Plotly default: `#636EFA`, `#EF553B`, `#00CC96`, `#AB63FA`, `#FFA15A`, `#19D3F3`).

### `src/utils/histogramUtils.ts`

- Add `prepareHistogramDataByType(chains: ChainState[], burnIn: number): HistogramDataPerChain[]` — groups chains by `samplerType`, merges post-burn-in samples within each group, returns one `HistogramDataPerChain` entry per type present.
- Remove `prepareHistogramData` (2-chain merge) and `prepareHistogramDataPerChain` (per-chain) — both replaced by the new function.

### `src/hooks/useSamplingController.ts`

- Add `MAX_CHAINS = 6` constant.
- `addChain`: guard `chains.length >= MAX_CHAINS`; assign `colorIndex: chains.length` at creation time (monotonically increasing, never reused).
- Initial chain state: add `colorIndex: 0`.
- Stats sync: remove the `allChainsCompatible` branching entirely. Single unified path — group chains by `samplerType`, compute `prepareHistogramDataByType`, compute `GroupStats[]` (R-hat + ESS per group using `calculateGelmanRubin`/`calculateESS` which already accept `Point[][]`).
- State changes: remove `histogramData`, `histogramDataPerChain`, `rHat`, `ess`, `essPerChain`; add `histogramDataByType: HistogramDataPerChain[]` and `groupStats: GroupStats[]`.

### `src/components/Controls.tsx`

- Chain config sections: wrap each in a collapsible `<details>`/`<summary>` element (same pattern as "Plot Layout Limits" section already uses).
- Color-code each chain header with `CHAIN_COLORS[chain.colorIndex]` (left border or swatch).
- Collapsed header shows: color swatch + "Chain N — HMC" label.
- Disable "Add another chain" button when `chains.length >= MAX_CHAINS`; show explanatory text.
- Export `MAX_CHAINS` from `useSamplingController` or define it in a shared constants file so Controls can reference it.

### `src/components/TracePlots.tsx`

- Use `CHAIN_COLORS[chain.colorIndex]` for trace colors (replace `primaryColor`/`secondaryColor`).
- Accept `groupStats: GroupStats[]` prop instead of `rHat`, `ess`, `essPerChain`.
- Display one R-hat + ESS row per group, labeled by sampler type.

### `src/components/HistogramPlots.tsx`

- Accept `histogramDataByType: HistogramDataPerChain[]` instead of `histogramData` + `histogramDataPerChain`.
- Remove the legacy single-panel code path — always render one panel per type group.

### `src/App.tsx`

- Update prop bindings to match new hook return values (`histogramDataByType`, `groupStats`).

---

## Test Cases

### Existing tests that change

- **`tests/utils/histogramUtils.test.js`** — tests for `prepareHistogramData` and `prepareHistogramDataPerChain` are **replaced** with tests for `prepareHistogramDataByType` (both old functions are removed).
- **`tests/hooks/useSamplingController.test.js`** — `allChainsCompatible` import and any dedicated tests for it are **deleted** (function removed). All `result.current.rHat` assertions are **rewritten** to use `result.current.groupStats[i].rHat`.

### `histogramUtils` — `prepareHistogramDataByType`

- **Single HMC chain** → returns 1 entry, `samplerType: 'HMC'`, samples equal post-burn-in samples of that chain.
- **Two HMC chains** → returns 1 entry with merged post-burn-in samples from both chains.
- **One HMC + one Gibbs** → returns 2 entries, one per type, samples not mixed across types.
- **Two HMC + three Gibbs** → returns 2 entries; HMC entry merges 2 chains, Gibbs entry merges 3.
- **Burn-in applied** → samples before `burnIn` index are excluded within each group.
- **Empty chains array** → returns `[]`.
- **Chain with no samples** → its contribution to its group is empty; other chains in the group are unaffected.

### `useSamplingController` — addChain / colorIndex

- **colorIndex assignment** → first chain gets 0, second gets 1, …, sixth gets 5.
- **MAX_CHAINS guard** → calling `addChain` when `chains.length === 6` leaves chain count at 6.
- **colorIndex not reused** → remove chain at index 1 (colorIndex 1), add a new chain → new chain gets colorIndex 2 (not 1).

### `useSamplingController` — stats sync

- **3 HMC chains** → `groupStats` has one entry (`HMC`) with non-null `rHat` and `ess`; `histogramDataByType` has one entry with all 3 chains' samples merged.
- **2 HMC + 2 Gibbs** → `groupStats` has two entries, one per type; each with independent `rHat`/`ess`; `histogramDataByType` has two entries.
- **Single chain** → `groupStats` has one entry with `rHat: null` (< 2 chains in group) and non-null `ess`.
- **Burn-in respected** → stats computed on `samples.slice(burnIn)` per chain.
