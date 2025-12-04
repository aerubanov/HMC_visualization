/**
 * Plotly configuration and styling constants for HMC visualization
 */

// Grid parameters for contour computation
export const GRID_CONFIG = {
  resolution: 50, // Number of points along each axis
  xRange: [-5, 5], // X-axis bounds
  yRange: [-5, 5], // Y-axis bounds
};

// Color scheme for dark theme
export const COLORS = {
  background: '#0f1419',
  paper: '#1a1f2e',
  text: '#e1e4e8',
  grid: '#30363d',
  contourLine: '#58a6ff',
  accent: '#f85149',
};

// Base layout configuration for all plots
export const BASE_LAYOUT = {
  autosize: true,
  paper_bgcolor: COLORS.paper,
  plot_bgcolor: COLORS.background,
  font: {
    color: COLORS.text,
    family: 'Inter, system-ui, sans-serif',
    size: 12,
  },
  xaxis: {
    title: 'x',
    gridcolor: COLORS.grid,
    zeroline: true,
    zerolinecolor: COLORS.grid,
  },
  yaxis: {
    title: 'y',
    gridcolor: COLORS.grid,
    zeroline: true,
    zerolinecolor: COLORS.grid,
  },
  margin: {
    l: 60,
    r: 40,
    t: 40,
    b: 60,
  },
};

// Plotly configuration options
export const PLOT_CONFIG = {
  responsive: true,
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  toImageButtonOptions: {
    format: 'png',
    filename: 'hmc_visualization',
    height: 800,
    width: 800,
    scale: 2,
  },
};

/**
 * Creates a Plotly contour trace configuration
 * @param {number[][]} x - 2D array of x coordinates
 * @param {number[][]} y - 2D array of y coordinates
 * @param {number[][]} z - 2D array of log-probability values
 * @returns {object} Plotly trace object
 */
export function createContourTrace(x, y, z) {
  return {
    type: 'contour',
    x: x,
    y: y,
    z: z,
    colorscale: 'Viridis',
    showscale: true,
    contours: {
      coloring: 'heatmap',
      showlabels: true,
      labelfont: {
        size: 10,
        color: COLORS.text,
      },
    },
    colorbar: {
      title: 'log P(x, y)',
      titleside: 'right',
      tickfont: {
        color: COLORS.text,
      },
    },
    hovertemplate:
      'x: %{x:.2f}<br>y: %{y:.2f}<br>log P: %{z:.2f}<extra></extra>',
  };
}

/**
 * Generates a meshgrid of points for contour computation
 * @returns {{x: number[], y: number[], xGrid: number[][], yGrid: number[][]}}
 */
export function generateGrid() {
  const { resolution, xRange, yRange } = GRID_CONFIG;

  // Create 1D arrays for each axis
  const xStep = (xRange[1] - xRange[0]) / (resolution - 1);
  const yStep = (yRange[1] - yRange[0]) / (resolution - 1);

  const x = Array.from({ length: resolution }, (_, i) => xRange[0] + i * xStep);
  const y = Array.from({ length: resolution }, (_, i) => yRange[0] + i * yStep);

  // Create 2D grids
  const xGrid = Array.from({ length: resolution }, () => [...x]);
  const yGrid = Array.from({ length: resolution }, (_, i) =>
    Array(resolution).fill(y[i])
  );

  return { x, y, xGrid, yGrid };
}
