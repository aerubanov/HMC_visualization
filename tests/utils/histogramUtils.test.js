import { describe, it, expect } from 'vitest';
import {
  prepareHistogramDataByType,
  calculateHistogramBins,
} from '../../src/utils/histogramUtils';

describe('histogramUtils', () => {
  describe('prepareHistogramDataByType', () => {
    it('single HMC chain → 1 entry, samplerType HMC, correct post-burn-in samples', () => {
      const chains = [
        {
          id: 0,
          samplerType: 'HMC',
          colorIndex: 0,
          samples: [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
            { x: 5, y: 6 },
            { x: 7, y: 8 },
          ],
          params: {},
          initialPosition: { x: 0, y: 0 },
          seed: null,
          trajectory: [],
          rejectedCount: 0,
          acceptedCount: 4,
          error: null,
          currentParticle: null,
        },
      ];

      const result = prepareHistogramDataByType(chains, 2);

      expect(result).toHaveLength(1);
      expect(result[0].samplerType).toBe('HMC');
      expect(result[0].chainId).toBe('HMC');
      expect(result[0].label).toBe('HMC');
      expect(result[0].samples).toHaveLength(2);
      expect(result[0].samples[0]).toEqual({ x: 5, y: 6 });
      expect(result[0].samples[1]).toEqual({ x: 7, y: 8 });
    });

    it('two HMC chains → 1 entry with merged post-burn-in samples', () => {
      const chains = [
        {
          id: 0,
          samplerType: 'HMC',
          colorIndex: 0,
          samples: [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
            { x: 3, y: 3 },
          ],
          params: {},
          initialPosition: { x: 0, y: 0 },
          seed: null,
          trajectory: [],
          rejectedCount: 0,
          acceptedCount: 3,
          error: null,
          currentParticle: null,
        },
        {
          id: 1,
          samplerType: 'HMC',
          colorIndex: 1,
          samples: [
            { x: 10, y: 10 },
            { x: 20, y: 20 },
            { x: 30, y: 30 },
          ],
          params: {},
          initialPosition: { x: 1, y: 1 },
          seed: null,
          trajectory: [],
          rejectedCount: 0,
          acceptedCount: 3,
          error: null,
          currentParticle: null,
        },
      ];

      const result = prepareHistogramDataByType(chains, 1);

      expect(result).toHaveLength(1);
      expect(result[0].samplerType).toBe('HMC');
      // chain 0: 2 post-burnin, chain 1: 2 post-burnin → 4 merged
      expect(result[0].samples).toHaveLength(4);
      // Verify no cross-type mixing: all samples come from HMC chains
      expect(result[0].samples[0]).toEqual({ x: 2, y: 2 });
      expect(result[0].samples[1]).toEqual({ x: 3, y: 3 });
      expect(result[0].samples[2]).toEqual({ x: 20, y: 20 });
      expect(result[0].samples[3]).toEqual({ x: 30, y: 30 });
    });

    it('one HMC + one Gibbs → 2 entries, samples not mixed across types', () => {
      const chains = [
        {
          id: 0,
          samplerType: 'HMC',
          colorIndex: 0,
          samples: [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
            { x: 3, y: 3 },
          ],
          params: {},
          initialPosition: { x: 0, y: 0 },
          seed: null,
          trajectory: [],
          rejectedCount: 0,
          acceptedCount: 3,
          error: null,
          currentParticle: null,
        },
        {
          id: 1,
          samplerType: 'GIBBS',
          colorIndex: 1,
          samples: [
            { x: 100, y: 100 },
            { x: 200, y: 200 },
            { x: 300, y: 300 },
          ],
          params: {},
          initialPosition: { x: 1, y: 1 },
          seed: null,
          trajectory: [],
          rejectedCount: 0,
          acceptedCount: 3,
          error: null,
          currentParticle: null,
        },
      ];

      const result = prepareHistogramDataByType(chains, 0);

      expect(result).toHaveLength(2);
      const hmcEntry = result.find((e) => e.samplerType === 'HMC');
      const gibbsEntry = result.find((e) => e.samplerType === 'GIBBS');

      expect(hmcEntry).toBeDefined();
      expect(gibbsEntry).toBeDefined();

      // No sample should appear in both entries
      hmcEntry.samples.forEach((s) => expect(s.x).toBeLessThan(10));
      gibbsEntry.samples.forEach((s) =>
        expect(s.x).toBeGreaterThanOrEqual(100)
      );
    });

    it('two HMC + three Gibbs → 2 entries, correct sample counts', () => {
      const makeChain = (id, samplerType, colorIndex, sampleCount) => ({
        id,
        samplerType,
        colorIndex,
        samples: Array.from({ length: sampleCount }, (_, i) => ({
          x: i + id * 100,
          y: i,
        })),
        params: {},
        initialPosition: { x: 0, y: 0 },
        seed: null,
        trajectory: [],
        rejectedCount: 0,
        acceptedCount: sampleCount,
        error: null,
        currentParticle: null,
      });

      const chains = [
        makeChain(0, 'HMC', 0, 5),
        makeChain(1, 'HMC', 1, 5),
        makeChain(2, 'GIBBS', 2, 4),
        makeChain(3, 'GIBBS', 3, 4),
        makeChain(4, 'GIBBS', 4, 4),
      ];

      const result = prepareHistogramDataByType(chains, 0);

      expect(result).toHaveLength(2);
      const hmcEntry = result.find((e) => e.samplerType === 'HMC');
      const gibbsEntry = result.find((e) => e.samplerType === 'GIBBS');

      // 2 HMC chains × 5 samples each = 10
      expect(hmcEntry.samples).toHaveLength(10);
      // 3 Gibbs chains × 4 samples each = 12
      expect(gibbsEntry.samples).toHaveLength(12);
    });

    it('burn-in is applied within each group', () => {
      const chains = [
        {
          id: 0,
          samplerType: 'HMC',
          colorIndex: 0,
          samples: [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
            { x: 3, y: 3 },
            { x: 4, y: 4 },
            { x: 5, y: 5 },
          ],
          params: {},
          initialPosition: { x: 0, y: 0 },
          seed: null,
          trajectory: [],
          rejectedCount: 0,
          acceptedCount: 5,
          error: null,
          currentParticle: null,
        },
        {
          id: 1,
          samplerType: 'GIBBS',
          colorIndex: 1,
          samples: [
            { x: 10, y: 10 },
            { x: 20, y: 20 },
            { x: 30, y: 30 },
          ],
          params: {},
          initialPosition: { x: 1, y: 1 },
          seed: null,
          trajectory: [],
          rejectedCount: 0,
          acceptedCount: 3,
          error: null,
          currentParticle: null,
        },
      ];

      const result = prepareHistogramDataByType(chains, 3);

      const hmcEntry = result.find((e) => e.samplerType === 'HMC');
      const gibbsEntry = result.find((e) => e.samplerType === 'GIBBS');

      // HMC: 5 samples, burnIn 3 → 2 remaining
      expect(hmcEntry.samples).toHaveLength(2);
      expect(hmcEntry.samples[0]).toEqual({ x: 4, y: 4 });
      expect(hmcEntry.samples[1]).toEqual({ x: 5, y: 5 });

      // Gibbs: 3 samples, burnIn 3 → 0 remaining
      expect(gibbsEntry.samples).toHaveLength(0);
    });

    it('empty chains array → returns []', () => {
      const result = prepareHistogramDataByType([], 0);
      expect(result).toEqual([]);
    });

    it('chain with no samples → its contribution to the group is empty; other chains unaffected', () => {
      const chains = [
        {
          id: 0,
          samplerType: 'HMC',
          colorIndex: 0,
          samples: [],
          params: {},
          initialPosition: { x: 0, y: 0 },
          seed: null,
          trajectory: [],
          rejectedCount: 0,
          acceptedCount: 0,
          error: null,
          currentParticle: null,
        },
        {
          id: 1,
          samplerType: 'HMC',
          colorIndex: 1,
          samples: [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
            { x: 3, y: 3 },
          ],
          params: {},
          initialPosition: { x: 1, y: 1 },
          seed: null,
          trajectory: [],
          rejectedCount: 0,
          acceptedCount: 3,
          error: null,
          currentParticle: null,
        },
      ];

      const result = prepareHistogramDataByType(chains, 1);

      expect(result).toHaveLength(1);
      expect(result[0].samplerType).toBe('HMC');
      // chain 0 contributes 0 samples; chain 1 contributes 2 post-burnin samples
      expect(result[0].samples).toHaveLength(2);
      expect(result[0].samples[0]).toEqual({ x: 2, y: 2 });
    });

    it('Gibbs label is "Gibbs"', () => {
      const chains = [
        {
          id: 0,
          samplerType: 'GIBBS',
          colorIndex: 0,
          samples: [{ x: 1, y: 1 }],
          params: {},
          initialPosition: { x: 0, y: 0 },
          seed: null,
          trajectory: [],
          rejectedCount: 0,
          acceptedCount: 1,
          error: null,
          currentParticle: null,
        },
      ];

      const result = prepareHistogramDataByType(chains, 0);
      expect(result[0].label).toBe('Gibbs');
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
