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

This will install all required dependencies:
- React & React DOM
- Vite (build tool)
- mathjs (math expression parsing)
- plotly.js & react-plotly.js (visualization)
- Vitest & jsdom (testing)

## Development

### Run Development Server

```bash
npm run dev
```

This starts the Vite development server with hot module replacement (HMR).
The application will be available at `http://localhost:5173`

### Run Tests

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test -- --run

# Run tests with UI
npm run test:ui
```

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
│   └── Visualizer.jsx   # Plotly visualization wrapper
├── utils/           # Core logic modules
│   ├── mathEngine.js    # Math.js wrappers for parsing & gradients
│   └── hmcSampler.js    # HMC physics simulation
├── App.jsx          # Main application component
├── main.jsx         # React entry point
└── index.css        # Global styles

tests/
└── utils/           # Unit tests
    ├── mathEngine.test.js
    └── hmcSampler.test.js
```

## Technology Stack

- **Framework**: React with Vite
- **Math Engine**: math.js (symbolic differentiation)
- **Visualization**: plotly.js
- **Testing**: Vitest with jsdom
- **Styling**: Vanilla CSS