# Adding a New Sampler

This guide walks through every file you need to touch to add a new sampling
algorithm to the project. The changes are small and mechanical — the
architecture is designed so that `SamplingChain` and the React layer never
need to know the algorithm details.

The worked example below adds a fictional **"Metropolis-Hastings"** sampler
called `MH` to keep the diffs concrete.

---

## Overview of touch-points

| File                               | What changes                                                  |
| ---------------------------------- | ------------------------------------------------------------- |
| `src/types.ts`                     | Add params interface + expand `SamplerType` / `SamplerParams` |
| `src/samplers/defaultConfigs.ts`   | Add default parameter values                                  |
| `src/samplers/MHSampler.ts`        | New file — the algorithm itself                               |
| `src/samplers/SamplingChain.ts`    | Wire new type into factory method                             |
| `src/components/Controls.tsx`      | Add parameter inputs for the new sampler                      |
| `tests/samplers/MHSampler.test.js` | Unit tests for the algorithm                                  |

---

## Step 1 — Define the parameter type (`src/types.ts`)

Add an interface for your sampler's tuneable parameters and expand the two
union types.

```ts
/** Parameters for the Metropolis-Hastings sampler. */
export interface MHParams {
  sigma: number; // proposal std-dev
}

// Expand the discriminator union:
export type SamplerType = 'HMC' | 'GIBBS' | 'MH';

// Expand the params union:
export type SamplerParams = HMCParams | GibbsParams | MHParams;
```

`SamplerType` is the string that drives every switch/if in the codebase, so
keeping it in `types.ts` ensures a single source of truth.

---

## Step 2 — Add default parameters (`src/samplers/defaultConfigs.ts`)

```ts
import type { HMCParams, GibbsParams, MHParams } from '../types';

export const DEFAULT_SAMPLER_PARAMS: {
  HMC: HMCParams;
  GIBBS: GibbsParams;
  MH: MHParams;
} = {
  HMC: { epsilon: 0.1, L: 10, steps: 1 },
  GIBBS: { w: 1.0 },
  MH: { sigma: 0.5 },
};
```

TypeScript will tell you if you forget to add a key — the object literal type
must match the declared shape exactly.

---

## Step 3 — Implement the sampler (`src/samplers/MHSampler.ts`)

Extend `BaseSampler` and implement the two abstract members: `setParams` and
`step`.

```ts
import { BaseSampler, type Particle } from './BaseSampler';
import { logger } from '../utils/logger';
import type { MHParams, StepResult } from '../types';
import type { Logp } from '../utils/mathEngine';
import type { SeededRandom } from '../utils/seededRandom';

export class MHSampler extends BaseSampler {
  public sigma: number;

  /**
   * @param params - Initial MH parameters `{ sigma }`.
   * @param seed   - Optional random seed.
   */
  constructor(params: Partial<MHParams> = {}, seed: number | null = null) {
    super(seed);
    this.sigma = params.sigma ?? 0.5;
    logger.debug('MHSampler initialised', { sigma: this.sigma, seed });
  }

  /**
   * Update MH parameters.
   * @param params - Partial parameter object; only provided keys are updated.
   */
  setParams(params: Partial<MHParams>): void {
    if (params.sigma !== undefined) this.sigma = params.sigma;
    logger.debug('MHSampler params updated', { ...params });
  }

  /**
   * Perform one random-walk Metropolis-Hastings step.
   * @param currentState - Current particle `{ q, p }`.
   * @param logPInstance - Compiled log-probability instance.
   * @returns Step result `{ q, p, accepted, trajectory }`.
   */
  step(currentState: Particle, logPInstance: Logp): StepResult {
    const { q } = currentState;
    const randomFn = (this.rng as SeededRandom | null)
      ? () => (this.rng as SeededRandom).random()
      : Math.random;

    // Gaussian proposal (Box-Muller)
    const randn = () => {
      const u1 = randomFn();
      const u2 = randomFn();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };

    const q_proposed = {
      x: q.x + this.sigma * randn(),
      y: q.y + this.sigma * randn(),
    };

    const logPCurrent = logPInstance.getLogProbability(q.x, q.y);
    const logPProposed = logPInstance.getLogProbability(
      q_proposed.x,
      q_proposed.y
    );
    const accepted = Math.log(randomFn()) < logPProposed - logPCurrent;

    return {
      q: accepted ? q_proposed : q,
      p: { x: 0, y: 0 },
      accepted,
      trajectory: [q, q_proposed],
    };
  }
}
```

### Key rules

- **Always call `super(seed)`** — this initialises `this.rng` via `BaseSampler`.
- **Use `this.rng` when available** — prefer `this.rng.random()` over
  `Math.random()` so that seeded chains are reproducible.
- **Return a valid `StepResult`** — the `trajectory` array must have at least
  one point. Include the current position as the first point even on rejection,
  so the visualiser always has something to draw.
- **Never throw** inside `step` — `SamplingChain.step` catches exceptions and
  sets `chain.error`, so a sampler error surfaces gracefully in the UI.

---

## Step 4 — Wire into `SamplingChain` (`src/samplers/SamplingChain.ts`)

Two places need editing.

### 4a — Add the import

```ts
// existing imports
import { HMCSampler } from './HMCSampler';
import { GibbsSampler } from './GibbsSampler';
import { MHSampler } from './MHSampler'; // ← add
```

Also add `MHParams` to the `import type` block from `'../types'`:

```ts
import type {
  Point,
  SamplerParams,
  SamplerType,
  StepResult,
  HMCParams,
  GibbsParams,
  MHParams, // ← add
} from '../types';
```

### 4b — Extend `_initializeSampler`

The private factory method is the only place that instantiates samplers.
Add an `else if` branch:

