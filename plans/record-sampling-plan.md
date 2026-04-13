# Record Sampling Feature Plan

## Objective

Allow users to record the trajectory visualisation as it animates during sampling and download the result as a GIF. This makes it easy to share or inspect the sampling process frame-by-frame without screen-recording software.

---

## User Experience

1. The user configures the sampler (distribution, parameters, chains) as normal.
2. In the **Actions** section, a **"Start Recording"** button appears below "Reset Sampler". Fast Sampling Mode must be off — the button is greyed out with a tooltip ("Recording is not available in Fast Mode") when fast mode is enabled.
3. The user clicks **"Start Recording"**. The button label changes to **"Stop Recording"** (styled in a distinct colour, e.g. red, to indicate active recording). A small indicator text "Recording…" appears nearby.
4. The user then clicks **"Sample N Steps"** or **"Step Once"** as usual. The trajectory plot animates normally — recording happens silently in the background with no visible lag.
5. When satisfied, the user clicks **"Stop Recording"**. The button returns to "Start Recording". A brief "Encoding…" message replaces the indicator while the GIF is being compiled.
6. The browser automatically downloads a file named `sampling-recording.gif`. The GIF plays back all captured trajectory frames at a fixed rate (e.g. 10 fps).
7. The user can start a new recording at any time — starting a new recording always clears the previous frames.

---

## Modules / Classes

### New: `src/hooks/useRecording.js`

Custom hook that owns all recording state and logic.

- `isRecording` — boolean React state.
- `framesRef` — `useRef([])` accumulating PNG dataURL strings during recording.
- `startRecording()` — clears `framesRef.current`, sets `isRecording = true`.
- `stopRecording()` — sets `isRecording = false`, calls `gifshot.createGIF(frames)`, triggers browser download of the resulting GIF blob, then clears `framesRef`.
- `captureFrame(graphDiv)` — async; calls `Plotly.toImage(graphDiv, { format: 'png', width: 800, height: 600 })` and pushes the returned dataURL into `framesRef.current`. No-op when not recording.

Dependency: `gifshot` npm package (`npm install gifshot`).

### Modify: `src/components/Visualizer.jsx`

- Accept two new props: `isRecording` (bool) and `captureFrame` (function).
- Add `onInitialized={(_, graphDiv) => { graphDivRef.current = graphDiv; }}` to the `<Plot>` element to persist the Plotly DOM node.
- Add `onUpdate={() => { if (isRecording) captureFrame(graphDivRef.current); }}` to capture a frame whenever the plot re-renders.
- Add PropTypes for the two new props.

### Modify: `src/components/Controls.jsx`

- Accept three new props: `isRecording` (bool), `startRecording` (function), `stopRecording` (function).
- Add a toggle button in the Actions section (below "Reset Sampler"):
  - Label: **"Start Recording"** / **"Stop Recording"** depending on `isRecording`.
  - Disabled when `useFastMode` is true (fast mode produces only one render per N steps, making frame-by-frame capture meaningless). Show a `title` tooltip explaining why.
- Add PropTypes for the three new props.

### Modify: `src/App.jsx`

- Call `useRecording()` and destructure `{ isRecording, startRecording, stopRecording, captureFrame }`.
- Pass `isRecording` and `captureFrame` to `<Visualizer>`.
- Pass `isRecording`, `startRecording`, `stopRecording` to `<Controls>`.

### Modify: `package.json`

- Add `gifshot` as a production dependency.

---

## Test Cases

### `useRecording` hook (`tests/hooks/useRecording.test.js`)

1. **startRecording sets isRecording to true** — call `startRecording()`; assert `isRecording === true`.
2. **startRecording clears previous frames** — push a dummy frame into `framesRef`, call `startRecording()`, assert `framesRef.current` is empty.
3. **captureFrame is a no-op when not recording** — call `captureFrame(mockDiv)` while `isRecording = false`; assert `Plotly.toImage` was not called.
4. **captureFrame appends dataURL when recording** — mock `Plotly.toImage` to resolve `'data:image/png;base64,abc'`; call `startRecording()` then `captureFrame(mockDiv)`; assert `framesRef.current.length === 1`.
5. **stopRecording sets isRecording to false** — start, then stop; assert `isRecording === false`.
6. **stopRecording calls gifshot.createGIF with collected frames** — mock `gifshot`; collect two frames; call `stopRecording()`; assert `gifshot.createGIF` was called with the two dataURLs.
7. **stopRecording triggers download** — mock gifshot to call callback with `{ image: 'data:...' }`; assert an `<a>` element's `.click()` was invoked.
8. **stopRecording clears frames after encoding** — after `stopRecording()`, assert `framesRef.current` is empty.

### `Visualizer` component (`tests/components/Visualizer.test.jsx`)

9. **onUpdate calls captureFrame when isRecording=true** — render with `isRecording={true}` and a `captureFrame` spy; simulate a plot update; assert `captureFrame` was called with the graphDiv.
10. **onUpdate does not call captureFrame when isRecording=false** — same setup with `isRecording={false}`; assert `captureFrame` was not called.

### `Controls` component (`tests/components/Controls.test.jsx`)

11. **Record button renders "Start Recording" when not recording** — render with `isRecording={false}`; assert button text is "Start Recording".
12. **Record button renders "Stop Recording" when recording** — render with `isRecording={true}`; assert button text is "Stop Recording".
13. **Clicking record button calls startRecording** — render with `isRecording={false}` and a `startRecording` spy; click the button; assert spy called.
14. **Clicking record button calls stopRecording** — render with `isRecording={true}` and a `stopRecording` spy; click; assert spy called.
15. **Record button is disabled in fast mode** — render with `useFastMode={true}`; assert record button has `disabled` attribute.

---

## Build Fix: Vite cannot resolve "buffer/"

`plotly.js` internally does `require('buffer/')` which esbuild cannot resolve because the `buffer` polyfill package is not installed. This is a pre-existing issue unrelated to gifshot.

**Fix (part of this feature's setup):**

1. Install polyfill: `npm install buffer`
2. Add to `vite.config.js`:
   ```js
   resolve: {
     alias: { 'buffer/': 'buffer/' },
   },
   optimizeDeps: {
     include: ['buffer'],
   },
   ```

No application code changes needed — only `vite.config.js` and `package.json`.
