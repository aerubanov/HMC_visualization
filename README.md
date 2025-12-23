# HMC Visualization

Interactive web application to visualize the Hamiltonian Monte Carlo (HMC) sampling algorithm.

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
├── components/       # React components
│   ├── Controls.jsx     # HMC parameter controls
│   ├── Controls.css     # Styles for Controls
│   ├── Visualizer.jsx   # Plotly visualization wrapper
│   └── Visualizer.css   # Styles for Visualizer
├── hooks/            # Custom React hooks
│   └── useSamplingController.js # HMC logic controller
├── utils/           # Core logic modules
│   ├── mathEngine.js    # Math.js wrappers for parsing & gradients
│   ├── hmcSampler.js    # HMC physics simulation
│   └── plotConfig.js    # Plotly configuration helpers
├── App.jsx          # Main application component
├── App.css          # App-level styles
├── main.jsx         # React entry point
└── index.css        # Global styles

tests/
├── components/      # Component tests
│   └── Controls.test.jsx
├── hooks/           # Hook tests
│   └── useSamplingController.test.js
└── utils/           # Unit tests
    ├── mathEngine.test.js
    ├── hmcSampler.test.js
    └── plotConfig.test.js
```

## Technology Stack

- **Framework**: React with Vite
- **Math Engine**: math.js (symbolic differentiation)
- **Visualization**: plotly.js
- **Testing**: Vitest with jsdom
- **Styling**: Vanilla CSS
- **Code Quality**: ESLint, Prettier
- **Pre-commit Hooks**: Husky, lint-staged
- **CI/CD**: GitHub Actions

## CI/CD

This project uses [GitHub Actions](./.github/workflows/ci.yml) for continuous integration. The CI pipeline runs automatically on:

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
