import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useHMCController from '../../src/hooks/useHMCController';

// Mock the HMC sampler functions
vi.mock('../../src/utils/hmcSampler', () => ({
  hmcStep: vi.fn(),
  leapfrogStep: vi.fn(),
  generateProposal: vi.fn(),
}));

import { hmcStep } from '../../src/utils/hmcSampler';

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
    vi.mocked(hmcStep).mockImplementation(() => ({
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
    expect(hmcStep).toHaveBeenCalledTimes(5);

    // Verify that iteration count is 5
    expect(result.current.iterationCount).toBe(5);

    // Verify that samples array has 5 entries
    expect(result.current.samples).toHaveLength(5);

    // Verify trajectory is single trajectory (latest one), not accumulated
    // Since we're in single trajectory mode, trajectory should be from the last step
    expect(Array.isArray(result.current.trajectory)).toBe(true);
    // The trajectory should be from the last step's result (which has 1 point: {x: 4, y: 4})
    expect(result.current.trajectory.length).toBeGreaterThan(0);

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

    // Mock hmcStep for this test
    vi.mocked(hmcStep).mockReturnValue({
      q: { x: 1, y: 1 },
      p: { x: 0, y: 0 },
      accepted: true,
      trajectory: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    });

    act(() => {
      result.current.step();
    });

    expect(result.current.iterationCount).toBe(1);
    expect(result.current.samples.length).toBe(1);
    expect(result.current.trajectory.length).toBe(2);
  });

  it('should update plot data (samples, trajectory) after each step', () => {
    const { result } = renderHook(() => useHMCController());

    act(() => {
      result.current.setLogP('-(x^2)/2');
      result.current.setInitialPosition({ x: 0, y: 0 });
    });

    // Mock hmcStep
    vi.mocked(hmcStep).mockReturnValue({
      q: { x: 1, y: 1 },
      p: { x: 0, y: 0 },
      accepted: true,
      trajectory: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    });

    act(() => {
      result.current.step();
    });

    expect(result.current.samples).toHaveLength(1);
    expect(result.current.trajectory).toHaveLength(2);
    expect(result.current.currentParticle).not.toBeNull();

    act(() => {
      result.current.step();
    });

    expect(result.current.samples).toHaveLength(2);
    // In single trajectory mode, trajectory is replaced, not accumulated
    // So trajectory length should not be 2, but should be > 0 (the latest trajectory)
    expect(result.current.trajectory.length).toBeGreaterThan(0);
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
      expect(contourData).toHaveProperty('colorscale', 'YlGnBu');
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

  describe('Trajectory State Management', () => {
    it('should populate trajectory state when step is executed', async () => {
      const { result } = renderHook(() => useHMCController());

      // Setup
      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.setInitialPosition({ x: 0, y: 0 });
        result.current.setParams({ epsilon: 0.1, L: 10 });
      });

      // Mock step to return a trajectory with L points
      vi.mocked(hmcStep).mockReturnValue({
        q: { x: 1, y: 1 },
        p: { x: 0.5, y: 0.5 },
        accepted: true,
        trajectory: [
          { x: 0, y: 0 },
          { x: 0.1, y: 0.1 },
          { x: 0.2, y: 0.2 },
        ],
      });

      // Execute step
      act(() => {
        result.current.step();
      });

      // Wait for step to complete
      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 1000 }
      );

      // Verify trajectory is populated
      expect(result.current.trajectory).not.toEqual([]);
      expect(Array.isArray(result.current.trajectory)).toBe(true);
      expect(result.current.trajectory.length).toBe(3);
      expect(result.current.trajectory[0]).toEqual({ x: 0, y: 0 });
      expect(result.current.trajectory[1]).toEqual({ x: 0.1, y: 0.1 });
      expect(result.current.trajectory[2]).toEqual({ x: 0.2, y: 0.2 });
    });

    it('should use single trajectory mode (replace, not accumulate)', async () => {
      const { result } = renderHook(() => useHMCController());

      // Setup
      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.setInitialPosition({ x: 0, y: 0 });
      });

      // First step - returns trajectory A
      vi.mocked(hmcStep).mockReturnValueOnce({
        q: { x: 1, y: 1 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [
          { x: 0, y: 0 },
          { x: 0.5, y: 0.5 },
          { x: 1, y: 1 },
        ],
      });

      act(() => {
        result.current.step();
      });

      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 1000 }
      );

      const firstTrajectory = result.current.trajectory;
      expect(firstTrajectory.length).toBe(3);
      expect(firstTrajectory[0]).toEqual({ x: 0, y: 0 });

      // Second step - returns trajectory B (different)
      vi.mocked(hmcStep).mockReturnValueOnce({
        q: { x: 2, y: 2 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [
          { x: 1, y: 1 },
          { x: 1.5, y: 1.5 },
          { x: 2, y: 2 },
        ],
      });

      act(() => {
        result.current.step();
      });

      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 1000 }
      );

      const secondTrajectory = result.current.trajectory;

      // Verify single trajectory mode: trajectory is replaced, not accumulated
      expect(secondTrajectory.length).toBe(3);
      expect(secondTrajectory[0]).toEqual({ x: 1, y: 1 });
      expect(secondTrajectory[2]).toEqual({ x: 2, y: 2 });

      // Verify it's not an array of arrays
      expect(Array.isArray(secondTrajectory[0])).toBe(false);
      expect(secondTrajectory[0]).toHaveProperty('x');
      expect(secondTrajectory[0]).toHaveProperty('y');
    });

    it('should clear trajectory on reset', async () => {
      const { result } = renderHook(() => useHMCController());

      // Setup and execute step
      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.setInitialPosition({ x: 0, y: 0 });
      });

      vi.mocked(hmcStep).mockReturnValue({
        q: { x: 1, y: 1 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      });

      act(() => {
        result.current.step();
      });

      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 1000 }
      );

      // Verify trajectory is populated
      expect(result.current.trajectory.length).toBeGreaterThan(0);

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify trajectory is cleared
      expect(result.current.trajectory).toEqual([]);
    });

    it('should show trajectory even for rejected steps but not save sample', async () => {
      const { result } = renderHook(() => useHMCController());

      // Setup
      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.setInitialPosition({ x: 0, y: 0 });
      });

      // Mock rejected step (returns trajectory but not accepted)
      vi.mocked(hmcStep).mockReturnValue({
        q: { x: 0, y: 0 }, // Position unchanged
        p: { x: 0, y: 0 },
        accepted: false,
        trajectory: [
          { x: 0, y: 0 },
          { x: 0.5, y: 0.5 },
        ], // Trajectory still returned for visualization
      });

      act(() => {
        result.current.step();
      });

      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 1000 }
      );

      // Verify trajectory is shown (not empty)
      expect(result.current.trajectory.length).toBeGreaterThan(0);
      expect(result.current.trajectory).toEqual([
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 },
      ]);

      // Verify sample was NOT added (rejected step)
      expect(result.current.samples.length).toBe(0);
    });

    it('should clear trajectory when logP function changes', async () => {
      const { result } = renderHook(() => useHMCController());

      // Setup and execute step
      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.setInitialPosition({ x: 0, y: 0 });
      });

      vi.mocked(hmcStep).mockReturnValue({
        q: { x: 1, y: 1 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      });

      act(() => {
        result.current.step();
      });

      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 1000 }
      );

      // Verify trajectory is populated
      expect(result.current.trajectory.length).toBeGreaterThan(0);

      // Change logP function
      act(() => {
        result.current.setLogP('-(x^2)/2 - y^2');
      });

      // Verify trajectory is cleared (setLogP calls reset)
      expect(result.current.trajectory).toEqual([]);
      expect(result.current.samples).toEqual([]);
      expect(result.current.iterationCount).toBe(0);
    });
  });

  describe('Accepted/Rejected Samples Tracking', () => {
    it('should track rejected samples correctly', async () => {
      const { result } = renderHook(() => useHMCController());

      // Setup
      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.setInitialPosition({ x: 0, y: 0 });
      });

      // Mock rejected step
      vi.mocked(hmcStep).mockReturnValue({
        q: { x: 0, y: 0 },
        p: { x: 0, y: 0 },
        accepted: false,
        trajectory: [
          { x: 0, y: 0 },
          { x: 0.5, y: 0.5 },
        ],
      });

      // Execute step
      act(() => {
        result.current.step();
      });

      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 1000 }
      );

      // Verify rejectedCount incremented
      expect(result.current.rejectedCount).toBe(1);
      // Verify acceptedCount (samples length) did not increment
      expect(result.current.acceptedCount).toBe(0);
      expect(result.current.samples).toHaveLength(0);

      // Execute another step (accepted this time)
      vi.mocked(hmcStep).mockReturnValue({
        q: { x: 1, y: 1 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      });

      act(() => {
        result.current.step();
      });

      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 1000 }
      );

      // Verify counts
      expect(result.current.rejectedCount).toBe(1);
      expect(result.current.acceptedCount).toBe(1);
      expect(result.current.samples).toHaveLength(1);

      // Verify reset clears counts
      act(() => {
        result.current.reset();
      });

      expect(result.current.rejectedCount).toBe(0);
      expect(result.current.acceptedCount).toBe(0);
    });
  });

  describe('Seeded RNG Integration', () => {
    it('should initialize with null seed (unseeded mode)', () => {
      const { result } = renderHook(() => useHMCController());

      expect(result.current.seed).toBeNull();
      expect(result.current.useSeededMode).toBe(false);
    });

    it('should set seed and enable seeded mode', () => {
      const { result } = renderHook(() => useHMCController());

      act(() => {
        result.current.setSeed(42);
      });

      expect(result.current.seed).toBe(42);
      expect(result.current.useSeededMode).toBe(true);
    });

    it('should disable seeded mode when seed is set to null', () => {
      const { result } = renderHook(() => useHMCController());

      act(() => {
        result.current.setSeed(42);
      });

      expect(result.current.useSeededMode).toBe(true);

      act(() => {
        result.current.setSeed(null);
      });

      expect(result.current.seed).toBeNull();
      expect(result.current.useSeededMode).toBe(false);
    });

    it('should update seed when changed', () => {
      const { result } = renderHook(() => useHMCController());

      act(() => {
        result.current.setSeed(42);
      });

      expect(result.current.seed).toBe(42);

      act(() => {
        result.current.setSeed(100);
      });

      expect(result.current.seed).toBe(100);
    });

    it('should preserve seed after reset', () => {
      const { result } = renderHook(() => useHMCController());

      act(() => {
        result.current.setLogP('-(x^2)/2');
        result.current.setSeed(42);
      });

      // Mock hmcStep to return accepted samples
      vi.mocked(hmcStep).mockReturnValue({
        q: { x: 1, y: 1 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [{ x: 1, y: 1 }],
      });

      act(() => {
        result.current.sampleSteps(1);
      });

      // Wait for step to complete
      act(() => {
        result.current.reset();
      });

      expect(result.current.seed).toBe(42);
      expect(result.current.useSeededMode).toBe(true);
    });

    it('should reset RNG state after reset to produce same sequence', async () => {
      const { result } = renderHook(() => useHMCController());

      act(() => {
        result.current.setLogP('-(x^2)/2');
        result.current.setSeed(42);
      });

      // Clear previous mocks
      vi.mocked(hmcStep).mockClear();

      // Mock hmcStep to capture RNG calls
      const rngCallsFirstRun = [];
      const rngCallsSecondRun = [];

      vi.mocked(hmcStep).mockImplementation(
        (_q, _epsilon, _L, _U, _gradU, rng) => {
          if (rng) {
            // Capture some random values to verify sequence
            rngCallsFirstRun.push(rng.random());
          }
          return {
            q: { x: 1, y: 1 },
            p: { x: 0, y: 0 },
            accepted: true,
            trajectory: [{ x: 1, y: 1 }],
          };
        }
      );

      // First run: 3 steps
      act(() => {
        result.current.sampleSteps(3);
      });

      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 1000 }
      );

      // Reset
      act(() => {
        result.current.reset();
      });

      // Second run: 3 steps with same seed
      vi.mocked(hmcStep).mockImplementation(
        (_q, _epsilon, _L, _U, _gradU, rng) => {
          if (rng) {
            rngCallsSecondRun.push(rng.random());
          }
          return {
            q: { x: 1, y: 1 },
            p: { x: 0, y: 0 },
            accepted: true,
            trajectory: [{ x: 1, y: 1 }],
          };
        }
      );

      act(() => {
        result.current.sampleSteps(3);
      });

      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 1000 }
      );

      // Verify that the RNG produced the same sequence
      expect(rngCallsFirstRun.length).toBeGreaterThan(0);
      expect(rngCallsSecondRun.length).toBeGreaterThan(0);
      expect(rngCallsFirstRun).toEqual(rngCallsSecondRun);
    });

    it('should pass RNG to hmcStep when seeded mode is enabled', async () => {
      const { result } = renderHook(() => useHMCController());

      act(() => {
        result.current.setLogP('-(x^2)/2');
        result.current.setSeed(42);
      });

      vi.mocked(hmcStep).mockReturnValue({
        q: { x: 1, y: 1 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [{ x: 1, y: 1 }],
      });

      act(() => {
        result.current.sampleSteps(1);
      });

      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 1000 }
      );

      // Verify hmcStep was called with 6 arguments (including rng)
      expect(hmcStep).toHaveBeenCalled();
      const lastCall = vi.mocked(hmcStep).mock.calls[0];
      expect(lastCall).toHaveLength(6); // q, epsilon, L, U, gradU, rng
      expect(lastCall[5]).toBeDefined(); // rng parameter should be defined
    });

    it('should not pass RNG to hmcStep when unseeded mode', async () => {
      const { result } = renderHook(() => useHMCController());

      act(() => {
        result.current.setLogP('-(x^2)/2');
        // Don't set seed - should remain in unseeded mode
      });

      vi.mocked(hmcStep).mockReturnValue({
        q: { x: 1, y: 1 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [{ x: 1, y: 1 }],
      });

      act(() => {
        result.current.sampleSteps(1);
      });

      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 1000 }
      );

      // Verify hmcStep was called with 5 arguments (no rng)
      expect(hmcStep).toHaveBeenCalled();
      const lastCall = vi.mocked(hmcStep).mock.calls[0];
      // In unseeded mode, we should pass null or undefined as rng
      expect(lastCall[5]).toBeNull();
    });

    it('should toggle seeded mode on/off', () => {
      const { result } = renderHook(() => useHMCController());

      // Enable seeded mode
      act(() => {
        result.current.setSeed(42);
      });

      expect(result.current.useSeededMode).toBe(true);

      // Disable seeded mode
      act(() => {
        result.current.setUseSeededMode(false);
      });

      expect(result.current.useSeededMode).toBe(false);

      // Enable again
      act(() => {
        result.current.setUseSeededMode(true);
      });

      expect(result.current.useSeededMode).toBe(true);
    });
  });
});
