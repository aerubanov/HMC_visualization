import { describe, it, expect, vi } from 'vitest';
import { sampleSlice } from '../../src/utils/sliceSampler';
import { SeededRandom } from '../../src/utils/seededRandom';

vi.mock('../../src/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { logger } from '../../src/utils/logger';

describe('sliceSampler', () => {
  // Standard Gaussian: logP(x) = -0.5 * x^2
  const gaussianLogP = (x) => -0.5 * x * x;

  it('should return a number', () => {
    const sample = sampleSlice(gaussianLogP, 0);
    expect(typeof sample).toBe('number');
  });

  it('should respect the seed for reproducibility', () => {
    const seed = 123;
    const rng1 = new SeededRandom(seed);
    const rng2 = new SeededRandom(seed);

    const sample1 = sampleSlice(gaussianLogP, 0, 1.0, rng1);
    const sample2 = sampleSlice(gaussianLogP, 0, 1.0, rng2);

    expect(sample1).toBe(sample2);
  });

  it('logger.warn called when max shrinkage reached', () => {
    // logP returns high value only at exactly x0=0; everywhere else returns -Infinity.
    // The threshold logY = logP(0) - e will be just below 0, but any sampled point
    // will have logP = -Infinity < logY, so shrinkage is exhausted immediately.
    const spikeLogP = (x) => (x === 0 ? 0 : -Infinity);
    sampleSlice(spikeLogP, 0.0, 1.0);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('max shrinkage')
    );
  });

  it('should sample from a Gaussian distribution with correct mean and variance (approx)', () => {
    const rng = new SeededRandom(42);
    let x = 0;
    const nSamples = 2000;
    let sum = 0;
    let sumSq = 0;

    // Burn-in
    for (let i = 0; i < 100; i++) x = sampleSlice(gaussianLogP, x, 1.0, rng);

    for (let i = 0; i < nSamples; i++) {
      x = sampleSlice(gaussianLogP, x, 1.0, rng);
      sum += x;
      sumSq += x * x;
    }

    const mean = sum / nSamples;
    const variance = sumSq / nSamples - mean * mean;

    // Gaussian(0, 1) -> Mean ~ 0, Variance ~ 1
    expect(Math.abs(mean)).toBeLessThan(0.15);
    expect(Math.abs(variance - 1)).toBeLessThan(0.25);
  });
});
