import { describe, it, expect } from 'vitest';
import {
  prepareHistogramData,
  prepareHistogramDataPerChain,
  calculateHistogramBins,
} from '../../src/utils/histogramUtils';

describe('histogramUtils', () => {
  describe('prepareHistogramData', () => {
    it('should filter out burn-in samples from single chain', () => {
      const samples = [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 5, y: 6 },
        { x: 7, y: 8 },
      ];
      const burnIn = 2;

      const result = prepareHistogramData(samples, null, burnIn, false);

      expect(result.samples).toHaveLength(2);
      expect(result.samples[0]).toEqual({ x: 5, y: 6 });
      expect(result.samples[1]).toEqual({ x: 7, y: 8 });
    });

    it('should combine and filter dual chains', () => {
      const samples = [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ];
      const samples2 = [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ];
      const burnIn = 1;

      const result = prepareHistogramData(samples, samples2, burnIn, true);

      // (3, 4) from chain 1 + (30, 40) from chain 2
      expect(result.samples).toHaveLength(2);
      expect(result.samples[0]).toEqual({ x: 3, y: 4 });
      expect(result.samples[1]).toEqual({ x: 30, y: 40 });
    });

    it('should return empty samples array when burnIn >= sample length', () => {
      const samples = [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ];
      const burnIn = 5;

      const result = prepareHistogramData(samples, null, burnIn, false);

      expect(result.samples).toHaveLength(0);
    });

    it('should handle null/undefined samples gracefully', () => {
      const result = prepareHistogramData(null, null, 0, false);
      expect(result.samples).toHaveLength(0);
    });

    it('should ignore second chain when useSecondChain is false', () => {
      const samples = [{ x: 1, y: 2 }];
      const samples2 = [{ x: 10, y: 20 }];

      const result = prepareHistogramData(samples, samples2, 0, false);

      expect(result.samples).toHaveLength(1);
      expect(result.samples[0]).toEqual({ x: 1, y: 2 });
    });

    it('should handle zero burn-in', () => {
      const samples = [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ];

      const result = prepareHistogramData(samples, null, 0, false);

      expect(result.samples).toHaveLength(2);
      expect(result.samples).toEqual(samples);
    });
  });

  describe('prepareHistogramDataPerChain', () => {
    it('returns one entry per chain with required fields', () => {
      const chains = [
        {
          id: 0,
          samplerType: 'HMC',
          samples: [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
            { x: 5, y: 6 },
          ],
        },
        {
          id: 1,
          samplerType: 'Gibbs',
          samples: [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ],
        },
      ];

      const result = prepareHistogramDataPerChain(chains, 0);

      expect(result).toHaveLength(2);

      expect(result[0]).toHaveProperty('chainId', 0);
      expect(result[0]).toHaveProperty('samplerType', 'HMC');
      expect(result[0]).toHaveProperty('label');
      expect(result[0]).toHaveProperty('samples');
      expect(typeof result[0].label).toBe('string');
      expect(result[0].label).toContain('HMC');

      expect(result[1]).toHaveProperty('chainId', 1);
      expect(result[1]).toHaveProperty('samplerType', 'Gibbs');
      expect(result[1]).toHaveProperty('label');
      expect(result[1].label).toContain('Gibbs');
    });

    it('excludes burn-in samples from each chain independently', () => {
      const chains = [
        {
          id: 0,
          samplerType: 'HMC',
          samples: [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
            { x: 3, y: 3 },
            { x: 4, y: 4 },
          ],
        },
        {
          id: 1,
          samplerType: 'Gibbs',
          samples: [
            { x: 10, y: 10 },
            { x: 20, y: 20 },
            { x: 30, y: 30 },
          ],
        },
      ];

      const result = prepareHistogramDataPerChain(chains, 2);

      // Chain 0: 4 samples, burnIn 2 → 2 remaining
      expect(result[0].samples).toHaveLength(2);
      expect(result[0].samples[0]).toEqual({ x: 3, y: 3 });
      expect(result[0].samples[1]).toEqual({ x: 4, y: 4 });

      // Chain 1: 3 samples, burnIn 2 → 1 remaining
      expect(result[1].samples).toHaveLength(1);
      expect(result[1].samples[0]).toEqual({ x: 30, y: 30 });
    });

    it('does not mix samples between chains (no cross-chain merging)', () => {
      const hmcSamples = [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
      ];
      const gibbsSamples = [
        { x: 100, y: 100 },
        { x: 200, y: 200 },
        { x: 300, y: 300 },
      ];
      const chains = [
        { id: 0, samplerType: 'HMC', samples: hmcSamples },
        { id: 1, samplerType: 'Gibbs', samples: gibbsSamples },
      ];

      const result = prepareHistogramDataPerChain(chains, 0);

      // HMC entry must only contain HMC samples
      result[0].samples.forEach((s) => {
        expect(s.x).toBeLessThan(10);
      });

      // Gibbs entry must only contain Gibbs samples
      result[1].samples.forEach((s) => {
        expect(s.x).toBeGreaterThanOrEqual(100);
      });

      // No sample should appear in both entries
      const allHmcXValues = new Set(result[0].samples.map((s) => s.x));
      result[1].samples.forEach((s) => {
        expect(allHmcXValues.has(s.x)).toBe(false);
      });
    });
  });

  describe('calculateHistogramBins', () => {
    it('should calculate bin edges for simple data', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const result = calculateHistogramBins(values, 5);

      expect(result.binEdges).toBeDefined();
      expect(result.binEdges.length).toBeGreaterThan(0);
      expect(result.binWidth).toBeGreaterThan(0);
    });

    it('should handle empty array', () => {
      const values = [];

      const result = calculateHistogramBins(values, 5);

      expect(result.binEdges).toHaveLength(0);
      expect(result.binWidth).toBe(0);
    });

    it('should handle single value', () => {
      const values = [5];

      const result = calculateHistogramBins(values, 5);

      expect(result.binEdges).toBeDefined();
      // Single value should still produce valid bins
      expect(result.binEdges.length).toBeGreaterThanOrEqual(2);
    });

    it('should auto-calculate bins when numBins is null', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const result = calculateHistogramBins(values, null);

      expect(result.binEdges).toBeDefined();
      expect(result.binEdges.length).toBeGreaterThan(0);
      expect(result.binWidth).toBeGreaterThan(0);
    });
  });
});
