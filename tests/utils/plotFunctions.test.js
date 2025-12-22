import { describe, it, expect } from 'vitest';
import { HMC_SAMPLER } from '../../src/utils/plotConfig.json';
import {
  createTrajectoryTrace,
  createSamplesTrace,
} from '../../src/utils/plotFunctions';

describe('createTrajectoryTrace', () => {
  describe('Valid Input', () => {
    it('should create a valid trace for a multi-point trajectory', () => {
      const trajectory = [
        { x: 0, y: 0 },
        { x: 0.1, y: 0.05 },
        { x: 0.2, y: 0.1 },
      ];

      const trace = createTrajectoryTrace(trajectory);

      expect(trace).not.toBeNull();
      expect(trace.type).toBe('scatter');
      expect(trace.mode).toBe('lines+markers');
      expect(trace.x).toEqual([0, 0.1, 0.2]);
      expect(trace.y).toEqual([0, 0.05, 0.1]);
      expect(trace.name).toBe('Trajectory');
      expect(trace.showlegend).toBe(true);
    });

    it('should extract x and y coordinates correctly', () => {
      const trajectory = [
        { x: -1.5, y: 2.3 },
        { x: 0.7, y: -0.8 },
      ];

      const trace = createTrajectoryTrace(trajectory);

      expect(trace.x).toEqual([-1.5, 0.7]);
      expect(trace.y).toEqual([2.3, -0.8]);
    });

    it('should have correct line properties', () => {
      const trajectory = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ];

      const trace = createTrajectoryTrace(trajectory);

      expect(trace.line).toBeDefined();
      expect(trace.line.color).toBe(HMC_SAMPLER.styles.primaryColor);
      expect(trace.line.width).toBeGreaterThan(0);
      expect(trace.line.shape).toBe('linear');
    });

    it('should have correct marker properties', () => {
      const trajectory = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ];

      const trace = createTrajectoryTrace(trajectory);

      expect(trace.marker).toBeDefined();
      expect(trace.marker.color).toBe(HMC_SAMPLER.styles.primaryColor);
      expect(trace.marker.size).toBeGreaterThan(0);
      expect(trace.marker.symbol).toBe('circle');
    });

    it('should have a hover template', () => {
      const trajectory = [{ x: 0, y: 0 }];
      const trace = createTrajectoryTrace(trajectory);

      expect(trace.hovertemplate).toBeDefined();
      expect(typeof trace.hovertemplate).toBe('string');
      expect(trace.hovertemplate.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should return null for empty trajectory', () => {
      const trajectory = [];
      const trace = createTrajectoryTrace(trajectory);

      expect(trace).toBeNull();
    });

    it('should return null for null input', () => {
      const trace = createTrajectoryTrace(null);

      expect(trace).toBeNull();
    });

    it('should return null for undefined input', () => {
      const trace = createTrajectoryTrace(undefined);

      expect(trace).toBeNull();
    });

    it('should handle single-point trajectory', () => {
      const trajectory = [{ x: 1.5, y: -0.5 }];
      const trace = createTrajectoryTrace(trajectory);

      expect(trace).not.toBeNull();
      expect(trace.x).toEqual([1.5]);
      expect(trace.y).toEqual([-0.5]);
      expect(trace.type).toBe('scatter');
    });

    it('should handle trajectory with many points', () => {
      const trajectory = Array.from({ length: 100 }, (_, i) => ({
        x: i * 0.1,
        y: Math.sin(i * 0.1),
      }));

      const trace = createTrajectoryTrace(trajectory);

      expect(trace).not.toBeNull();
      expect(trace.x.length).toBe(100);
      expect(trace.y.length).toBe(100);
    });
  });

  describe('Trace Structure', () => {
    it('should have all required Plotly properties', () => {
      const trajectory = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ];

      const trace = createTrajectoryTrace(trajectory);

      expect(trace).toHaveProperty('type');
      expect(trace).toHaveProperty('mode');
      expect(trace).toHaveProperty('x');
      expect(trace).toHaveProperty('y');
      expect(trace).toHaveProperty('line');
      expect(trace).toHaveProperty('marker');
      expect(trace).toHaveProperty('name');
      expect(trace).toHaveProperty('showlegend');
      expect(trace).toHaveProperty('hovertemplate');
    });

    it('should have correct property types', () => {
      const trajectory = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ];

      const trace = createTrajectoryTrace(trajectory);

      expect(typeof trace.type).toBe('string');
      expect(typeof trace.mode).toBe('string');
      expect(Array.isArray(trace.x)).toBe(true);
      expect(Array.isArray(trace.y)).toBe(true);
      expect(typeof trace.line).toBe('object');
      expect(typeof trace.marker).toBe('object');
      expect(typeof trace.name).toBe('string');
      expect(typeof trace.showlegend).toBe('boolean');
      expect(typeof trace.hovertemplate).toBe('string');
    });
  });
});

describe('createSamplesTrace', () => {
  describe('Valid Input', () => {
    it('should create a valid trace for accepted samples', () => {
      const samples = [
        { x: 0, y: 0 },
        { x: 0.1, y: 0.05 },
        { x: 0.2, y: 0.1 },
      ];

      const trace = createSamplesTrace(samples);

      expect(trace).not.toBeNull();
      expect(trace.type).toBe('scatter');
      expect(trace.mode).toBe('lines+markers');
      expect(trace.x).toEqual([0, 0.1, 0.2]);
      expect(trace.y).toEqual([0, 0.05, 0.1]);
      expect(trace.name).toBe('Samples');
      expect(trace.showlegend).toBe(true);
    });

    it('should have correct marker properties', () => {
      const samples = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ];

      const trace = createSamplesTrace(samples);

      expect(trace.marker).toBeDefined();
      expect(trace.marker.color).toBe(HMC_SAMPLER.styles.primaryColor);
      expect(trace.marker.size).toBeGreaterThan(0);
      expect(trace.marker.symbol).toBe('circle');
      expect(trace.marker.opacity).toBeDefined();

      expect(trace.line).toBeDefined();
      expect(trace.line.color).toBe(HMC_SAMPLER.styles.primaryColor);
      expect(trace.line.dash).toBe('dash');
    });
  });

  describe('Edge Cases', () => {
    it('should return null for empty samples', () => {
      const samples = [];
      const trace = createSamplesTrace(samples);

      expect(trace).toBeNull();
    });

    it('should return null for null input', () => {
      const trace = createSamplesTrace(null);

      expect(trace).toBeNull();
    });
  });
});
