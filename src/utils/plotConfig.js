/**
 * Plotly configuration and styling constants for HMC visualization
 */

// Grid parameters for contour computation
export const GRID_CONFIG = {
  resolution: 50, // Number of points along each axis
  xRange: [-5, 5], // X-axis bounds
  yRange: [-5, 5], // Y-axis bounds
};

// Color scheme for light theme
export const COLORS = {
  background: '#ffffff',
  paper: '#f8f9fa',
  text: '#1a1a1a',
  grid: '#e1e4e8',
  contourLine: '#0366d6',
  accent: '#d73a49',
  // Trajectory visualization colors
  trajectory: '#d73a49', // Vibrant red for active trajectory
  sample: '#0366d6', // Blue for accepted sample points
  currentParticle: '#28a745', // Green for current position
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
    showline: true,
    mirror: true,
    ticks: 'outside',
    linecolor: COLORS.text,
  },
  yaxis: {
    title: 'y',
    gridcolor: COLORS.grid,
    zeroline: true,
    zerolinecolor: COLORS.grid,
    showline: true,
    mirror: true,
    ticks: 'outside',
    linecolor: COLORS.text,
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
  // Calculate z-axis range for proper colorbar scaling
  const zFlat = z.flat();
  const zMin = Math.min(...zFlat.filter((v) => !isNaN(v) && isFinite(v)));
  const zMax = Math.max(...zFlat.filter((v) => !isNaN(v) && isFinite(v)));

  return {
    type: 'contour',
    x: x,
    y: y,
    z: z,
    colorscale: 'YlGnBu',
    showscale: true,
    // Explicitly set z-axis range to avoid scaling issues
    zmin: zMin,
    zmax: zMax,
    contours: {
      coloring: 'heatmap',
      showlabels: true,
      labelfont: {
        size: 10,
        color: COLORS.text,
      },
    },
    colorbar: {
      title: {
        text: 'log P(x, y)',
        side: 'right',
      },
      tickfont: {
        color: COLORS.text,
      },
      len: 0.75,
      thickness: 15,
      outlinewidth: 0,
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

/**
 * Creates a Plotly scatter trace for HMC trajectory visualization
 * @param {Array<{x: number, y: number}>} trajectory - Array of trajectory points from leapfrog integrator
 * @returns {object|null} Plotly trace object or null if trajectory is empty
 */
export function createTrajectoryTrace(trajectory) {
  // Handle invalid or empty trajectory
  if (!trajectory || !Array.isArray(trajectory) || trajectory.length === 0) {
    return null;
  }

  return {
    type: 'scatter',
    mode: 'lines+markers',
    x: trajectory.map((p) => p.x),
    y: trajectory.map((p) => p.y),
    line: {
      color: COLORS.trajectory,
      width: 2,
      shape: 'linear',
    },
    marker: {
      size: 4,
      color: COLORS.trajectory,
      symbol: 'circle',
    },
    name: 'Trajectory',
    showlegend: true,
    hovertemplate: 'x: %{x:.2f}<br>y: %{y:.2f}<extra></extra>',
  };
}

/**
 * Creates a Plotly scatter trace for accepted samples visualization
 * @param {Array<{x: number, y: number}>} samples - Array of accepted sample points
 * @returns {object|null} Plotly trace object or null if samples is empty
 */
export function createSamplesTrace(samples) {
  // Handle invalid or empty samples
  if (!samples || !Array.isArray(samples) || samples.length === 0) {
    return null;
  }

  return {
    type: 'scatter',
    mode: 'lines+markers',
    x: samples.map((p) => p.x),
    y: samples.map((p) => p.y),
    line: {
      color: COLORS.trajectory,
      width: 1,
      dash: 'dash',
    },
    marker: {
      size: 6,
      color: COLORS.trajectory,
      symbol: 'circle',
      opacity: 0.8,
    },
    name: 'Samples',
    showlegend: true,
    hovertemplate: 'Sample<br>x: %{x:.2f}<br>y: %{y:.2f}<extra></extra>',
  };
}
