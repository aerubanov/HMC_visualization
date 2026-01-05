import { CONTOUR, HMC_SAMPLER, TRACE_PLOT } from './plotConfig.json';

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

/**
 * Converts a hex color to rgba string
 * @param {string} hex - Hex color string (e.g., "#ff0000")
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} Rgba color string
 */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Creates Plotly traces for trace plots (iteration vs value)
 * @param {Array<{x: number, y: number}>} samples - Array of accepted sample points
 * @param {string} axis - 'x' or 'y' to plot
 * @param {number} burnIn - Number of samples to treat as burn-in
 * @param {string} [color] - Color for the valid samples
 * @param {string} [name] - Name for the valid samples trace
 * @returns {object[]} Array of Plotly trace objects (burn-in and valid)
 */
export function createTracePlotTrace(
  samples,
  axis,
  burnIn = 0,
  color = HMC_SAMPLER.styles.primaryColor,
  name = 'Trace'
) {
  if (!samples || !Array.isArray(samples) || samples.length === 0) {
    return [];
  }

  const traces = [];
  const validOpacity = 1.0;
  const burnInOpacity = TRACE_PLOT.styles.burnInOpacity;
  const lineWidth = TRACE_PLOT.styles.lineWidth;

  // Split samples into burn-in and valid
  let burnInSamples = [];
  let validSamples = [];

  if (burnIn > 0) {
    // If we have valid samples after burn-in, include the first one in burn-in set to connect lines
    const endIndex = samples.length > burnIn ? burnIn + 1 : burnIn;
    burnInSamples = samples.slice(0, endIndex);
    validSamples = samples.slice(burnIn);
  } else {
    validSamples = samples;
  }

  // Helper to create a single trace part
  const createSubTrace = (data, startIndex, opacity, traceName, showLegend) => {
    const iterations = data.map((_, i) => i + startIndex);
    const values = data.map((p) => p[axis]);

    // Use RGBA for color to ensure opacity works reliably on lines
    const traceColor = opacity < 1 ? hexToRgba(color, opacity) : color;

    return {
      type: 'scatter',
      mode: 'lines',
      x: iterations,
      y: values,
      line: {
        color: traceColor,
        width: lineWidth,
      },
      // Remove top-level opacity to rely on rgba color
      // opacity: opacity,
      name: traceName,
      showlegend: showLegend,
      hovertemplate: `Iter: %{x}<br>${axis}: %{y:.2f}<extra></extra>`,
    };
  };

  // Add burn-in trace
  if (burnInSamples.length > 0) {
    traces.push(
      createSubTrace(burnInSamples, 0, burnInOpacity, `${name} (Burn-in)`, true)
    );
  }

  // Add valid samples trace
  if (validSamples.length > 0) {
    traces.push(createSubTrace(validSamples, burnIn, validOpacity, name, true));
  }

  return traces;
}
