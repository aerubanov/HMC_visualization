# Debug Logging Plan

## Objective

Provide structured, level-filtered console logging to simplify debugging. Log level is derived automatically from the Vite build mode (`import.meta.env.MODE`): `development` → DEBUG, `production` → INFO. This means `npm run dev` emits full verbose output while the deployed production build emits only INFO/WARN/ERROR, keeping the console quiet for end users while still recording lifecycle events.

---

## Modules / Classes

### `src/utils/logger.js` (new)

Singleton module. Exports a `logger` object with four methods: `.debug()`, `.info()`, `.warn()`, `.error()`. Each method checks whether its level is >= the active level before calling the matching `console` method (`console.debug` / `console.info` / `console.warn` / `console.error`).

Active level is read once from `import.meta.env.MODE` on module load: `'production'` → INFO, anything else (including undefined in tests) → DEBUG.

Log format: `[HMC-VIZ][LEVEL] message — key: value, key: value`

Level hierarchy (low → high): DEBUG < INFO < WARN < ERROR.

### `src/samplers/HMCSampler.js` (modify)

- `HMCSampler` constructor → DEBUG: ε (epsilon), L, seed.
- `HMCSampler.setParams` → DEBUG: updated ε, L values.

### `src/samplers/GibbsSampler.js` (modify)

- `GibbsSampler` constructor → DEBUG: w, seed.
- `GibbsSampler.setParams` → DEBUG: updated w value.

No step-level logging in either sampler — too verbose.

### `src/samplers/SamplingChain.js` (modify)

In the `constructor`, after `_initializeSampler()`, add one DEBUG log with: chain id, sampler type, all params, initial position, seed.

### `src/samplers/BaseSampler.js` (modify)

- `setSeed` → DEBUG when a seed value is provided (null → value or value → value).

### `src/utils/mathEngine.js` (modify)

- `Logp` constructor → INFO on successful parse and compilation.
- `Logp` constructor → WARN when simplification fallback is triggered.
- `Logp` constructor → ERROR on parse, derivative, or evaluation failures with context.

### `src/utils/sliceSampler.js` (modify)

- `sampleSlice` → WARN when max shrinkage iterations are exhausted and the function falls back to returning `x0` — indicates numerical instability.

### `src/hooks/useRecording.js` (modify)

- `startRecording` → INFO (frame buffer reset, recording begun).
- `stopRecording` → INFO (GIF encoding initiated).
- `captureFrame` failure → WARN.
- `gifshot` encoding failure → ERROR.

### `src/utils/statistics.js` (modify)

- `calculateGelmanRubin` → WARN when chains are too short or within-chain variance W is zero (constant chains).
- `calculateESS` → WARN when `gamma0Pooled` is zero (perfect correlation / constant chains).

### `src/hooks/useSamplingController.js` (modify)

Add log calls at the following points:

| Event                                       | Level | Details                                 |
| ------------------------------------------- | ----- | --------------------------------------- |
| `setLogP` — function set                    | INFO  | expression (truncated to ~60 chars)     |
| `setLogP` — function cleared                | INFO  | —                                       |
| `setLogP` — parse error                     | ERROR | error message                           |
| `addChain`                                  | INFO  | id, sampler type                        |
| `removeChain`                               | INFO  | id                                      |
| `setChainConfig` — sampler type changed     | INFO  | id, old type → new type                 |
| `setChainConfig` — params changed           | DEBUG | id, changed key/value pairs             |
| `setChainConfig` — seed changed             | DEBUG | id, new seed                            |
| `setChainConfig` — initial position changed | DEBUG | id, new position                        |
| `sampleSteps` start                         | DEBUG | steps requested, mode (standard / fast) |
| `sampleSteps` normal completion             | INFO  | steps completed, iterationCount         |
| `sampleSteps` cancelled early (cancelRef)   | INFO  | steps completed before stop             |
| `sampleSteps` catch block                   | ERROR | error message                           |
| Per-chain error detected in loop            | WARN  | chain id, error message                 |
| Stats skipped (insufficient samples)        | WARN  | chain id(s), sample count               |

---

## Test Cases

### `tests/samplers/HMCSampler.test.js` (modify)

8. **Constructor logs** — constructing an `HMCSampler` calls `logger.debug` with ε, L, and seed.
9. **setParams logs** — calling `setParams({ epsilon: 0.2, L: 15 })` calls `logger.debug` with the new values.

### `tests/samplers/GibbsSampler.test.js` (modify)

10. **Constructor logs** — constructing a `GibbsSampler` calls `logger.debug` with w and seed.
11. **setParams logs** — calling `setParams({ w: 2.0 })` calls `logger.debug` with the new value.

### `tests/samplers/BaseSampler.test.js` (modify)

12. **setSeed logs** — calling `setSeed(42)` calls `logger.debug` with the seed value.

### `tests/utils/mathEngine.test.js` (modify)

13. **Parse success logs INFO** — constructing a valid `Logp` calls `logger.info`.
14. **Simplification fallback logs WARN** — when simplification triggers a fallback, `logger.warn` is called.
15. **Parse error logs ERROR** — constructing `Logp` with an invalid expression calls `logger.error`.

### `tests/utils/sliceSampler.test.js` (modify)

16. **Max shrinkage WARN** — when slice sampling exhausts shrinkage iterations, `logger.warn` is called.

### `tests/hooks/useRecording.test.js` (modify)

17. **startRecording logs INFO** — calling `startRecording()` calls `logger.info`.
18. **stopRecording logs INFO** — calling `stopRecording()` calls `logger.info` for encoding start.
19. **gifshot failure logs ERROR** — when `gifshot.createGIF` reports an error, `logger.error` is called.

### `tests/utils/statistics.test.js` (modify)

20. **Gelman-Rubin WARN on short chains** — `calculateGelmanRubin` with insufficient samples calls `logger.warn`.
21. **Gelman-Rubin WARN on constant chains** — when W == 0, `logger.warn` is called.
22. **ESS WARN on zero gamma** — `calculateESS` with constant samples calls `logger.warn`.

### `tests/utils/logger.test.js` (new)

1. **DEBUG level passes all** — with level set to DEBUG, calling `.debug()`, `.info()`, `.warn()`, `.error()` each invoke the corresponding `console` method.
2. **INFO level suppresses debug** — `.debug()` does not call `console.debug`; `.info()`, `.warn()`, `.error()` still fire.
3. **WARN level suppresses debug and info** — only `.warn()` and `.error()` call their console methods.
4. **ERROR level suppresses debug, info, warn** — only `.error()` calls `console.error`.
5. **Prefix present** — the string passed to `console.info` contains `[HMC-VIZ]`.
6. **Level tag present** — the string passed to `console.warn` contains `[WARN]`.
7. **Extra data formatted** — when called with a data object `{ steps: 10 }`, the output string contains `steps: 10`.
