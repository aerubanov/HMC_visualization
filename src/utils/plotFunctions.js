import { CONTOUR, HMC_SAMPLER } from './plotConfig.json';

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
        color: CONTOUR.styles.labelColor,
      },
    },
    colorbar: {
      title: {
        text: 'log P(x, y)',
        side: 'right',
      },
      tickfont: {
        color: CONTOUR.styles.labelColor,
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
  const { resolution, xRange, yRange } = CONTOUR.grid;

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
 * @param {string} [color] - Optional color for the trajectory (defaults to primary color)
 * @param {string} [name] - Optional name for the trace (defaults to 'Trajectory')
 * @returns {object|null} Plotly trace object or null if trajectory is empty
 */
export function createTrajectoryTrace(
  trajectory,
  color = HMC_SAMPLER.styles.primaryColor,
  name = 'Trajectory'
) {
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
      color: color,
      ...HMC_SAMPLER.trajectory.line,
    },
    marker: {
      color: color,
      ...HMC_SAMPLER.trajectory.marker,
    },
    name: name,
    showlegend: true,
    hovertemplate: 'x: %{x:.2f}<br>y: %{y:.2f}<extra></extra>',
  };
}

/**
 * Creates a Plotly scatter trace for accepted samples visualization
 * @param {Array<{x: number, y: number}>} samples - Array of accepted sample points
 * @param {string} [color] - Optional color for the samples (defaults to primary color)
 * @param {string} [name] - Optional name for the trace (defaults to 'Samples')
 * @returns {object|null} Plotly trace object or null if samples is empty
 */
export function createSamplesTrace(
  samples,
  color = HMC_SAMPLER.styles.primaryColor,
  name = 'Samples'
) {
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
      color: color,
      ...HMC_SAMPLER.samples.line,
    },
    marker: {
      color: color,
      ...HMC_SAMPLER.samples.marker,
    },
    name: name,
    showlegend: true,
    hovertemplate: 'Sample<br>x: %{x:.2f}<br>y: %{y:.2f}<extra></extra>',
  };
}
