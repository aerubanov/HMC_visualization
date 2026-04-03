# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive React web app for visualizing Hamiltonian Monte Carlo (HMC) and Gibbs sampling algorithms. Users configure parameters, run simulations, and observe convergence via phase-space trajectories, trace plots, and histograms.

## Commands

```bash
npm run dev              # Dev server at http://localhost:5173
npm run build            # Production build to dist/
npm run test             # Run Vitest in watch mode
npm run test -- --run    # Run tests once (non-interactive)
npm run test:coverage    # Run tests with coverage report
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Prettier auto-format
npm run format:check     # Verify Prettier formatting
```

To run a single test file:

```bash
npm run test -- tests/samplers/HMCSampler.test.js --run
```

## Architecture

### Data Flow

```
useSamplingController (hook) → SamplingChain[] (refs) → HMCSampler / GibbsSampler
         ↓
    React state → Controls, Visualizer, TracePlots, HistogramPlots
```

**`useSamplingController.js`** is the central state manager. It holds all chain configs in React state and maintains `SamplingChain` OOP instances in refs (not state) to avoid re-renders during sampling. It owns the `Logp` instance (math engine) and computes contour/statistics data.

**`SamplingChain.js`** wraps a single Markov chain: it instantiates the concrete sampler (HMC or Gibbs), holds accumulated samples and trajectory points, and delegates each step to the sampler.

### Sampler Hierarchy

- `BaseSampler` — abstract base with shared interface
  - `HMCSampler` — leapfrog integrator + Metropolis acceptance. Also exports standalone functions `leapfrogStep()`, `generateProposal()`, `hmcStep()`.
  - `GibbsSampler` — coordinate-wise updates via 1D slice sampling (`sliceSampler.js`). Always accepts; produces "Manhattan" trajectories.

`defaultConfigs.js` provides default parameter objects for each sampler type.

### Math Engine

`mathEngine.js` exports the `Logp` class. It parses user-supplied log-probability function strings using **math.js**, computes symbolic gradients, and returns compiled evaluators. This is the critical path for custom distributions.

### Visualization

All plots use **Plotly.js** via `react-plotly.js`. Trace generation helpers live in `plotFunctions.js`. Shared Plotly layout/config defaults are in `plotConfig.json`.

### Diagnostics

`statistics.js` computes Gelman-Rubin R-hat and Effective Sample Size (ESS) for multi-chain convergence diagnostics.

## Key Conventions

- **Seeded RNG**: `seededRandom.js` provides a `SeededRandom` class for reproducible simulations. Pass it into samplers rather than using `Math.random()`.
- **Chain state lives in refs**: `SamplingChain` instances are stored in `useRef`, not `useState`, to prevent React re-renders on every sampling step.
- **Sampler config is separate from chain state**: `defaultConfigs.js` holds initial parameter shapes; runtime state is managed in `SamplingChain`.
