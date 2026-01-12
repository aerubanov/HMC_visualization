import { describe, it, expect } from 'vitest';
import {
  HMC_SAMPLER,
  CONTOUR,
  TRACE_PLOT,
} from '../../src/utils/plotConfig.json';
import {
  createTrajectoryTrace,
  createSamplesTrace,
  createContourTrace,
  generateGrid,
  createTracePlotTrace,
  createHistogram2DTrace,
  createMarginalHistogramTrace,
} from '../../src/utils/plotFunctions';

describe('createContourTrace', () => {
  it('should create a valid contour trace with correct z-range', () => {
    const x = [0, 1];
    const y = [0, 1];
    const z = [
      [1, 2],
      [3, NaN],
    ];

    const trace = createContourTrace(x, y, z);

    expect(trace.type).toBe('contour');
    expect(trace.x).toBe(x);
    expect(trace.y).toBe(y);
    expect(trace.z).toBe(z);
    expect(trace.zmin).toBe(1);
    expect(trace.zmax).toBe(3);
    expect(trace.contours.coloring).toBe('heatmap');
  });

  it('should handle infinite values in z', () => {
    const z = [
      [-Infinity, 5],
      [10, Infinity],
    ];
    const trace = createContourTrace([0, 1], [0, 1], z);
    expect(trace.zmin).toBe(5);
    expect(trace.zmax).toBe(10);
  });
});

describe('generateGrid', () => {
  it('should generate grid based on config', () => {
    const grid = generateGrid();
    const { resolution, xRange, yRange } = CONTOUR.grid;

    expect(grid.x).toHaveLength(resolution);
    expect(grid.y).toHaveLength(resolution);
    expect(grid.xGrid).toHaveLength(resolution);
    expect(grid.yGrid).toHaveLength(resolution);

    expect(grid.x[0]).toBe(xRange[0]);
    expect(grid.x[resolution - 1]).toBe(xRange[1]);
    expect(grid.y[0]).toBe(yRange[0]);
    expect(grid.y[resolution - 1]).toBe(yRange[1]);
  });
});

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

describe('createTracePlotTrace', () => {
  const samples = [
    { x: 1, y: 1 },
    { x: 2, y: 2 },
    { x: 3, y: 3 },
    { x: 4, y: 4 },
    { x: 5, y: 5 },
  ];

  it('should return empty array for empty input', () => {
    expect(createTracePlotTrace([], 'x')).toEqual([]);
    expect(createTracePlotTrace(null, 'x')).toEqual([]);
  });

  it('should create valid samples without burn-in', () => {
    const traces = createTracePlotTrace(samples, 'x', 0, '#ff0000', 'Test');
    expect(traces).toHaveLength(1);
    expect(traces[0].x).toEqual([0, 1, 2, 3, 4]);
    expect(traces[0].y).toEqual([1, 2, 3, 4, 5]);
    expect(traces[0].line.color).toBe('#ff0000');
    expect(traces[0].name).toBe('Test');
  });

  it('should split burn-in and valid samples', () => {
    const traces = createTracePlotTrace(samples, 'x', 2, '#ff0000', 'Test');
    expect(traces).toHaveLength(2);

    // Burn-in trace (includes first valid sample to connect)
    expect(traces[0].name).toBe('Test (Burn-in)');
    expect(traces[0].x).toEqual([0, 1, 2]); // 0, 1, 2 (index 2 is first valid)
    expect(traces[0].y).toEqual([1, 2, 3]);

    // Valid trace
    expect(traces[1].name).toBe('Test');
    expect(traces[1].x).toEqual([2, 3, 4]);
    expect(traces[1].y).toEqual([3, 4, 5]);
    expect(traces[1].line.color).toBe('#ff0000');
  });

  it('should handle burn-in equal to length', () => {
    const traces = createTracePlotTrace(samples, 'x', 5, '#ff0000', 'Test');
    expect(traces).toHaveLength(1);
    expect(traces[0].name).toBe('Test (Burn-in)');
  });

  it('should use rgba for opacity', () => {
    const traces = createTracePlotTrace(samples, 'x', 1, '#ff0000', 'Test');
    // Burn-in trace color should be rgba with burnInOpacity from config
    const expectedOpacity = TRACE_PLOT.styles.burnInOpacity;
    expect(traces[0].line.color).toMatch(
      new RegExp(`rgba\\(255, 0, 0, ${expectedOpacity}\\)`)
    );
  });
});

describe('createHistogram2DTrace', () => {
  it('should create valid 2D histogram trace', () => {
    const samples = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ];
    const trace = createHistogram2DTrace(samples);
    expect(trace.type).toBe('histogram2d');
    expect(trace.x).toEqual([1, 2]);
    expect(trace.y).toEqual([1, 2]);
  });

  it('should return null for empty samples', () => {
    expect(createHistogram2DTrace([])).toBeNull();
  });
});

describe('createMarginalHistogramTrace', () => {
  it('should create valid marginal histogram', () => {
    const samples = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ];
    const trace = createMarginalHistogramTrace(
      samples,
      'x',
      '#000',
      'Test',
      'v'
    );
    expect(trace.type).toBe('histogram');
    expect(trace.x).toEqual([1, 2]);
    expect(trace.orientation).toBe('v');
  });

  it('should handle horizontal orientation', () => {
    const samples = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ];
    const trace = createMarginalHistogramTrace(
      samples,
      'y',
      '#000',
      'Test',
      'h'
    );
    expect(trace.y).toEqual([1, 2]);
    expect(trace.orientation).toBe('h');
  });

  it('should return null for empty samples', () => {
    expect(createMarginalHistogramTrace([])).toBeNull();
  });
});
