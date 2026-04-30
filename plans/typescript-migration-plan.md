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

### ~~Phase 1 — Tooling~~ ✓ Done

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

### ~~Phase 2 — Shared types~~ ✓ Done

**`src/types.ts`** (new) — all shared interfaces and type aliases listed above.

### ~~Phase 3 — Leaf utilities (rename + annotate)~~ ✓ Done

Each file: rename `.js` → `.ts`, add parameter and return types, import shared types where needed.

- **`src/utils/seededRandom.ts`** — `SeededRandom` class: constructor param `seed: number`, `random(): number`.
- **`src/utils/sliceSampler.ts`** — `sampleSlice(logP: (x: number) => number, x0: number, w: number, rng?: SeededRandom | null): number`.
- **`src/utils/histogramUtils.ts`** — `prepareHistogramData`, `prepareHistogramDataPerChain`, `calculateHistogramBins`: full param and return types using `Point` and `HistogramDataPerChain`.
- **`src/utils/statistics.ts`** — `calculateGelmanRubin(chains: Point[][]): number | null`, `calculateESS(chains: Point[][]): EssResult | null`.
- **`src/utils/plotFunctions.ts`** — type Plotly trace return types; use `@types/plotly.js`.
- **`src/utils/predefinedFunctions.ts`** — type the exported array.
- **`src/utils/logger.ts`** — type `createLogger` and the singleton; data param typed as `Record<string, unknown>`.

### ~~Phase 3b — Interface cleanup (post-Phase-3 audit)~~ ✓ Done

After Phase 3 was implemented, an audit found locally-defined interfaces that should be tidied:

- **`src/utils/histogramUtils.ts` — replace `ChainInput`** with `Pick<ChainState, 'id' | 'samplerType' | 'samples'>`.
  - `ChainInput` is a manual subset of `ChainState`; using `Pick` keeps it in sync automatically if `ChainState` changes.
  - Import `ChainState` from `../types` and remove the `ChainInput` interface.

- **`src/utils/histogramUtils.ts` — `HistogramBins`** — keep as-is; it is an internal return type for `calculateHistogramBins` and does not belong in shared types.

- **`src/utils/plotFunctions.ts` — `ScatterLineShape` and `PlotlyDash`** — keep as-is; they are Plotly-specific type guards used only for type assertions inside this file.

- **`src/utils/plotFunctions.ts` — `GridResult`** — keep as-is; it is an internal return type for `generateGrid` and is not reused elsewhere.

- **`src/utils/predefinedFunctions.ts` — `PredefinedFunction`** — move to `src/types.ts`; it will be used in component Props when `Controls.tsx` is migrated in Phase 7.

- **`src/utils/logger.ts` — `Logger` and `ViteImportMeta`** — keep as-is; `Logger` is properly exported and used across multiple files; `ViteImportMeta` is a single-use internal cast.

### ~~Phase 4 — Math engine~~ ✓ Done

**`src/utils/mathEngine.ts`** — `Logp` class: constructor param `exprStr: string`. Use mathjs bundled types for compiled expressions; use `unknown` + type guards where mathjs types are insufficient.

### ~~Phase 4b — mathEngine.ts post-review fixes~~ ✓ Done

Code review found several issues to fix in `src/utils/mathEngine.ts`:

- **Ensure JSDoc on exported members** — `getLogProbability` and `getLogProbabilityGradient` should have `@param` and `@returns` JSDoc. Private fields do not need JSDoc unless behaviour is non-obvious; remove field-level docs that only restate the name.
- **Simplify empty-string guard** — `typeof pdfString !== 'string'` is dead code under TypeScript; change `if (!pdfString || typeof pdfString !== 'string')` to just `if (!pdfString)`.
- **`let` → `const`** — `dxRaw` and `dyRaw` in `getLogProbabilityGradient` are never reassigned; declare them with `const`.
- ~~**Remove redundant first parse**~~ — kept intentionally; tests assert distinct error messages for the two parse failures (raw syntax error vs. error in the `log(...)` wrapper), so both parse calls are load-bearing.

### ~~Phase 5 — Samplers~~ ✓ Done

Implementation decisions from design interview:

