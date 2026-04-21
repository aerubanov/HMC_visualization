# Stop Sampling Plan

## Objective

Allow users to cancel an in-progress sampling run before all requested steps complete. In standard (non-fast) mode, sampling steps are scheduled one per `requestAnimationFrame` tick; the user may start a large batch (e.g. 500 steps) and want to abort without waiting. Clicking "Stop Sampling" sets a cancellation flag that the animation loop checks before each step, causing it to exit cleanly and set `isRunning = false`.

Fast mode is a single synchronous `setTimeout` batch — it cannot be interrupted after it starts. The Stop button is therefore hidden while `useFastMode` is true.

---

## Modules / Classes

### `src/hooks/useSamplingController.js` (modify)

- Add `cancelRef = useRef(false)` — a mutable ref (not state) to avoid stale closures and prevent unnecessary re-renders.
- At the start of `sampleSteps`, always reset `cancelRef.current = false`.
- Inside the `executeStep` loop (non-fast path), check `cancelRef.current` before scheduling the next frame. If `true`, call `setIsRunning(false)` and return without scheduling another `requestAnimationFrame`.
- Add `stopSampling` callback: sets `cancelRef.current = true`. This is the only public API added. Do **not** add a comment above it — the name is self-documenting (per project convention: no comments unless the WHY is non-obvious).
- Return `stopSampling` from the hook.

### `src/components/Controls.jsx` (modify)

- Accept new `stopSampling` prop.
- In the Actions section, render a "Stop Sampling" button that is visible only when `isRunning && !useFastMode`. Clicking it calls `stopSampling`.
- The existing "Sample N Steps" and "Step Once" buttons remain disabled while `isRunning` — no change needed there.

### `src/App.jsx` (modify)

- Destructure `stopSampling` from `useSamplingController` and pass it to `Controls`.

---

## Test Cases

### `useSamplingController` (`tests/hooks/useSamplingController.test.js`)

1. **`stopSampling` is exposed** — the hook returns a `stopSampling` function.
2. **Cancellation stops the loop** — use a small N (e.g. 10) and block each mock step behind a Promise/flag so `stopSampling` is guaranteed to fire before the run completes; verify `isRunning` becomes `false` and `iterationCount` is less than N. Alternatively, call `stopSampling` synchronously inside the same `act` block as `sampleSteps` (before any frames advance) and assert `iterationCount < N`.
3. **`cancelRef` is reset on new run** — after stopping, calling `sampleSteps` again runs normally (not immediately cancelled).

### `Controls` (`tests/components/Controls.test.jsx`)

4. **Stop button visible when running in standard mode** — with `isRunning=true` and `useFastMode=false`, the "Stop Sampling" button is rendered.
5. **Stop button hidden when not running** — with `isRunning=false`, the button is absent.
6. **Stop button hidden in fast mode** — with `isRunning=true` and `useFastMode=true`, the button is absent.
7. **Stop button calls `stopSampling`** — clicking the button invokes the `stopSampling` prop.
