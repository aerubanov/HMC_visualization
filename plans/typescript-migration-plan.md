# TypeScript Migration Plan

## Objective

Migrate all `src/` source files from plain JavaScript to TypeScript with `strict: true`. Tests remain in `.js` — Vitest handles mixed projects natively; a failing test after migration indicates a real code bug, not a type annotation mistake. PropTypes are removed from all components and replaced by TypeScript interfaces.

---

## Key Shared Types

Define these once in `src/types.ts` and import across all modules:

- **`Point`** — `{ x: number; y: number }`
- **`HMCParams`** — `{ epsilon: number; L: number }`
- **`GibbsParams`** — `{ w: number }`
- **`SamplerParams`** — `HMCParams | GibbsParams`
- **`SamplerType`** — `'HMC' | 'GIBBS'`
- **`ChainState`** — full chain object shape used in React state (id, samplerType, params, initialPosition, seed, samples, trajectory, counters, error, currentParticle)
- **`AxisLimits`** — `{ xMin: number; xMax: number; yMin: number; yMax: number }`
- **`EssResult`** — `{ x: number; y: number }`
- **`PerChainEss`** — `{ chainId: number | string; ess: EssResult | null }`
- **`HistogramDataPerChain`** — `{ chainId: number | string; samplerType: string; label: string; samples: Point[] }`

---

## Modules / Classes

### Phase 1 — Tooling

**`package.json`** — install:

- `typescript` (devDependency)
- `@types/plotly.js` (plotly.js has no bundled types)
- `@types/react-plotly.js`
- `@types/gifshot`
- `@types/react` and `@types/react-dom` are already present
- `mathjs` has bundled types — no extra install needed
- Remove `prop-types` dependency entirely

**`tsconfig.json`** (new) — `strict: true`, `target: ESNext`, `module: ESNext`, `moduleResolution: bundler`, `jsx: react-jsx`, include `src/**/*`, exclude `node_modules` and `tests`.

**`vite.config.js` → `vite.config.ts`** — rename only; no logic change needed.

**`eslint.config.js`** — add TypeScript parser + `@typescript-eslint` rules; update `lint` and `lint:fix` scripts to include `.ts`/`.tsx` extensions.

**`package.json` scripts** — update `lint`, `lint:fix`, `format`, `format:check` to include `.ts`/`.tsx` patterns.

### Phase 2 — Shared types

**`src/types.ts`** (new) — all shared interfaces and type aliases listed above.

### Phase 3 — Leaf utilities (rename + annotate)

Each file: rename `.js` → `.ts`, add parameter and return types, import shared types where needed.

- **`src/utils/seededRandom.ts`** — `SeededRandom` class: constructor param `seed: number`, `random(): number`.
- **`src/utils/sliceSampler.ts`** — `sampleSlice(logP: (x: number) => number, x0: number, w: number, rng?: SeededRandom | null): number`.
- **`src/utils/histogramUtils.ts`** — `prepareHistogramData`, `prepareHistogramDataPerChain`, `calculateHistogramBins`: full param and return types using `Point` and `HistogramDataPerChain`.
- **`src/utils/statistics.ts`** — `calculateGelmanRubin(chains: Point[][]): number | null`, `calculateESS(chains: Point[][]): EssResult | null`.
- **`src/utils/plotFunctions.ts`** — type Plotly trace return types; use `@types/plotly.js`.
- **`src/utils/predefinedFunctions.ts`** — type the exported array.
- **`src/utils/logger.ts`** — type `createLogger` and the singleton; data param typed as `Record<string, unknown>`.

### Phase 4 — Math engine

**`src/utils/mathEngine.ts`** — `Logp` class: constructor param `exprStr: string`. Use mathjs bundled types for compiled expressions; use `unknown` + type guards where mathjs types are insufficient.

### Phase 5 — Samplers

- **`src/samplers/defaultConfigs.ts`** — typed with `HMCParams` and `GibbsParams`.
- **`src/samplers/BaseSampler.ts`** — abstract class; `setSeed(seed: number | null): void`; abstract `step(...)` signature.
- **`src/samplers/HMCSampler.ts`** — typed constructor, `setParams(params: Partial<HMCParams>): void`, `step(...)`.
- **`src/samplers/GibbsSampler.ts`** — typed constructor, `setParams(params: Partial<GibbsParams>): void`, `step(...)`.
- **`src/samplers/SamplingChain.ts`** — typed with `ChainState` and `SamplerParams`; explicit return types on all methods.

### Phase 6 — Hooks

- **`src/hooks/useSamplingController.ts`** — `allChainsCompatible` typed; hook return type explicit using shared types; `chains` state typed as `ChainState[]`.
- **`src/hooks/useRecording.ts`** — return type explicit; `captureFrame` param typed as `HTMLElement`.

### Phase 7 — Components (rename .jsx → .tsx, remove PropTypes)

Each component: rename, define a `Props` interface at the top of the file (replacing PropTypes), remove the `PropTypes` import and `.propTypes` assignment.

- **`src/components/Visualizer.tsx`**
- **`src/components/TracePlots.tsx`**
- **`src/components/HistogramPlots.tsx`**
- **`src/components/Controls.tsx`**
- **`src/App.tsx`**
- **`src/main.tsx`**

---

## Test Cases

Tests stay in `.js`. No new tests are added for the migration itself. The migration is verified by:

1. **`npm run build` succeeds** — zero TypeScript compiler errors.
2. **`npm run test -- --run` passes** — all 385 existing tests pass unchanged.
3. **`npm run lint` passes** — no ESLint errors on `.ts`/`.tsx` files.
4. **`npm run dev` loads in browser** — runtime behaviour unchanged.

If any test fails after migration, it reveals a pre-existing logic bug exposed by strict typing — fix the source code, not the test.
