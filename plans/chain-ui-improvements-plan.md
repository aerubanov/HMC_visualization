# Chain UI Improvements

## Objective

Improve chain management UX and plot readability in the samplers-comparison mode. The hidden checkbox for toggling a second chain is replaced with an explicit button flow (add / remove per chain), and plot legends are updated to include the sampler type so the user immediately knows which algorithm each trace belongs to.

---

## Modules / Classes

### `src/components/Controls.jsx` (modify)

- Remove the "Enable Second Chain" checkbox from the global settings section entirely.
- Inside the `chains.map` render loop, add a **Remove** button to each chain block except the first (`index > 0`). Clicking it calls `removeChain(chain.id)`.
- After the `chains.map` block, render an **"Add another chain"** button that calls `addChain()`. The button is always visible (not conditional on chain count).

### `src/components/Visualizer.jsx` (modify)

- Change the label construction at the point where `Chain ${index + 1}` is built to include the sampler type: `Chain ${index + 1} (${chain.samplerType})`.
- Apply consistently to both trajectory and samples trace names for non-primary chains.

### `src/components/TracePlots.jsx` (modify)

- Same label change as Visualizer: `Chain ${index + 1} (${chain.samplerType})`.
- Applied to the label passed into `createTracePlotTrace` for every chain.

---

## Test Cases

### `tests/components/Controls.test.jsx`

1. **No "Enable Second Chain" checkbox** — verify the checkbox with label "Enable Second Chain" is no longer rendered.
2. **"Add another chain" button exists** — verify the button is rendered when only one chain is present.
3. **Clicking "Add another chain" calls addChain** — simulate click; confirm `addChain` mock was called once.
4. **No Remove button on first chain** — with one chain, no "Remove" button is rendered.
5. **Remove button appears on second chain** — with two chains, a Remove button is rendered for the second chain only.
6. **Clicking Remove calls removeChain with correct id** — simulate click on Remove for chain id `1`; confirm `removeChain(1)` was called.

### `tests/components/Visualizer.test.jsx`

7. **Single chain legend uses sampler type** — with one HMC chain, trace names include `"(HMC)"`.
8. **Multi-chain legend includes sampler type** — with HMC chain 1 and Gibbs chain 2, trace names include `"Chain 1 (HMC)"` and `"Chain 2 (Gibbs)"`.

### `tests/components/TracePlots.test.jsx`

9. **Trace label includes sampler type** — with two chains of different types, rendered trace labels contain the sampler type string.
