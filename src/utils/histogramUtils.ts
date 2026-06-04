/**
 * Utility functions for histogram data preparation and calculations
 */

import type { Point, HistogramDataPerChain, ChainState } from '../types';

/**
 * Prepares histogram data by filtering out burn-in samples and combining chains
 * @param samples - Array of sample objects from chain 1
 * @param samples2 - Array of sample objects from chain 2 (optional)
 * @param burnIn - Number of samples to exclude as burn-in
 * @param useSecondChain - Whether to include second chain data
 */
export function prepareHistogramData(
  samples: Point[],
  samples2: Point[],
  burnIn: number,
  useSecondChain: boolean
): { samples: Point[] } {
  let combinedSamples: Point[] = [];

  // Handle chain 1
  if (samples && Array.isArray(samples) && burnIn < samples.length) {
    combinedSamples = samples.slice(burnIn);
  }

  // Handle chain 2 if enabled
  if (
    useSecondChain &&
    samples2 &&
    Array.isArray(samples2) &&
    burnIn < samples2.length
  ) {
    combinedSamples = combinedSamples.concat(samples2.slice(burnIn));
  }

  return { samples: combinedSamples };
}

/**
 * Prepares per-chain histogram data for mixed sampler type scenarios.
 * Each chain's burn-in samples are removed independently; chains are NOT merged.
 *
 * @param chains - Array of chain objects (each must have id, samplerType, and samples fields)
 * @param burnIn - Number of initial samples to exclude as burn-in
 */
export function prepareHistogramDataPerChain(
  chains: Pick<ChainState, 'id' | 'samplerType' | 'samples'>[],
  burnIn: number
): HistogramDataPerChain[] {
  return chains.map((chain, index) => {
    const postBurnin =
      chain.samples && Array.isArray(chain.samples)
        ? chain.samples.slice(burnIn)
        : [];
    return {
      chainId: chain.id,
      samplerType: chain.samplerType,
      label: `Chain ${index + 1} (${chain.samplerType})`,
      samples: postBurnin,
    };
  });
}

interface HistogramBins {
  binEdges: number[];
  binWidth: number;
}

/**
 * Calculates optimal bin edges for 1D histograms using Freedman-Diaconis rule
 * @param values - Array of values for a single dimension
 * @param numBins - Desired number of bins (optional, will calculate if not provided)
 */
export function calculateHistogramBins(
  values: number[],
  numBins: number | null = null
): HistogramBins {
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
  const binEdges: number[] = [];

  for (let i = 0; i <= bins; i++) {
    binEdges.push(min + i * binWidth);
  }

  return {
    binEdges,
    binWidth,
  };
}
