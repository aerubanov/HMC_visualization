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

/**
 * Calculates the Effective Sample Size (ESS) for MCMC chains.
 *
 * Uses the Geyer's initial positive sequence truncation method for estimating
 * integrated autocorrelation time.
 *
 * @param {Array<Array<Object>>} chains - Array of chains, where each chain is an array of samples {x, y}.
 * @returns {Object|null} - { x: number, y: number } representing ESS for each dimension, or null if insufficient data.
 */
export function calculateESS(chains) {
  // 1. Validation
  if (!chains || !Array.isArray(chains) || chains.length < 1) {
    return null;
  }

  // Ensure all chains have data
  for (const chain of chains) {
    if (!chain || chain.length < 2) {
      return null;
    }
  }

  // Use the minimum length to ensure chains are comparable
  const n = Math.min(...chains.map((c) => c.length));
  if (n < 2) return null;

  const m = chains.length;
  // Total samples
  const totalSamples = m * n;

  // Helper to compute stats for a simple array of numbers
  const computeESSForDimension = (values2D) => {
    // values2D is an array of arrays: [chain1Values, chain2Values, ...]
    // Each inner array has length n

    // 2. Compute per-chain means and variances
    // Variance at lag 0 (gamma_0)
    const perChainStats = values2D.map((chainOps) => {
      const sum = chainOps.reduce((a, b) => a + b, 0);
      const mean = sum / n;
      // Variance with denominator n (for autocovariance consistency usually n is used for lags)
      // Guide says: gamma_0^(j) is sample variance with denominator n
      const gamma0 =
        chainOps.reduce((acc, val) => acc + (val - mean) ** 2, 0) / n;
      return { mean, gamma0 };
    });

    // 4. Pool autocovariances across chains
    // We need gamma_k_pooled for k = 0, 1, 2...
    // We compute them on demand.
    // gamma_0 pooled: average of gamma_0^(j)
    const gamma0Pooled =
      perChainStats.reduce((acc, s) => acc + s.gamma0, 0) / m;

    if (gamma0Pooled === 0) {
      // Constant chains, ESS is undefined or could be considered max?
      // If variance is 0, information is infinite or 0 depending on interpretation.
      // Usually return total samples if it's "perfect" but here let's be safe.
      return totalSamples;
    }

    // Function to compute pooled autocorrelation at lag k
    const getRhoK = (k) => {
      let sumGammaK = 0;
      for (let j = 0; j < m; j++) {
        const chainOps = values2D[j];
        const mu_j = perChainStats[j].mean;

        // gamma_k^(j) = (1 / n) * sum_{t=1}^{n-k} (x_t - mu_j)(x_{t+k} - mu_j)
        // Note: Guide says denominator (n-k) reduces bias, but many use n.
        // Let's use n as it's more standard in some Geyer implementations to guarantee positive definite.
        // However, guide mentions: "Using denominator (n-k) reduces bias... both are OK".
        // Let's use (n-k) for better estimate at larger k?
        // Actually Geyer usually recommends the "variogram" approach or standard FFT with padding.
        // For simple implementation without FFT, direct sum:

        let sumCross = 0;
        for (let t = 0; t < n - k; t++) {
          sumCross += (chainOps[t] - mu_j) * (chainOps[t + k] - mu_j);
        }
        // Using n as denominator for autocovariance definition consistency with gamma0
        // Or (n-k)? If we used n for gamma0, let's use n here too usually?
        // "consistent estimators" usually divide by n.
        // Let's stick to n.
        sumGammaK += sumCross / n;
      }
      const gammaK = sumGammaK / m;
      return gammaK / gamma0Pooled;
    };

    // 6. Truncation rule (Geyer's initial positive pairs)
    // Gamma_t = rho_{2t} + rho_{2t+1} ... wait guide says:
    // Gamma_t = rho_{2t-1} + rho_{2t} for t=1,2,...
    // Sum Gamma_t while Gamma_t > 0.
    // Stop when Gamma_t <= 0.

    let t = 1;
    let sumRho = 0;
    // The sum needed for tau_int is: 1 + 2 * sum(rho_k)

    // We sum pairs.
    // rho_0 is always 1.
    // We start looking at pairs (rho_1, rho_2), (rho_3, rho_4)...

    // Wait, notation check:
    // Gamma_1 = rho_1 + rho_2
    // Gamma_2 = rho_3 + rho_4

    // If Gamma_1 > 0, we add it.
    // If Gamma_1 <= 0, we stop.

    // Max lag? n/2 usually safe cap
    const maxLag = Math.floor(n / 2); // heuristic cap

    while (2 * t < maxLag) {
      const rho1 = getRhoK(2 * t - 1);
      const rho2 = getRhoK(2 * t);

      const Gamma_t = rho1 + rho2;

      if (Gamma_t > 0) {
        sumRho += Gamma_t; // We add (rho_{2t-1} + rho_{2t})
        t++;
      } else {
        // Stop
        break;
      }
    }

    // tau_int = 1 + 2 * sumRho
    const tauInt = 1 + 2 * sumRho;

    // 8. Compute ESS
    const ess = totalSamples / tauInt;

    // Clip to max samples
    return Math.min(ess, totalSamples);
  };

  const results = {};

  ['x', 'y'].forEach((dim) => {
    const values2D = chains.map((chain) =>
      chain.slice(0, n).map((s) => s[dim])
    );
    results[dim] = computeESSForDimension(values2D);
  });

  return results;
}
