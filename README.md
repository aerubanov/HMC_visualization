# HMC Visualization

Interactive web application to visualize the Hamiltonian Monte Carlo (HMC) sampling algorithm.
Run simulations, explore phase space trajectories, and analyze convergence with real-time diagnostics.

## Features

- **Interactive Simulation**: Tunable parameters for Step Size (epsilon), Integration Time (L), and Mass (m).
- **Target Distributions**: Choose from predefined distributions (Gaussian, Rosenbrock, Donut, etc.) or define your own custom potential function.
- **Dual Chain Support**: Run two independent chains in parallel to assess convergence and explore multi-modal distributions.
- **Visualizations**:
  - **2D Trajectory**: Real-time visualization of the particle's path in phase space.
  - **Trace Plots**: Monitor X and Y coordinates over time to detect mixing issues.
  - **Histograms**: Marginal (1D) and Joint (2D) histograms to visualize the estimated posterior distribution.
- **Diagnostics**:
  - **Gelman-Rubin (R-hat)**: Real-time convergence diagnostic for multi-chain simulations.
  - **Burn-in Control**: Specify initial samples to discard to ensure analysis on the stationary distribution.
- **Reproducibility**: Seeded random number generation for consistent results.

## Prerequisites

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)

## Setup Development Environment

### 1. Clone the Repository

```bash
git clone <repository-url>
cd HMC_visualization
```

### 2. Install Dependencies

```bash
npm install
```

## Development

### Run Development Server

```bash
npm run dev
```

This starts the Vite development server with hot module replacement (HMR).
The application will be available at `http://localhost:5173`

### Run Tests

```bash
npm run test -- --run
```

To run with coverage:

```bash
npm run test:coverage
```

### Code Quality

```bash
npm run lint
npm run format
```

**Pre-commit Hooks**:

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to automatically run code quality checks before each commit:

- Prettier auto-fixes formatting on staged files
- ESLint auto-fixes linting issues on `.js` and `.jsx` files
- Commits are blocked if ESLint finds errors that can't be auto-fixed

## Build

### Create Production Build

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

Preview the production build locally before deployment.

## Project Structure

```
src/
├── components/          # React components
│   ├── Controls.jsx     # HMC parameter and simulation controls
│   ├── Visualizer.jsx   # Main visualization layout
│   ├── TracePlots.jsx   # X/Y trace plots with burn-in visualization
│   └── HistogramPlots.jsx # Marginal and 2D histograms
├── hooks/               # Custom React hooks
│   └── useSamplingController.js # Central logic for HMC simulation state
├── samplers/            # Sampling algorithms
│   └── HMCSampler.js    # Core HMC physics simulation class
├── utils/               # Core logic modules
│   ├── mathEngine.js    # Math.js wrappers for parsing & gradients
│   ├── plotConfig.json  # Centralized Plotly configuration
│   ├── plotFunctions.js # Plotly trace generation helpers
│   ├── statistics.js    # Statistical functions (R-hat, ESS)
│   ├── seededRandom.js  # PRNG for reproducible simulations
│   ├── predefinedFunctions.js # Library of target distributions
│   └── histogramUtils.js # Helpers for histogram data processing
├── App.jsx              # Main application component
├── main.jsx             # React entry point
└── index.css            # Global styles

tests/
├── components/          # Component tests
├── hooks/               # Hook tests
├── samplers/            # Sampler tests
└── utils/               # Unit tests
```

## Technology Stack

- **Framework**: React with Vite
- **Math Engine**: math.js (symbolic differentiation)
- **Visualization**: plotly.js (react-plotly.js)
- **Testing**: Vitest with jsdom (via React Testing Library)
- **Styling**: Vanilla CSS
- **Code Quality**: ESLint, Prettier
- **Pre-commit Hooks**: Husky, lint-staged
- **CI/CD**: GitHub Actions

## CI/CD

This project uses [GitHub Actions](./.github/workflows/deploy.yml) for continuous integration. The CI pipeline runs automatically on:

- All pull requests
- Pushes to the `main` branch

### CI Checks

**Lint Job** (Node 20, Ubuntu):

- Runs ESLint to check for code errors
- Verifies Prettier formatting

**Test Job** (Node 18 & 20, Ubuntu):

- Runs all Vitest unit tests
- Ensures compatibility across Node.js LTS versions

**Build Job** (Node 20, Ubuntu):

- Creates production build
- Verifies build artifacts

**All jobs must pass before a PR can be merged.**
