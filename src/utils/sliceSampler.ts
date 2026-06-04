import { logger } from './logger';
import { SeededRandom } from './seededRandom';

/**
 * Perform one step of Slice Sampling to sample from a 1D distribution.
 *
 * Algorithm:
 * 1. Calculate log probability threshold: log_y = logP(x0) - e, where e ~ Exp(1).
 * 2. Find interval [L, R] around x0 that contains the "slice" {x : logP(x) > log_y}.
 *    (Stepping out procedure)
 * 3. Sample x_new uniformly from [L, R].
 * 4. If logP(x_new) < log_y, shrink interval [L, R] and retry.
 *    (Shrinkage procedure)
 *
 * @param logDensityFn - Function (x) => number (log probability density)
 * @param x0 - Current sample value
 * @param w - Estimate of the typical width of the slice
 * @param rng - Optional seeded RNG. If null, uses Math.random.
 */
export function sampleSlice(
  logDensityFn: (x: number) => number,
  x0: number,
  w: number = 1.0,
  rng: SeededRandom | null = null
): number {
  const random = rng ? () => rng.random() : Math.random;

  // 1. Calculate log probability threshold
  // log_y = logP(x_0) - e, where e ~ Exp(1)
  const logPx0 = logDensityFn(x0);
  const e = -Math.log(1.0 - random()); // Exponential(1)
  const logY = logPx0 - e;

  // 2. Init interval [L, R] randomly around x0
  let u = random() * w;
  let L = x0 - u;
  let R = x0 + (w - u);

  // 3. Stepping out (Expand interval until endpoints are outside the slice)
  // Limit iterations to prevent infinite loops in bad distributions
  const MAX_STEPS = 100;
  let steps = 0;

  while (steps < MAX_STEPS && logDensityFn(L) > logY) {
    L -= w;
    steps++;
  }

  steps = 0;
  while (steps < MAX_STEPS && logDensityFn(R) > logY) {
    R += w;
    steps++;
  }

  // 4. Shrinkage (Sample from [L, R] until accepted)
  const MAX_SHRINK_STEPS = 1000;
  let shrinkSteps = 0;
  let x1: number | undefined;

  while (shrinkSteps < MAX_SHRINK_STEPS) {
    x1 = L + random() * (R - L);
    const logPx1 = logDensityFn(x1);

    if (logPx1 >= logY) {
      // Accepted!
      return x1;
    }

    // Shrink interval
    if (x1 < x0) {
      L = x1;
    } else {
      R = x1;
    }
    shrinkSteps++;
  }

  // Fallback: if we simply can't find a point (numerical issues?), return x0
  logger.warn('Slice sampler max shrinkage reached — returning x0');
  return x0;
}
