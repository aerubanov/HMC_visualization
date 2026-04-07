# Controls UI Fixes

## Context

Two small UI issues in `src/components/Controls.jsx`:

1. **Fast Sampling Mode checkbox is misplaced** — it currently lives in the "Global Settings" section (between burn-in and seed controls), but it logically belongs near the sample buttons in the "Actions" section so users can toggle it right before sampling.

2. **Seed randomize button shows garbled characters** — the button text is `◆◆` (two Unicode diamond symbols U+25C6), which the OS/font renders as replacement-character boxes in the browser. It should show a readable label.

---

## Critical File

- `src/components/Controls.jsx`

---

## Changes

### 1. Move Fast Sampling Mode into the Actions section

**Remove** the entire `<div className="control-group">` block containing the `fast-mode-toggle` checkbox from the Global Settings section (currently around lines 167–180).

**Add** the same checkbox block inside the Actions `<section>` block, between the "Reset Sampler" button and the `{isRunning && useFastMode && ...}` running indicator.

Result inside Actions section:

```jsx
<button ... >Reset Sampler</button>

<div className="control-group" style={{ marginTop: '8px' }}>
  <div className="checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <input
      id="fast-mode-toggle"
      type="checkbox"
      checked={useFastMode}
      onChange={(e) => setUseFastMode(e.target.checked)}
    />
    <label htmlFor="fast-mode-toggle">Fast Sampling Mode</label>
  </div>
</div>

{isRunning && useFastMode && ( ... )}
```

### 2 & 3. Remove "Rand" button — single seed input field only

**User requirement:** Remove the "Rand" button entirely. The seed configuration area should be just one full-width input field where the user types any integer seed they want.

Also revert/simplify the `localSeedStrings` approach from change 3: since there is no longer a button generating values externally, a single string-based state is sufficient.

**Changes:**

1. Remove the `localSeedStrings` state and all references to it — replace with a simpler approach: keep `localSeeds` but store strings (the raw typed value) instead of numbers. Parse to int only when committing to `setChainConfig`.

2. Replace the flex container (`<div style={{ display: 'flex', gap: '8px' }}>`) and its two children (input + Rand button) with a single full-width input:

```jsx
{
  useSeededMode && (
    <div className="control-group">
      <label className="control-label">Seed</label>
      <input
        type="number"
        className="control-input"
        style={{ width: '100%' }}
        value={localSeedStrings[chain.id] ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          setLocalSeedStrings((prev) => ({ ...prev, [chain.id]: raw }));
          const s = parseInt(raw, 10);
          if (!isNaN(s)) setChainConfig(chain.id, { seed: s });
        }}
      />
    </div>
  );
}
```

The `localSeedStrings` state init in the `chains !== prevChains` block remains (initialised to `String(lSeed[c.id])`). Remove `localSeeds` setters and `setLocalSeeds` calls that were only needed to feed the Rand button.

---

## Verification

1. Enable "Use Random Seed" — a single number input labelled "Seed" appears, showing the default seed value.
2. Clear the field and type any integer — each digit appears as typed, no mid-keystroke reset.
3. No "Rand" button is visible anywhere in the seed configuration area.
4. Run `npm run test -- --run` — no existing tests should break.
