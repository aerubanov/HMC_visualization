/**
 * Utility functions for histogram data preparation and calculations
 */

import type {
  Point,
  HistogramDataPerChain,
  ChainState,
  SamplerType,
} from '../types';

/**
 * Groups chains by samplerType, merges post-burn-in samples within each group,
 * and returns one `HistogramDataPerChain` entry per sampler type present.
 *
 * @param chains - Array of chain state objects
 * @param burnIn - Number of initial samples to exclude as burn-in per chain
 */
export function prepareHistogramDataByType(
  chains: ChainState[],
  burnIn: number
): HistogramDataPerChain[] {
  if (!chains || chains.length === 0) return [];

  // Group post-burn-in samples by samplerType
  const byType = new Map<SamplerType, Point[]>();
  for (const chain of chains) {
    const postBurnin =
      chain.samples && Array.isArray(chain.samples)
        ? chain.samples.slice(burnIn)
        : [];
    const existing = byType.get(chain.samplerType) ?? [];
    byType.set(chain.samplerType, existing.concat(postBurnin));
  }

  // Convert to HistogramDataPerChain entries, one per type
  const result: HistogramDataPerChain[] = [];
  for (const [samplerType, samples] of byType) {
    result.push({
      chainId: samplerType,
      samplerType,
      label: samplerType === 'HMC' ? 'HMC' : 'Gibbs',
      samples,
    });
  }
  return result;
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
