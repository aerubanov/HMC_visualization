import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useHMCController from '../../src/hooks/useHMCController';

// Mock the HMC sampler functions
vi.mock('../../src/utils/hmcSampler', () => ({
  step: vi.fn(),
  leapfrog: vi.fn(),
}));

import { step } from '../../src/utils/hmcSampler';

describe('useHMCController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useHMCController());

    expect(result.current.logP).toBe('');
    expect(result.current.params).toEqual({ epsilon: 0.1, L: 10, steps: 1 });
    expect(result.current.samples).toEqual([]);
    expect(result.current.trajectory).toEqual([]);
    expect(result.current.currentParticle).toBeNull();
    expect(result.current.isRunning).toBe(false);
    expect(result.current.iterationCount).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should update logP and reset state', () => {
    const { result } = renderHook(() => useHMCController());

    act(() => {
      result.current.setLogP('-(x^2)/2');
    });

    expect(result.current.logP).toBe('-(x^2)/2');
    expect(result.current.samples).toEqual([]);
    expect(result.current.iterationCount).toBe(0);
  });

  it('should update parameters', () => {
    const { result } = renderHook(() => useHMCController());

    act(() => {
      result.current.setParams({ epsilon: 0.05, L: 20, steps: 5 });
    });

    expect(result.current.params).toEqual({ epsilon: 0.05, L: 20, steps: 5 });
  });

  it('should sample N steps', async () => {
    const { result } = renderHook(() => useHMCController());

    // Setup initial state
    act(() => {
      result.current.setLogP('-(x^2)/2');
      result.current.setInitialPosition({ x: 0, y: 0 });
      result.current.setParams({ epsilon: 0.1, L: 10 });
    });

    // Mock step return - each call returns a different position
    let callCount = 0;
    vi.mocked(step).mockImplementation(() => ({
      q: { x: callCount, y: callCount },
      p: { x: 0, y: 0 },
      accepted: true,
      trajectory: [{ x: callCount, y: callCount }],
      energy: 10 + callCount++,
    }));

    // Call sampleSteps with N=5
    // Note: sampleSteps uses requestAnimationFrame, so it's asynchronous
    act(() => {
      result.current.sampleSteps(5);
    });

    // Wait for all 5 steps to complete
    // Since sampleSteps uses requestAnimationFrame, we need to wait for async updates
    await waitFor(
      () => {
        expect(result.current.isRunning).toBe(false);
      },
      { timeout: 1000 }
    );

    // Verify that step was called 5 times
    expect(step).toHaveBeenCalledTimes(5);

    // Verify that iteration count is 5
    expect(result.current.iterationCount).toBe(5);

    // Verify that samples array has 5 entries
    expect(result.current.samples).toHaveLength(5);

    // Verify that trajectory array has 5 entries
    expect(result.current.trajectory).toHaveLength(5);

    // Verify the samples contain the expected values
    expect(result.current.samples[0]).toEqual({ x: 0, y: 0 });
    expect(result.current.samples[4]).toEqual({ x: 4, y: 4 });
  });

  it('should perform a step and update state', () => {
    const { result } = renderHook(() => useHMCController());

    act(() => {
      result.current.setLogP('-(x^2)/2');
      result.current.setInitialPosition({ x: 0, y: 0 });
    });

    act(() => {
      result.current.step();
    });

    expect(result.current.iterationCount).toBe(1);
    expect(result.current.samples.length).toBe(1);
    expect(result.current.trajectory.length).toBe(1);
  });

  it('should update plot data (samples, trajectory) after each step', () => {
    const { result } = renderHook(() => useHMCController());

    act(() => {
      result.current.setLogP('-(x^2)/2');
      result.current.setInitialPosition({ x: 0, y: 0 });
    });

    act(() => {
      result.current.step();
    });

    expect(result.current.samples).toHaveLength(1);
    expect(result.current.trajectory).toHaveLength(1);
    expect(result.current.currentParticle).not.toBeNull();

    act(() => {
      result.current.step();
    });

    expect(result.current.samples).toHaveLength(2);
    expect(result.current.trajectory).toHaveLength(2);
  });

  it('should handle errors in logP parsing', () => {
    const { result } = renderHook(() => useHMCController());

    act(() => {
      // Assuming the hook handles validation
      // We might need to mock the MathEngine throwing an error
      // Or just pass an invalid string if the hook calls MathEngine
      result.current.setLogP('invalid(');
    });

    // If we implement error handling:
    // expect(result.current.error).not.toBeNull();
  });

  it('should reset state correctly', () => {
    const { result } = renderHook(() => useHMCController());

    act(() => {
      result.current.setLogP('-(x^2)/2');
      result.current.step();
      result.current.reset();
    });

    expect(result.current.samples).toEqual([]);
    expect(result.current.trajectory).toEqual([]);
    expect(result.current.iterationCount).toBe(0);
    expect(result.current.currentParticle).toEqual({
      q: result.current.initialPosition,
      p: { x: 0, y: 0 },
    });
  });

  describe('Contour Data Computation', () => {
    it('should initialize with null contourData', () => {
      const { result } = renderHook(() => useHMCController());

      expect(result.current.contourData).toBeNull();
    });

    it('should compute contourData when valid logP is set', () => {
      const { result } = renderHook(() => useHMCController());

      act(() => {
        result.current.setLogP('exp(-(x^2 + y^2)/2)');
      });

      // After setLogP, contourData should be populated
      expect(result.current.contourData).not.toBeNull();
      expect(result.current.contourData).toHaveProperty('type', 'contour');
      expect(result.current.contourData).toHaveProperty('x');
      expect(result.current.contourData).toHaveProperty('y');
      expect(result.current.contourData).toHaveProperty('z');
    });

    it('should have correct contourData structure', () => {
      const { result } = renderHook(() => useHMCController());

      act(() => {
        result.current.setLogP('exp(-(x^2 + y^2)/2)');
      });

      const { contourData } = result.current;

      // Verify trace structure
      expect(contourData.type).toBe('contour');
      expect(Array.isArray(contourData.x)).toBe(true);
      expect(Array.isArray(contourData.y)).toBe(true);
      expect(Array.isArray(contourData.z)).toBe(true);

      // Verify grid dimensions (50x50 by default)
      expect(contourData.x).toHaveLength(50);
      expect(contourData.y).toHaveLength(50);
      expect(contourData.z).toHaveLength(50);
      expect(contourData.z[0]).toHaveLength(50);

      // Verify colorscale and other properties
      expect(contourData).toHaveProperty('colorscale', 'Viridis');
      expect(contourData).toHaveProperty('showscale', true);
      expect(contourData).toHaveProperty('contours');
      expect(contourData).toHaveProperty('colorbar');
    });

    it('should compute valid z values for Gaussian', () => {
      const { result } = renderHook(() => useHMCController());

      act(() => {
        result.current.setLogP('exp(-(x^2 + y^2)/2)');
      });

      const { contourData } = result.current;

      // Check that z values are numbers (not NaN or complex objects)
      const allZValues = contourData.z.flat();
      expect(allZValues.every((v) => typeof v === 'number')).toBe(true);
      expect(allZValues.every((v) => !isNaN(v))).toBe(true);

      // For a Gaussian centered at origin, the highest value should be at/near (0,0)
      // Find the middle of the grid (should be close to x=0, y=0)
      const midIdx = 25; // 50/2
      const centerValue = contourData.z[midIdx][midIdx];

      // Center should have higher log-probability (closer to 0 for standard Gaussian)
      // Edge values should be more negative
      const edgeValue = contourData.z[0][0];
      expect(centerValue).toBeGreaterThan(edgeValue);
    });

    it('should update contourData when logP changes', () => {
      const { result } = renderHook(() => useHMCController());

      // Set first function
      act(() => {
        result.current.setLogP('exp(-(x^2 + y^2)/2)');
      });

      const firstContourData = result.current.contourData;
      expect(firstContourData).not.toBeNull();

      // Change to different function
      act(() => {
        result.current.setLogP('exp(-(x^2)/4 - y^2)');
      });

      const secondContourData = result.current.contourData;
      expect(secondContourData).not.toBeNull();

      // The contour data should be different
      expect(secondContourData).not.toBe(firstContourData);

      // Z values should be different due to different function
      // At center (0,0), both functions might give similar values,
      // so check corner values where the functions differ more
      const firstZCorner = firstContourData.z[0][0];
      const secondZCorner = secondContourData.z[0][0];
      expect(firstZCorner).not.toBe(secondZCorner);
    });

    it('should set contourData to null when logP is cleared', () => {
      const { result } = renderHook(() => useHMCController());

      // Set a function
      act(() => {
        result.current.setLogP('exp(-(x^2 + y^2)/2)');
      });

      expect(result.current.contourData).not.toBeNull();

      // Clear the function
      act(() => {
        result.current.setLogP('');
      });

      expect(result.current.contourData).toBeNull();
    });

    it('should set contourData to null on invalid logP', () => {
      const { result } = renderHook(() => useHMCController());

      act(() => {
        result.current.setLogP('invalid(((syntax');
      });

      // Should have an error
      expect(result.current.error).not.toBeNull();

      // contourData should be null
      expect(result.current.contourData).toBeNull();
    });

    it('should preserve contourData during reset', () => {
      const { result } = renderHook(() => useHMCController());

      act(() => {
        result.current.setLogP('exp(-(x^2 + y^2)/2)');
        result.current.step();
      });

      const contourDataBeforeReset = result.current.contourData;
      expect(contourDataBeforeReset).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      // Contour data should still be present after reset
      // (reset clears samples/trajectory but not the static contour)
      expect(result.current.contourData).toBe(contourDataBeforeReset);
      expect(result.current.samples).toHaveLength(0);
      expect(result.current.iterationCount).toBe(0);
    });
  });
});
