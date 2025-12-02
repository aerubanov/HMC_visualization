# HMC Visualization Architecture & Implementation Plan
## Goal
Create an interactive web application to visualize the Hamiltonian Monte Carlo (HMC) sampling algorithm. Users can define a custom log-probability density function, adjust sampler parameters, and observe the sampling process and trajectories in real-time.

## Architecture Reference
### Tech Stack
- Framework: React (Vite)
- Math Engine: math.js
  - Role: Parses user input strings (e.g., -(x^2+y^2)/2) into executable functions.
  - Differentiation: Uses math.derivative to symbolically compute gradients ($\nabla U$) required for the HMC leapfrog integrator.
- Visualization: plotly.js (via react-plotly.js)
  - Role: Renders the 2D visualization.
  - Feasibility: Confirmed. Plotly supports a "multi-trace" architecture which fits the requirements perfectly:
    - Trace 0 (Static): A contour or heatmap trace representing the potential energy surface ($U(q)$). This is computed once when the function changes and remains static during sampling.
    - Trace 1 (Dynamic): A scatter trace for "Accepted Samples". This accumulates points over time.
    - Trace 2 (Dynamic): A scatter trace (mode: lines) for the "Current Trajectory". This updates rapidly during the leapfrog integration steps.
    - Trace 3 (Dynamic): A scatter trace (mode: markers) for the "Current Particle" position.
  - Performance: React-plotly handles updates by diffing props. For high-frequency updates (animation), we can optimize by using Plotly.react or Plotly.animate if React render cycles become a bottleneck, though standard state updates are usually sufficient for < 1000 points.
- Styling: Vanilla CSS (Modern, Dark Mode, Premium feel).

### Core Logic Modules
- MathEngine
  - Input: User string (e.g., -(x^2)/2).
  - Output:
    - potential(x, y): Compiled JS function for $U(q)$.
    - gradient(x, y): Compiled JS function returning [dU/dx, dU/dy].
- HMCSampler
  - State: Position $q$, Momentum $p$.
  - Methods:    
    - leapfrog(q, p, epsilon, grad_U): Performs symplectic integration.
    - step(q, epsilon, L, U, grad_U): Executes one full HMC step (momentum sample -> integration -> Metropolis correction).

## Visualization Strategy: 
The "Static Background + Dynamic Overlay" approach is natively supported by Plotly's architecture. We will use a single Plot component with an array of data traces. The first trace (contour) will only be recalculated when the user changes the function. The subsequent traces (samples, trajectory) will be updated via React state.

## Directory Structure
src/
  components/
    Controls.jsx       # Inputs for LogP, epsilon, L
    Visualizer.jsx     # Plotly wrapper
  utils/
    mathEngine.js      # math.js wrappers
    hmcSampler.js      # Physics simulation
  App.jsx              # State orchestration
  index.css            # Global styles


## Verification Plan
### Automated Tests
**Tech Stack**: Vitest (Test Runner), JSDOM (Environment)

**Test Files Structure**:
- `src/utils/__tests__/mathEngine.test.js`
- `src/utils/__tests__/hmcSampler.test.js`

**Test Cases**:
1. **MathEngine**:
   - `parseFunction`: Verify it correctly compiles valid strings (e.g., "x^2 + y^2") and throws on invalid ones.
   - `computeGradient`: Compare symbolic gradients against known analytical solutions for standard functions (Gaussian, Rosenbrock).
   - `consistency`: Ensure $U(q)$ and $\nabla U(q)$ are consistent (numerical gradient check).

2. **HMCSampler**:
   - `leapfrog`: Verify **reversibility** (integrating forward then backward with negated momentum should return to start).
   - `energy_conservation`: Verify that the Hamiltonian $H(q, p)$ remains stable over a trajectory for small $\epsilon$.
   - `metropolis`: Mock random number generation to verify acceptance/rejection logic.

### Manual Verification
Rendering: Confirm contour plot appears and matches the input function.
Layering: Confirm samples are drawn on top of the contour.
Animation: Verify the trajectory line animates smoothly without flickering the background contour.