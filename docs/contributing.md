# Contributing Guide

Welcome to HMC Visualization. This document covers everything you need to set
up your environment, follow the project's development workflow, and get a PR
merged.

---

## Table of Contents

1. [How to Contribute (Fork-based Flow)](#how-to-contribute-fork-based-flow)
2. [Prerequisites](#prerequisites)
3. [Local Setup](#local-setup)
4. [Development Workflow](#development-workflow)
5. [Code Style](#code-style)
6. [Testing](#testing)
7. [Pre-commit Hooks](#pre-commit-hooks)
8. [CI Pipeline](#ci-pipeline)
9. [Pull Request Checklist](#pull-request-checklist)
10. [Common Gotchas](#common-gotchas)

---

## How to Contribute (Fork-based Flow)

Direct push access to this repository is not granted to external contributors.
All contributions go through a fork + pull request workflow:

```
your-github/HMC_visualization  →  aerubanov/HMC_visualization
        (your fork)                      (upstream)
```

### 1. Fork the repository

Click **Fork** on the GitHub repository page. This creates
`your-github/HMC_visualization` under your own account.

### 2. Clone your fork

```bash
git clone https://github.com/your-github/HMC_visualization.git
cd HMC_visualization
```

### 3. Add the upstream remote

```bash
git remote add upstream https://github.com/aerubanov/HMC_visualization.git
```

This lets you pull in future changes from the original repo.

### 4. Create a feature branch

Always branch off the latest `main`:

```bash
git fetch upstream
git checkout -b my-feature upstream/main
```

Never commit directly to `main` in your fork — it makes rebasing harder.

### 5. Make your changes, then push to your fork

```bash
git push origin my-feature
```

### 6. Open a Pull Request

On GitHub, open a PR from `your-github/HMC_visualization:my-feature` →
`aerubanov/HMC_visualization:main`. Fill in the description following the
[PR checklist](#pull-request-checklist) below.

CI runs automatically on PRs from forks. All three jobs (Lint, Test, Build)
must be green before the PR will be reviewed.

### Keeping your fork up to date

Before starting new work, sync your fork's `main` with upstream:

```bash
git fetch upstream
git checkout main
git merge --ff-only upstream/main
git push origin main
```

---

## Prerequisites

| Tool    | Minimum version    |
| ------- | ------------------ |
| Node.js | 18                 |
| npm     | bundled with Node  |
| Git     | any modern version |

A working browser and internet connection are needed to preview the app and run
end-to-end checks.

---

## Local Setup

```bash
git clone <repository-url>
cd HMC_visualization
npm install       # installs deps and registers Husky pre-commit hooks
npm run dev       # dev server → http://localhost:5173
```

Verify everything is healthy before your first commit:

```bash
npm run lint              # ESLint must pass
npm run format:check      # Prettier must pass
npx tsc --noEmit          # TypeScript must pass
npm run test -- --run     # all tests must pass
```

---

## Development Workflow

The project follows a **design-first** loop. Apply it to every non-trivial
change:

### Step 1 — Define interfaces first

Before writing implementation or tests, decide the public shape:

- Which function / method / class will you add or change?
- What are the exact TypeScript types of inputs and outputs?
- Does the change affect shared types in `src/types.ts`?

Write the type signatures (and, if applicable, stub implementations) and ask
for a review before going further. Catching a bad API at the interface stage
costs nothing; refactoring it after tests are written is expensive.

### Step 2 — Select test cases

List the scenarios your tests will cover before writing any test code:

- Happy paths (typical inputs, expected outputs)
- Edge cases (empty arrays, nulls, zero values, boundary conditions)
- Error paths (invalid input, sampler errors)

Document these as a short bullet list in your PR description or a plan file
under `plans/`.

### Step 3 — Implement tests

Write the tests in `tests/` (JavaScript — see [Testing](#testing)) against
the stubbed implementation. They should all fail at this point. Committing
failing tests alongside stubs is fine; they act as a written specification.

### Step 4 — Implement the feature

Fill in the real implementation. Run tests until they all pass, then verify
the app in the browser. The test suite verifies code correctness; only the
running app verifies feature correctness.

---

## Code Style

### Language

- All source files in `src/` are **TypeScript** (`.ts` / `.tsx`) with
  `strict: true`.
- Tests in `tests/` are **JavaScript** (`.js` / `.jsx`). Do not convert them
  to TypeScript.
- The TypeScript compiler (`tsc`) is used for type-checking only; Vite
  (esbuild) handles transpilation.

### Types

- Put shared interfaces and type aliases in `src/types.ts`. Import from there
  rather than duplicating definitions.
- Use `import type` for types that are only needed at compile time.
- Never use `any`. Use `unknown` when you genuinely don't know the shape, then
  narrow it.

### Comments

Write **no comments by default**. Add one only when the _why_ is non-obvious:
a hidden constraint, a subtle invariant, a workaround for a specific bug.
Do not explain what the code does; well-named identifiers already do that.

### JSDoc

Use JSDoc for all exported functions, classes, and their public methods:

```ts
/**
 * Brief one-line description.
 * @param foo - What foo is.
 * @returns What the function returns.
 */
export function example(foo: string): number { ... }
```

Private/internal members need JSDoc only when the behaviour would surprise a
reader.

### Formatting

Prettier handles formatting automatically — do not hand-format. To apply it:

```bash
npm run format        # rewrite all src/ files in place
npm run format:check  # CI-mode check (no rewrites)
```

The pre-commit hook runs Prettier on staged files, so you rarely need to run
it manually.

### Linting

```bash
npm run lint        # check
npm run lint:fix    # auto-fix
```

Key ESLint rules:

- `no-unused-vars` / `@typescript-eslint/no-unused-vars` — prefix intentionally
  unused names with `_` (e.g. `_params`).
- `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps` — hooks must
  follow the Rules of Hooks; exhaustive dependency arrays are enforced.
- `react/prop-types` is disabled — use TypeScript interfaces instead.

---

## Testing

### Framework

Vitest with jsdom. Use React Testing Library for component tests.

### File conventions

| Source file                          | Test file                                   |
| ------------------------------------ | ------------------------------------------- |
| `src/samplers/HMCSampler.ts`         | `tests/samplers/HMCSampler.test.js`         |
| `src/utils/statistics.ts`            | `tests/utils/statistics.test.js`            |
| `src/hooks/useSamplingController.ts` | `tests/hooks/useSamplingController.test.js` |
| `src/components/Controls.tsx`        | `tests/components/Controls.test.jsx`        |

Mirror the `src/` structure under `tests/`, keep the same base filename, and
use `.js` / `.jsx` extensions.

### Running tests

```bash
npm run test -- --run              # run once, all tests
npm run test -- --run <file>       # run a single file
npm run test:coverage              # run with V8 coverage report
```

### What to test

- **Samplers**: instantiation, `setParams`, `step` output shape, reproducibility
  with a seed, acceptance/rejection logic.
- **Utils**: pure functions are straightforward — test inputs and outputs,
  edge cases (empty arrays, NaN, etc.).
- **Hooks**: use `renderHook` from React Testing Library; test state transitions
  rather than implementation details.
- **Components**: use `render` + `screen` queries; test user-visible behaviour
  (text, enabled/disabled states, callback calls) rather than internal state.

### Seeded randomness

Pass a seed to samplers in tests that need deterministic output:

```js
const sampler = new HMCSampler({ epsilon: 0.1, L: 5 }, /* seed= */ 42);
```

Never rely on `Math.random()` in tests — results will differ across runs.

---

## Pre-commit Hooks

[Husky](https://typicode.github.io/husky/) runs two checks before every
commit:

1. **`npx tsc --noEmit`** — full TypeScript type-check across `src/`. Commits
   with type errors are blocked.
2. **`npx lint-staged`** — runs Prettier (auto-fix) and ESLint (auto-fix +
   error check) on staged files only.

If the hook rejects your commit, fix the reported error and `git add` the
fix before committing again.

> **Note:** `tsc --noEmit` cannot run through lint-staged because lint-staged
> passes individual file paths as arguments, which causes tsc to ignore
> `tsconfig.json`. It must run as a whole-project check in the Husky script
> directly.

---

## CI Pipeline

GitHub Actions runs on every pull request and push to `main`. All three jobs
must pass before a PR can be merged.

| Job       | Node    | What it checks                                              |
| --------- | ------- | ----------------------------------------------------------- |
| **Lint**  | 20      | ESLint, Prettier formatting, `tsc --noEmit`                 |
| **Test**  | 18 & 20 | Vitest with coverage; posts a coverage delta comment on PRs |
| **Build** | 20      | `vite build` + existence of `dist/`                         |

The workflow file lives at `.github/workflows/ci.yml`.

---

## Pull Request Checklist

Before opening a PR, confirm:

- [ ] All CI checks pass locally (`lint`, `format:check`, `tsc --noEmit`,
      `test -- --run`, `build`)
- [ ] New public functions and classes have JSDoc (`@param`, `@returns`)
- [ ] New behaviour is covered by tests
- [ ] No `console.log` left in `src/` — use `logger.debug/info/warn/error`
      from `src/utils/logger.ts` instead
- [ ] No `any` types introduced
- [ ] PR description lists the test cases chosen in Step 2 of the workflow

---

## Common Gotchas

### Vite does not type-check

`npm run build` uses esbuild and will succeed even if there are TypeScript
errors. Always run `npx tsc --noEmit` before pushing — this is also what CI
checks.

### Chain state lives in refs, not React state

`SamplingChain` instances are stored in `useRef` (a `Map<number, SamplingChain>`)
and mutate freely during sampling. After each step, `syncChainsState()` copies
the relevant fields into React state to trigger a render. **Never store
`SamplingChain` in `useState`** — it would cause a re-render on every sampling
step.

### `SamplerParams` does not overlap with `Record<string, unknown>`

TypeScript's strict mode rejects a direct cast between these two types.
Use an `unknown` hop when you need to treat sampler params as a generic record:

```ts
(cParams as unknown as Record<string, unknown>)[key];
```

### Tests import TypeScript source directly

Vitest is configured to transpile `.ts`/`.tsx` on the fly, so JavaScript test
files can import from `../../src/...` without any build step.

### Histogram and diagnostics require no sampler-specific code

`histogramUtils.ts` and `statistics.ts` operate on `Point[]` arrays.
A new sampler automatically gets histogram panels and R-hat/ESS diagnostics
as long as it returns valid samples through `SamplingChain.step`.
See [`docs/adding-a-sampler.md`](./adding-a-sampler.md) for the full walkthrough.
