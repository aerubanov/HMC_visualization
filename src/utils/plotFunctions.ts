import type * as Plotly from 'plotly.js';
type ScatterLineShape = 'linear' | 'spline' | 'hv' | 'vh' | 'hvh' | 'vhv';
type PlotlyDash =
  | 'solid'
  | 'dot'
  | 'dash'
  | 'longdash'
  | 'dashdot'
  | 'longdashdot';
import { CONTOUR, HMC_SAMPLER, TRACE_PLOT } from './plotConfig.json';
import type { Point } from '../types';

/**
 * Creates a Plotly contour trace configuration
 * @param x - 2D array of x coordinates
 * @param y - 2D array of y coordinates
 * @param z - 2D array of log-probability values
 */
export function createContourTrace(
  x: number[][],
  y: number[][],
  z: number[][]
): Partial<Plotly.PlotData> {
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

interface GridResult {
  x: number[];
  y: number[];
  xGrid: number[][];
  yGrid: number[][];
}

/**
 * Generates a meshgrid of points for contour computation
 * @param xR - Optional x-axis range [min, max]
 * @param yR - Optional y-axis range [min, max]
 */
export function generateGrid(xR?: number[], yR?: number[]): GridResult {
  const { resolution, xRange: defaultX, yRange: defaultY } = CONTOUR.grid;
  const xRange = xR || defaultX;
  const yRange = yR || defaultY;

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
 * @param trajectory - Array of trajectory points from leapfrog integrator
 * @param color - Optional color for the trajectory (defaults to primary color)
 * @param name - Optional name for the trace (defaults to 'Trajectory')
 */
export function createTrajectoryTrace(
  trajectory: Point[],
  color: string = HMC_SAMPLER.styles.primaryColor,
  name: string = 'Trajectory'
): Partial<Plotly.PlotData> | null {
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
      width: HMC_SAMPLER.trajectory.line.width,
      shape: HMC_SAMPLER.trajectory.line.shape as ScatterLineShape,
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
 * @param samples - Array of accepted sample points
 * @param color - Optional color for the samples (defaults to primary color)
 * @param name - Optional name for the trace (defaults to 'Samples')
 */
export function createSamplesTrace(
  samples: Point[],
  color: string = HMC_SAMPLER.styles.primaryColor,
  name: string = 'Samples'
): Partial<Plotly.PlotData> | null {
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
      width: HMC_SAMPLER.samples.line.width,
      dash: HMC_SAMPLER.samples.line.dash as PlotlyDash,
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
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Creates Plotly traces for trace plots (iteration vs value)
 * @param samples - Array of accepted sample points
 * @param axis - 'x' or 'y' to plot
 * @param burnIn - Number of samples to treat as burn-in
 * @param color - Color for the valid samples
 * @param name - Name for the valid samples trace
 */
export function createTracePlotTrace(
  samples: Point[],
  axis: 'x' | 'y',
  burnIn: number = 0,
  color: string = HMC_SAMPLER.styles.primaryColor,
  name: string = 'Trace'
): Partial<Plotly.PlotData>[] {
  if (!samples || !Array.isArray(samples) || samples.length === 0) {
    return [];
  }

  const traces: Partial<Plotly.PlotData>[] = [];
  const validOpacity = 1.0;
  const burnInOpacity = TRACE_PLOT.styles.burnInOpacity;
  const lineWidth = TRACE_PLOT.styles.lineWidth;

  // Split samples into burn-in and valid
  let burnInSamples: Point[] = [];
  let validSamples: Point[] = [];

  if (burnIn > 0) {
    // If we have valid samples after burn-in, include the first one in burn-in set to connect lines
    const endIndex = samples.length > burnIn ? burnIn + 1 : burnIn;
    burnInSamples = samples.slice(0, endIndex);
    validSamples = samples.slice(burnIn);
  } else {
    validSamples = samples;
  }

  // Helper to create a single trace part
  const createSubTrace = (
    data: Point[],
    startIndex: number,
    opacity: number,
    traceName: string,
    showLegend: boolean
  ): Partial<Plotly.PlotData> => {
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

/**
 * Creates a Plotly histogram2d trace for joint distribution visualization
 * @param samples - Array of sample points
 * @param colorscale - Plotly colorscale name (defaults to 'Blues')
 * @param name - Name for the trace (defaults to '2D Histogram')
 */
export function createHistogram2DTrace(
  samples: Point[],
  colorscale: string = 'Blues',
  name: string = '2D Histogram'
): Partial<Plotly.PlotData> | null {
  if (!samples || !Array.isArray(samples) || samples.length === 0) {
    return null;
  }

  return {
    type: 'histogram2d',
    x: samples.map((p) => p.x),
    y: samples.map((p) => p.y),
    colorscale: colorscale,
    name: name,
    showscale: false,
    hovertemplate: 'x: %{x:.2f}<br>y: %{y:.2f}<br>Count: %{z}<extra></extra>',
  };
}

/**
 * Creates a Plotly histogram trace for marginal distribution visualization
 * @param samples - Array of sample points
 * @param dimension - 'x' or 'y' to plot
 * @param color - Color for the histogram bars
 * @param name - Name for the trace
 * @param orientation - 'v' for vertical (default) or 'h' for horizontal
 */
export function createMarginalHistogramTrace(
  samples: Point[],
  dimension: 'x' | 'y',
  color: string = HMC_SAMPLER.styles.primaryColor,
  name: string = 'Histogram',
  orientation: 'v' | 'h' = 'v'
): Partial<Plotly.PlotData> | null {
  if (!samples || !Array.isArray(samples) || samples.length === 0) {
    return null;
  }

  const values = samples.map((p) => p[dimension]);

  return {
    type: 'histogram',
    [orientation === 'v' ? 'x' : 'y']: values,
    name: name,
    marker: {
      color: color,
      opacity: 0.7,
    },
    orientation: orientation,
    showlegend: false,
    hovertemplate: `${dimension}: %{${orientation === 'v' ? 'x' : 'y'}:.2f}<br>Count: %{${orientation === 'v' ? 'y' : 'x'}}<extra></extra>`,
  };
}
