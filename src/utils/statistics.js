/**
 * Calculates the Gelman-Rubin potential scale reduction factor (R-hat) for MCMC chains.
 *
 * Checks for convergence by comparing within-chain variance to between-chain variance.
 *
 * Algorithm references:
 * Gelman, A., & Rubin, D. B. (1992). Inference from Iterative Simulation Using Multiple Sequences.
 *
 * @param {Array<Array<Object>>} chains - Array of chains, where each chain is an array of samples {x, y}.
 * @returns {Object|null} - { x: number, y: number } representing R-hat for each dimension, or null if insufficient data.
 */
export function calculateGelmanRubin(chains) {
  // 1. Validation
  if (!chains || !Array.isArray(chains) || chains.length < 2) {
    return null;
  }

  // Ensure all chains have data
  for (const chain of chains) {
    if (!chain || chain.length < 2) {
      // Need at least 2 samples for variance
      return null;
    }
  }

  // Use the minimum length to ensure chains are comparable (truncate to min length)
  const n = Math.min(...chains.map((c) => c.length));

  if (n < 2) return null;

  const m = chains.length; // Number of chains

  // Helper to compute stats for a simple array of numbers
  const computeStats = (values) => {
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;

    // Sample variance (denominator n - 1)
    const variance =
      values.reduce((acc, val) => acc + (val - mean) ** 2, 0) / (n - 1);

    return { mean, variance };
  };

  const results = {};

  ['x', 'y'].forEach((dim) => {
    // Collect data for this dimension: m chains, each length n
    // chainStats[j] = { mean, variance }

    const chainStats = chains.map((chain) => {
      // Take last n samples (or first n? usually we compare same iterations.
      // Standard is to just take 1..n if they are running in parallel.
      // We will slice the first n to be consistent if lengths differ (though usually they are same)
      const values = chain.slice(0, n).map((sample) => sample[dim]);
      return computeStats(values);
    });

    // Overall mean mu = (1/m) * sum(mu_j)
    const overallMean =
      chainStats.reduce((acc, stat) => acc + stat.mean, 0) / m;

    // Between-chain variance B = (n / (m - 1)) * sum((mu_j - mu)^2)
    const B =
      (n / (m - 1)) *
      chainStats.reduce((acc, stat) => acc + (stat.mean - overallMean) ** 2, 0);

    // Within-chain variance W = (1/m) * sum(s_j^2)
    const W = chainStats.reduce((acc, stat) => acc + stat.variance, 0) / m;

    // Estimate of marginal posterior variance V_hat
    // V_hat = ((n - 1) / n) * W + (1 / n) * B
    const V_hat = ((n - 1) / n) * W + (1 / n) * B;

    // Potential scale reduction R_hat = sqrt(V_hat / W)
    if (W === 0) {
      // If W is 0, it means all chains have 0 variance (constant).
      // If B is also 0, then R_hat is 1 (perfect convergence/constant).
      // If B > 0, then R_hat is inf.
      results[dim] = B === 0 ? 1 : Infinity;
    } else {
      results[dim] = Math.sqrt(V_hat / W);
    }
  });

  return results;
}
