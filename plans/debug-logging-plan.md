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

### `src/samplers/SamplingChain.js` (modify)

In the `constructor`, after `_initializeSampler()`, add one DEBUG log with: chain id, sampler type, all params, initial position, seed.

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

### `tests/utils/logger.test.js` (new)

1. **DEBUG level passes all** — with level set to DEBUG, calling `.debug()`, `.info()`, `.warn()`, `.error()` each invoke the corresponding `console` method.
2. **INFO level suppresses debug** — `.debug()` does not call `console.debug`; `.info()`, `.warn()`, `.error()` still fire.
3. **WARN level suppresses debug and info** — only `.warn()` and `.error()` call their console methods.
4. **ERROR level suppresses debug, info, warn** — only `.error()` calls `console.error`.
5. **Prefix present** — the string passed to `console.info` contains `[HMC-VIZ]`.
6. **Level tag present** — the string passed to `console.warn` contains `[WARN]`.
7. **Extra data formatted** — when called with a data object `{ steps: 10 }`, the output string contains `steps: 10`.
