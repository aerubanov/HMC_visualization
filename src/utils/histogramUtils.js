/**
 * Utility functions for histogram data preparation and calculations
 */

/**
 * Prepares histogram data by filtering out burn-in samples and combining chains
 * @param {Array<{x: number, y: number}>} samples - Array of sample objects from chain 1
 * @param {Array<{x: number, y: number}>} samples2 - Array of sample objects from chain 2 (optional)
 * @param {number} burnIn - Number of samples to exclude as burn-in
 * @param {boolean} useSecondChain - Whether to include second chain data
 * @returns {{chain1: Array<{x: number, y: number}>, chain2: Array<{x: number, y: number}>|null}} Filtered samples
 */
export function prepareHistogramData(
  samples,
  samples2,
  burnIn,
  useSecondChain
) {
  const result = {
    chain1: [],
    chain2: null,
  };

  // Handle null/undefined samples
  if (!samples || !Array.isArray(samples)) {
    return result;
  }

  // Filter burn-in from chain 1
  if (burnIn >= samples.length) {
    result.chain1 = [];
  } else {
    result.chain1 = samples.slice(burnIn);
  }

  // Handle second chain if enabled
  if (useSecondChain && samples2 && Array.isArray(samples2)) {
    if (burnIn >= samples2.length) {
      result.chain2 = [];
    } else {
      result.chain2 = samples2.slice(burnIn);
    }
  }

  return result;
}

/**
 * Calculates optimal bin edges for 1D histograms using Freedman-Diaconis rule
 * @param {Array<number>} values - Array of values for a single dimension
 * @param {number} numBins - Desired number of bins (optional, will calculate if not provided)
 * @returns {{binEdges: Array<number>, binWidth: number}} Bin configuration
 */
export function calculateHistogramBins(values, numBins = null) {
  // Handle empty or invalid input
  if (!values || !Array.isArray(values) || values.length === 0) {
    return {
      binEdges: [],
      binWidth: 0,
    };
  }

  // Handle single value
  if (values.length === 1) {
    const val = values[0];
    return {
      binEdges: [val - 0.5, val + 0.5],
      binWidth: 1,
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  // If all values are the same
  if (range === 0) {
    return {
      binEdges: [min - 0.5, min + 0.5],
      binWidth: 1,
    };
  }

  let bins = numBins;

  // Auto-calculate bins using Freedman-Diaconis rule if not provided
  if (bins === null) {
    // Calculate IQR (Interquartile Range)
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;

    // Freedman-Diaconis rule: binWidth = 2 * IQR / n^(1/3)
    const binWidth = (2 * iqr) / Math.pow(values.length, 1 / 3);

    if (binWidth > 0) {
      bins = Math.ceil(range / binWidth);
    } else {
      bins = Math.ceil(Math.sqrt(values.length)); // Fallback to Sturges' rule
    }

    // Ensure reasonable number of bins
    bins = Math.max(5, Math.min(bins, 50));
  }

  const binWidth = range / bins;
  const binEdges = [];

  for (let i = 0; i <= bins; i++) {
    binEdges.push(min + i * binWidth);
  }

  return {
    binEdges,
    binWidth,
  };
}
