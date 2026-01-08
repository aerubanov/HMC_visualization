import { describe, it, expect } from 'vitest';
import {
  prepareHistogramData,
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
