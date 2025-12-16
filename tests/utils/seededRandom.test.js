import { describe, it, expect } from 'vitest';
import { SeededRandom } from '../../src/utils/seededRandom';

describe('SeededRandom', () => {
  describe('Main Scenarios', () => {
    it('should produce same sequence with same seed', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      const sequence1 = Array.from({ length: 10 }, () => rng1.random());
      const sequence2 = Array.from({ length: 10 }, () => rng2.random());

      expect(sequence1).toEqual(sequence2);
    });

    it('should reproduce sequence after resetting seed', () => {
      const rng = new SeededRandom(42);

      const sequence1 = Array.from({ length: 10 }, () => rng.random());

      rng.setSeed(42);
      const sequence2 = Array.from({ length: 10 }, () => rng.random());

      expect(sequence1).toEqual(sequence2);
    });

    it('should produce different sequences with different seeds', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(100);

      const sequence1 = Array.from({ length: 10 }, () => rng1.random());
      const sequence2 = Array.from({ length: 10 }, () => rng2.random());

      expect(sequence1).not.toEqual(sequence2);
    });

    it('should produce normal distribution with randn()', () => {
      const rng = new SeededRandom(42);
      const samples = Array.from({ length: 10000 }, () => rng.randn());

      // Calculate mean and standard deviation
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      const variance =
        samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
      const std = Math.sqrt(variance);

      // Mean should be close to 0, std should be close to 1
      expect(mean).toBeCloseTo(0, 1); // Within 0.1
      expect(std).toBeCloseTo(1, 1); // Within 0.1
    });

    it('should return values in valid range for random()', () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        const value = rng.random();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('should return finite values for randn()', () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        const value = rng.randn();
        expect(isFinite(value)).toBe(true);
        expect(isNaN(value)).toBe(false);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should work with seed = 0', () => {
      const rng = new SeededRandom(0);
      const value = rng.random();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(isFinite(value)).toBe(true);
    });

    it('should work with large seed values', () => {
      const rng = new SeededRandom(2147483647); // Max 32-bit int
      const value = rng.random();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(isFinite(value)).toBe(true);
    });

    it('should work with negative seeds', () => {
      const rng = new SeededRandom(-42);
      const value = rng.random();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(isFinite(value)).toBe(true);
    });

    it('should work with default seed (no parameter)', () => {
      const rng = new SeededRandom();
      const value = rng.random();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(isFinite(value)).toBe(true);
    });

    it('should return correct seed with getSeed()', () => {
      const rng = new SeededRandom(42);
      expect(rng.getSeed()).toBe(42);

      rng.setSeed(100);
      expect(rng.getSeed()).toBe(100);
    });
  });

  describe('Reproducibility', () => {
    it('should produce identical randn() sequences with same seed', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      const sequence1 = Array.from({ length: 20 }, () => rng1.randn());
      const sequence2 = Array.from({ length: 20 }, () => rng2.randn());

      expect(sequence1).toEqual(sequence2);
    });

    it('should produce different randn() sequences with different seeds', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(43);

      const sequence1 = Array.from({ length: 20 }, () => rng1.randn());
      const sequence2 = Array.from({ length: 20 }, () => rng2.randn());

      expect(sequence1).not.toEqual(sequence2);
    });
  });
});
