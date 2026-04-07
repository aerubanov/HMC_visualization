# Sampler Comparison Mode

## Goal Description

The user wants to add a samplers comparison mode where two different samplers can run simultaneously, allowing comparison between their generated chains. Since the application already has a "Second Chain" mode (currently running the same sampler with same parameters), we will upgrade this mode into a full "Comparison Mode" by decoupling the sampler type and hyperparameters of the second chain from the first.

## User Review Required

> [!IMPORTANT]
> Please review Step 1 (Interfaces) below. Once you approve, I will proceed to **Step 2: Select test cases**.

## Proposed Changes (Step 1: Interfaces)

To achieve the new approach, we will introduce a `SamplingChain` class (or object factory) to encapsulate all state and logic for a single chain, including its sampler instance, samples array, and hyperparameters. The [useSamplingController](file:///home/anatolii/Projects/HMC_visualization/src/hooks/useSamplingController.js#10-619) will then manage an array of these chain objects.

### [NEW] src/samplers/defaultConfigs.js (Or as constants in controller)

We will define constants for default configurations for each sampler type to automatically populate UI when switching types:

```javascript
export const DEFAULT_SAMPLER_PARAMS = {
  HMC: { epsilon: 0.1, L: 10, steps: 1 },
  GIBBS: { w: 1.0 },
};
```

### [NEW] src/samplers/SamplingChain.js

We will create a new class `SamplingChain` that manages its own sampler instance and execution state.

**Class Interface:**

- `constructor(config)`
  - `config` shape: `{ id, samplerType, params, initialPosition, seed }`
- **Properties**:
  - `id` (String | Number)
  - `samplerType` ('HMC' | 'GIBBS')
  - `params` (Object: `{epsilon, L, steps, w}`)
  - `initialPosition` (Object: `{x, y}`)
  - `samples` (Array)
  - `trajectory` (Array)
  - `rejectedCount` (Number)
  - `currentParticle` (Object)
  - `sampler` (Instance of `HMCSampler` or `GibbsSampler`)
- **Methods**:
  - `step(logpInstance, isFastMode)`: Executes a step using its internal sampler and updates its internal `samples`, `trajectory`, and `currentParticle`.
  - `setParams(newParams)`: Updates parameters and internal sampler instance.
  - `setSamplerType(type)`: Changes the underlying sampler instance and populates with default params if missing.
  - `setSeed(seed)`: Sets the seed for the internal sampler.
  - `reset()`: Clears samples, trajectories, and resets particles to the initial position.

### [MODIFY] src/hooks/useSamplingController.js

Instead of having duplicated `samplerRef`, `samples`, `rejectedCount`, etc. for Chain 1 and Chain 2, we will track a list of `SamplingChain` instances.

**New States/Outputs:**

- `chains` (Array of objects representing chain state for React to render)
- `setChainConfig(id, configUpdates)` (Function): Replaces individual setters. Updates the `samplerType`, `params`, or `initialPosition` for a specific chain.
- `addChain(config)` (Function) -> to add chain 2 (or more in the future)
- `removeChain(id)` (Function) -> to remove chain 2

_(Note: We will remove `samplerType`, `params`, `samples`, `samples2`, `setSamplerType2`, etc. as individual exports, replacing them with the unified `chains` array and its configuration functions.)_

### [MODIFY] src/components/Controls.jsx

The UI will iterate over `chains` array provided by [useSamplingController](file:///home/anatolii/Projects/HMC_visualization/src/hooks/useSamplingController.js#10-619) and render configuration sets for each chain.

**New Props Requirements:**

- Access to `chains` configuration objects.
- Functions `setChainConfig(id, ...)` to manage sampler types and params individually per chain.
- Functions to `addChain` / `removeChain` (to toggle the second chain).

## Proposed Changes (Step 2: Test Cases)

### 1. `tests/samplers/SamplingChain.test.js` (NEW)

**Scenarios & Edge Cases:**

1. Initialization: Initializes with default parameters based on `samplerType` if none mapped. Creates `HMCSampler` or `GibbsSampler` correctly.
2. Step behavior: Calling `step()` successfully updates `currentParticle`, pushes to `samples` (if accepted), updates `rejectedCount` (if rejected), and updates `trajectory`.
3. Parameter mutation: `setParams()` updates properties and correctly passes them to the underlying sampler.
4. Sampler switching: `setSamplerType()` correctly transitions to the new sampler instance and resets internal samples/stats.
5. Seeding logic: Seed works predictably and `reset()` properly resets both the chain stats and the RNG.

### 2. [tests/hooks/useSamplingController.test.js](file:///home/anatolii/Projects/HMC_visualization/tests/hooks/useSamplingController.test.js) (UPDATE)

**Scenarios & Edge Cases:**

1. Default Initialization: Hook initializes with exactly one `SamplingChain` inside the `chains` array.
2. Adding Chains: `addChain()` creates a new `SamplingChain` properly, attaching default configs.
3. Config Mutations: `setChainConfig()` correctly delegates config changes to the designated chain ID without affecting others.
4. Synchronized Stepping: `sampleSteps()` properly calls `step()` iteratively on all existing chains simultaneously.
5. Resetting: `reset()` cascades to all active chains simultaneously.

### 3. [tests/components/Controls.test.jsx](file:///home/anatolii/Projects/HMC_visualization/tests/components/Controls.test.jsx) (UPDATE)

**Scenarios & Edge Cases:**

1. Rendering dynamic configs: Controls should render parameter inputs independently for all chains inside the `chains` array.
2. Default value populations: Switching a chain from HMC to Gibbs should change its UI inputs and auto-populate with the predefined default values.
3. Isolated side-effects: Changing user input for Chain 1\'s epsilon does not mutate Chain 2 parameters.

## Verification Plan

1. **Automated Tests**:
   - Write and execute the new test cases outlined above (`npm run test -- --run`). Ensure edge cases regarding isolated state updates are green.
2. **Manual Verification**:
   - Start the app, open controls.
   - Enable "Second Chain" (`addChain()`).
   - Check that UI inputs switch dynamically when switching sampler types, displaying proper defaults.
   - Check that changing parameters for Chain 1 does not affect Chain 2.