- **`StepResult`** — add to `src/types.ts`: `{ q: Point; p: Point; accepted: boolean; trajectory: Point[] }`. Used by both samplers and `SamplingChain`.
- **`steps` field** — kept as `steps?: number` in `HMCParams` and `steps: 1` in `defaultConfigs`; `SamplingChain.test.js` explicitly asserts `setParams` is called with `{ epsilon, L, steps: 1 }` so it is load-bearing for tests.
- **`BaseSampler`** — real TypeScript `abstract class` with `abstract step(particle: Particle, logp: Logp): StepResult` and `abstract setParams(params: ...): void`. Fields `seed` and `rng` are `public readonly`; `setSeed()` reassigns them internally via a type cast.
- **`SamplingChain.sampler`** — typed as `BaseSampler` (not a union) so adding new samplers in future requires no type changes at the call sites.
- **`src/samplers/defaultConfigs.ts`** — typed with `HMCParams` and `GibbsParams`; remove `steps` from the HMC entry.
- **`src/samplers/BaseSampler.ts`** — real `abstract class`; `public readonly seed: number | null`; `public readonly rng: SeededRandom | null`; `setSeed(seed: number | null): void` (reassigns via cast); `abstract step(...)`: `StepResult`; `abstract setParams(...): void`.
- **`src/samplers/HMCSampler.ts`** — typed constructor, `setParams(params: Partial<HMCParams>): void`, `step(...): StepResult`.
- **`src/samplers/GibbsSampler.ts`** — typed constructor, `setParams(params: Partial<GibbsParams>): void`, `step(...): StepResult`.
- **`src/samplers/SamplingChain.ts`** — `sampler` field typed as `BaseSampler`; `step()` returns `StepResult | null`; explicit return types on all methods.
- **`src/gifshot.d.ts`** (new) — minimal `declare module 'gifshot'` covering only what `useRecording.ts` calls; no `@types/gifshot` on npm.

### ~~Phase 6 — Hooks~~ ✓ Done

Implementation decisions from design interview:

- **`ChainConfigUpdate`** — add to `src/types.ts`: `Partial<Pick<ChainState, 'samplerType' | 'params' | 'initialPosition' | 'seed'>>`. Prevents callers of `setChainConfig` from passing read-only internal fields (`id`, `samples`, `trajectory`, counters). Used as the second parameter type of `setChainConfig`.
- **`allChainsCompatible` param type** — `ChainState[]`. All TS call sites pass full chain state; the defensive `params || {}` inside is a runtime guard, not a signal that partial objects are valid TS inputs.
- **`useSamplingController` return type** — inferred (no named interface). Avoids a large brittle interface; Phase 7 components destructure directly.
- **`captureFrame` param type** — `HTMLElement`. Hook only ever receives a real DOM node; `Plotly.Root` (`string | HTMLElement`) would be unnecessarily broad.

**`src/hooks/useSamplingController.ts`**:

- `chains` state: `ChainState[]`
- `chainErrors` state: `Record<number, string>`
- `contourData` state: `Partial<Plotly.PlotData> | null`
- `histogramData` state: `{ samples: Point[] }`
- `histogramDataPerChain` state: `HistogramDataPerChain[] | null`
- `essPerChain` state: `PerChainEss[] | null`
- `rHat` state: `number | null`
- `ess` state: `EssResult | null`
- `axisLimits` state: `AxisLimits`
- `logpInstanceRef`: `React.MutableRefObject<Logp | null>`
- `cancelRef`: `React.MutableRefObject<boolean>`
- `samplingChainsRef`: `React.MutableRefObject<Map<number, SamplingChain>>`
- `allChainsCompatible(chains: ChainState[]): boolean`
- `setChainConfig(id: number, configUpdates: ChainConfigUpdate): void`
- `addChain(config?: Partial<ChainState>): void`
- `removeChain(id: number): void`
- `resetChain(id: number): void`
- `sampleSteps(n: number): void`
- hook return type: inferred

**`src/hooks/useRecording.ts`**:

- `framesRef`: `React.MutableRefObject<string[]>`
- `captureFrame(graphDiv: HTMLElement): Promise<void>`
- return type: inferred

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