```ts
private _initializeSampler(): void {
  if (this.samplerType === 'GIBBS') {
    this.sampler = new GibbsSampler(
      this.params as Partial<GibbsParams>,
      this.seed
    );
  } else if (this.samplerType === 'MH') {
    this.sampler = new MHSampler(
      this.params as Partial<MHParams>,
      this.seed
    );
  } else {
    this.sampler = new HMCSampler(
      this.params as Partial<HMCParams>,
      this.seed
    );
  }
  if (this.seed !== null) {
    this.sampler.setSeed(this.seed);
  }
}
```

`setParams` in `SamplingChain` also has a type-specific branch that forwards
parameters to the underlying sampler instance. Add a case there too:

```ts
setParams(newParams: Partial<SamplerParams>): void {
  // ... merge into this.params ...

  if (this.sampler && this.sampler.setParams) {
    if (this.samplerType === 'HMC') {
      const { epsilon, L, steps } = this.params as HMCParams;
      if (epsilon !== oldParams.epsilon || L !== oldParams.L) {
        this.sampler.setParams({ epsilon, L, steps });
      }
    } else if (this.samplerType === 'MH') {
      const { sigma } = this.params as MHParams;
      if (sigma !== (oldParams as MHParams).sigma) {
        this.sampler.setParams({ sigma });
      }
    } else {
      const { w } = this.params as GibbsParams;
      if (w !== (oldParams as GibbsParams).w) {
        this.sampler.setParams({ w });
      }
    }
  }
}
```

---

## Step 5 — Add UI controls (`src/components/Controls.tsx`)

### 5a — Import the new param type

```ts
import type {
  ChainState,
  ChainConfigUpdate,
  AxisLimits,
  SamplerType,
  HMCParams,
  GibbsParams,
  MHParams, // ← add
} from '../types';
```

### 5b — Add an `<option>` to the sampler type select

```tsx
<select
  value={chain.samplerType}
  onChange={(e) =>
    setChainConfig?.(chain.id, { samplerType: e.target.value as SamplerType })
  }
>
  <option value="HMC">Hamiltonian Monte Carlo (HMC)</option>
  <option value="GIBBS">Gibbs Sampling</option>
  <option value="MH">Metropolis-Hastings (MH)</option> {/* ← add */}
</select>
```

### 5c — Add parameter inputs for the new sampler

Follow the existing pattern: guard with `chain.samplerType === 'MH'`, cast
params, and call `setChainConfig` on change.

```tsx
{
  chain.samplerType === 'MH' && (
    <div className="control-group">
      <label htmlFor={`sigma-${chain.id}`} className="control-label">
        Proposal Sigma (σ)
      </label>
      <input
        id={`sigma-${chain.id}`}
        type="number"
        className="control-input"
        step="0.05"
        min="0.01"
        value={(chain.params as MHParams).sigma}
        onChange={(e) =>
          setChainConfig?.(chain.id, {
            params: { ...chain.params, sigma: parseFloat(e.target.value) },
          })
        }
      />
    </div>
  );
}
```

---

## Step 6 — Write tests (`tests/samplers/MHSampler.test.js`)

Tests remain in JavaScript (`.js`) even though the source is TypeScript.
Follow the same structure as `HMCSampler.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { MHSampler } from '../../src/samplers/MHSampler';

// Minimal Logp stub — only getLogProbability is needed for MH.
const mockLogp = {
  getLogProbability: (x, y) => -(x * x + y * y) / 2,
};

describe('MHSampler', () => {
  it('returns a valid StepResult', () => {
    const sampler = new MHSampler({ sigma: 0.5 }, 42);
    const particle = { q: { x: 0, y: 0 }, p: { x: 0, y: 0 } };
    const result = sampler.step(particle, mockLogp);

    expect(result).toHaveProperty('q');
    expect(result).toHaveProperty('p');
    expect(typeof result.accepted).toBe('boolean');
    expect(Array.isArray(result.trajectory)).toBe(true);
    expect(result.trajectory.length).toBeGreaterThanOrEqual(1);
  });

  it('is reproducible with a seed', () => {
    const particle = { q: { x: 1, y: 1 }, p: { x: 0, y: 0 } };
    const run = (seed) =>
      new MHSampler({ sigma: 0.5 }, seed).step(particle, mockLogp);

    const r1 = run(99);
    const r2 = run(99);
    expect(r1.q).toEqual(r2.q);
    expect(r1.accepted).toBe(r2.accepted);
  });

  it('setParams updates sigma', () => {
    const sampler = new MHSampler({ sigma: 0.5 });
    sampler.setParams({ sigma: 2.0 });
    expect(sampler.sigma).toBe(2.0);
  });
});
```

Run the new tests with:

```bash
npm run test -- tests/samplers/MHSampler.test.js --run
```

---

## Checklist

- [ ] `SamplerType` union extended in `src/types.ts`
- [ ] Params interface added in `src/types.ts`
- [ ] `SamplerParams` union extended in `src/types.ts`
- [ ] Default params added to `defaultConfigs.ts`
- [ ] Sampler class created, extends `BaseSampler`, implements `setParams` and `step`
- [ ] `_initializeSampler` in `SamplingChain.ts` handles the new type
- [ ] `setParams` in `SamplingChain.ts` forwards the new type's params
- [ ] `<option>` added to the sampler-type `<select>` in `Controls.tsx`
- [ ] Parameter inputs added in `Controls.tsx` (guarded by `samplerType === 'MH'`)
- [ ] Unit tests written and passing
- [ ] `npx tsc --noEmit` exits 0

No changes are needed in `histogramUtils`, `statistics`, `Visualizer`,
`TracePlots`, or `HistogramPlots` — they operate on `Point[]` samples and
`colorIndex`, both of which are managed by `SamplingChain` regardless of the
underlying algorithm.
