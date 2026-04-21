import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useSamplingController, {
  allChainsCompatible,
} from '../../src/hooks/useSamplingController';
import { HMCSampler } from '../../src/samplers/HMCSampler';
import { GibbsSampler } from '../../src/samplers/GibbsSampler';
import { createContourTrace } from '../../src/utils/plotFunctions';

// Mock plotFunctions
vi.mock('../../src/utils/plotFunctions', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createContourTrace: vi.fn(actual.createContourTrace),
  };
});

// Mock the HMCSampler class
vi.mock('../../src/samplers/HMCSampler', () => {
  const HMCSamplerMock = vi.fn();
  HMCSamplerMock.prototype.setParams = vi.fn();
  HMCSamplerMock.prototype.setSeed = vi.fn();
  HMCSamplerMock.prototype.step = vi.fn();
  return { HMCSampler: HMCSamplerMock };
});

// Mock the GibbsSampler class
vi.mock('../../src/samplers/GibbsSampler', () => {
  const GibbsSamplerMock = vi.fn();
  GibbsSamplerMock.prototype.setParams = vi.fn();
  GibbsSamplerMock.prototype.setSeed = vi.fn();
  GibbsSamplerMock.prototype.step = vi.fn();
  return { GibbsSampler: GibbsSamplerMock };
});

describe('useSamplingController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock implementation for each test
    HMCSampler.prototype.step.mockReturnValue({
      q: { x: 0, y: 0 },
      p: { x: 0, y: 0 },
      accepted: true,
      trajectory: [{ x: 0, y: 0 }],
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useSamplingController());

    expect(result.current.logP).toBe('');
    expect(result.current.chains[0].params).toEqual({
      epsilon: 0.1,
      L: 10,
      steps: 1,
    });
    expect(result.current.chains[0].samples).toEqual([]);
    expect(result.current.chains[0].trajectory).toEqual([]);
    expect(result.current.chains[0].currentParticle).toBeNull();
    expect(result.current.isRunning).toBe(false);
    expect(result.current.iterationCount).toBe(0);
    expect(result.current.error).toBeNull();

    // Check if HMCSampler was instantiated
    expect(HMCSampler).toHaveBeenCalled();
  });

  it('should update logP and reset state', () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setLogP('-(x^2)/2');
    });

    expect(result.current.logP).toBe('-(x^2)/2');
    expect(result.current.chains[0].samples).toEqual([]);
    expect(result.current.iterationCount).toBe(0);
  });

  it('should update parameters', () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setChainConfig(0, {
        params: { epsilon: 0.05, L: 20, steps: 5 },
      });
    });

    expect(result.current.chains[0].params).toEqual({
      epsilon: 0.05,
      L: 20,
      steps: 5,
    });
    // Should update sampler params
    expect(HMCSampler.prototype.setParams).toHaveBeenCalledWith({
      epsilon: 0.05,
      L: 20,
      steps: 5,
    });
  });

  it('should sample N steps', async () => {
    const { result } = renderHook(() => useSamplingController());

    // Setup initial state
    act(() => {
      result.current.setLogP('-(x^2)/2');
      result.current.setChainConfig(0, { initialPosition: { x: 0, y: 0 } });
      result.current.setChainConfig(0, { params: { epsilon: 0.1, L: 10 } });
    });

    // Mock step return - each call returns a different position
    let callCount = 0;
    HMCSampler.prototype.step.mockImplementation(() => {
      const val = callCount++;
      return {
        q: { x: val, y: val },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [{ x: val, y: val }],
      };
    });

    // Call sampleSteps with N=5
    act(() => {
      result.current.sampleSteps(5);
    });

    // Wait for all 5 steps to complete
    await waitFor(
      () => {
        expect(result.current.isRunning).toBe(false);
      },
      { timeout: 1000 }
    );

    // Verify that step was called 5 times
    expect(HMCSampler.prototype.step).toHaveBeenCalledTimes(5);

    // Verify that iteration count is 5
    expect(result.current.iterationCount).toBe(5);

    // Verify that samples array has 5 entries
    expect(result.current.chains[0].samples).toHaveLength(5);

    // Verify samples
    expect(result.current.chains[0].samples[0]).toEqual({ x: 0, y: 0 });
    expect(result.current.chains[0].samples[4]).toEqual({ x: 4, y: 4 });
  });

  it('should perform a step and update state', () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setLogP('-(x^2)/2');
      result.current.setChainConfig(0, { initialPosition: { x: 0, y: 0 } });
    });

    // Mock step return
    HMCSampler.prototype.step.mockReturnValueOnce({
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
    expect(result.current.chains[0].samples.length).toBe(1);
    expect(result.current.chains[0].trajectory.length).toBe(2);
  });

  it('should update plot data (samples, trajectory) after each step', () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setLogP('-(x^2)/2');
      result.current.setChainConfig(0, { initialPosition: { x: 0, y: 0 } });
    });

    // Mock step
    HMCSampler.prototype.step.mockReturnValue({
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

    expect(result.current.chains[0].samples).toHaveLength(1);
    expect(result.current.chains[0].trajectory).toHaveLength(2);
    expect(result.current.chains[0].currentParticle).not.toBeNull();

    act(() => {
      result.current.step();
    });

    expect(result.current.chains[0].samples).toHaveLength(2);
    // In single trajectory mode, trajectory is replaced, not accumulated
    expect(result.current.chains[0].trajectory.length).toBeGreaterThan(0);
  });

  it('should handle errors in logP parsing', () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setLogP('invalid(');
    });
  });

  it('should reset state correctly', () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setLogP('-(x^2)/2');
      result.current.step();
      result.current.reset();
    });

    expect(result.current.chains[0].samples).toEqual([]);
    expect(result.current.chains[0].trajectory).toEqual([]);
    expect(result.current.iterationCount).toBe(0);
    expect(result.current.chains[0].currentParticle).toEqual({
      q: result.current.chains[0].initialPosition,
      p: { x: 0, y: 0 },
    });
  });

  describe('Contour Data Computation', () => {
    it('should initialize with null contourData', () => {
      const { result } = renderHook(() => useSamplingController());

      expect(result.current.contourData).toBeNull();
    });

    it('should compute contourData when valid logP is set', () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setLogP('exp(-(x^2 + y^2)/2)');
      });

      // After setLogP, contourData should be populated
      expect(result.current.contourData).not.toBeNull();
      expect(result.current.contourData).toHaveProperty('type', 'contour');
    });

    it('should have correct contourData structure', () => {
      const { result } = renderHook(() => useSamplingController());

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
    });

    it('should compute valid z values for Gaussian', () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setLogP('exp(-(x^2 + y^2)/2)');
      });

      const { contourData } = result.current;

      // Check that z values are numbers (not NaN or complex objects)
      const allZValues = contourData.z.flat();
      expect(allZValues.every((v) => typeof v === 'number')).toBe(true);
      expect(allZValues.every((v) => !isNaN(v))).toBe(true);

      // For a Gaussian centered at origin, the highest value should be at/near (0,0)
      const midIdx = 25;
      const centerValue = contourData.z[midIdx][midIdx];

      const edgeValue = contourData.z[0][0];
      expect(centerValue).toBeGreaterThan(edgeValue);
    });

    it('should update contourData when logP changes', () => {
      const { result } = renderHook(() => useSamplingController());

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
      expect(secondContourData).not.toBe(firstContourData);
    });

    it('should set contourData to null when logP is cleared', () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setLogP('exp(-(x^2 + y^2)/2)');
      });

      expect(result.current.contourData).not.toBeNull();

      act(() => {
        result.current.setLogP('');
      });

      expect(result.current.contourData).toBeNull();
    });

    it('should set contourData to null on invalid logP', () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setLogP('invalid(((syntax');
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.contourData).toBeNull();
    });

    it('should preserve contourData during reset', () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setLogP('exp(-(x^2 + y^2)/2)');
        result.current.step();
      });

      const contourDataBeforeReset = result.current.contourData;
      expect(contourDataBeforeReset).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.contourData).toBe(contourDataBeforeReset);
      expect(result.current.chains[0].samples).toHaveLength(0);
      expect(result.current.iterationCount).toBe(0);
    });
  });

  describe('Trajectory State Management', () => {
    it('should populate trajectory state when step is executed', async () => {
      const { result } = renderHook(() => useSamplingController());

      // Setup
      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.setChainConfig(0, { initialPosition: { x: 0, y: 0 } });
        result.current.setChainConfig(0, { params: { epsilon: 0.1, L: 10 } });
      });

      // Mock step to return a trajectory with L points
      HMCSampler.prototype.step.mockReturnValue({
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
      expect(result.current.chains[0].trajectory).not.toEqual([]);
      expect(Array.isArray(result.current.chains[0].trajectory)).toBe(true);
      expect(result.current.chains[0].trajectory.length).toBe(3);
    });

    it('should use single trajectory mode (replace, not accumulate)', async () => {
      const { result } = renderHook(() => useSamplingController());

      // Setup
      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.setChainConfig(0, { initialPosition: { x: 0, y: 0 } });
      });

      // First step - returns trajectory A
      HMCSampler.prototype.step.mockReturnValueOnce({
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

      const firstTrajectory = result.current.chains[0].trajectory;
      expect(firstTrajectory.length).toBe(3);

      // Second step - returns trajectory B (different)
      HMCSampler.prototype.step.mockReturnValueOnce({
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

      const secondTrajectory = result.current.chains[0].trajectory;

      // Verify single trajectory mode: trajectory is replaced, not accumulated
      expect(secondTrajectory.length).toBe(3);
      expect(secondTrajectory[0]).toEqual({ x: 1, y: 1 });
      expect(secondTrajectory[2]).toEqual({ x: 2, y: 2 });
    });

    it('should clear trajectory on reset', async () => {
      const { result } = renderHook(() => useSamplingController());

      // Setup and execute step
      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.setChainConfig(0, { initialPosition: { x: 0, y: 0 } });
      });

      HMCSampler.prototype.step.mockReturnValue({
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

      expect(result.current.chains[0].trajectory.length).toBeGreaterThan(0);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.chains[0].trajectory).toEqual([]);
    });

    it('should show trajectory even for rejected steps but not save sample', async () => {
      const { result } = renderHook(() => useSamplingController());

      // Setup
      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.setChainConfig(0, { initialPosition: { x: 0, y: 0 } });
      });

      // Mock rejected step (returns trajectory but not accepted)
      HMCSampler.prototype.step.mockReturnValue({
        q: { x: 0, y: 0 }, // Position unchanged
        p: { x: 0, y: 0 },
        accepted: false,
        trajectory: [
          { x: 0, y: 0 },
          { x: 0.5, y: 0.5 },
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

      // Verify trajectory is shown (not empty)
      expect(result.current.chains[0].trajectory.length).toBeGreaterThan(0);

      // Verify sample was NOT added (rejected step)
      expect(result.current.chains[0].samples.length).toBe(0);
    });

    it('should clear trajectory when logP function changes', async () => {
      const { result } = renderHook(() => useSamplingController());

      // Setup and execute step
      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.setChainConfig(0, { initialPosition: { x: 0, y: 0 } });
      });

      HMCSampler.prototype.step.mockReturnValue({
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

      expect(result.current.chains[0].trajectory.length).toBeGreaterThan(0);

      // Change logP function
      act(() => {
        result.current.setLogP('-(x^2)/2 - y^2');
      });

      // Verify trajectory is cleared (setLogP calls reset)
      expect(result.current.chains[0].trajectory).toEqual([]);
      expect(result.current.chains[0].samples).toEqual([]);
    });
  });

  describe('Accepted/Rejected Samples Tracking', () => {
    it('should track rejected samples correctly', async () => {
      const { result } = renderHook(() => useSamplingController());

      // Setup
      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.setChainConfig(0, { initialPosition: { x: 0, y: 0 } });
      });

      // Mock rejected step
      HMCSampler.prototype.step.mockReturnValue({
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
      expect(result.current.chains[0].rejectedCount).toBe(1);
      // Verify acceptedCount (samples length) did not increment
      expect(result.current.chains[0].samples.length).toBe(0);
      expect(result.current.chains[0].samples).toHaveLength(0);

      // Execute another step (accepted this time)
      HMCSampler.prototype.step.mockReturnValue({
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
      expect(result.current.chains[0].rejectedCount).toBe(1);
      expect(result.current.chains[0].samples.length).toBe(1);
      expect(result.current.chains[0].samples).toHaveLength(1);

      // Verify reset clears counts
      act(() => {
        result.current.reset();
      });

      expect(result.current.chains[0].rejectedCount).toBe(0);
      expect(result.current.chains[0].samples.length).toBe(0);
    });
  });

  describe('Seeded RNG Integration', () => {
    it('should initialize with null seed (unseeded mode)', () => {
      const { result } = renderHook(() => useSamplingController());

      expect(result.current.chains[0].seed).toBeNull();
      expect(result.current.chains[0].seed !== null).toBe(false);
    });

    it('should set seed and enable seeded mode', () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setChainConfig(0, { seed: 42 });
      });

      expect(result.current.chains[0].seed).toBe(42);
      expect(result.current.chains[0].seed !== null).toBe(true);
      expect(HMCSampler.prototype.setSeed).toHaveBeenCalledWith(42);
    });

    it('should disable seeded mode when seed is set to null', () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setChainConfig(0, { seed: 42 });
      });

      expect(result.current.chains[0].seed !== null).toBe(true);

      act(() => {
        result.current.setChainConfig(0, { seed: null });
      });

      expect(result.current.chains[0].seed).toBeNull();
      expect(result.current.chains[0].seed !== null).toBe(false);
      expect(HMCSampler.prototype.setSeed).toHaveBeenCalledWith(null);
    });

    it('should update seed when changed', () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setChainConfig(0, { seed: 42 });
      });

      expect(result.current.chains[0].seed).toBe(42);

      act(() => {
        result.current.setChainConfig(0, { seed: 100 });
      });

      expect(result.current.chains[0].seed).toBe(100);
      expect(HMCSampler.prototype.setSeed).toHaveBeenCalledWith(100);
    });

    it('should preserve seed after reset', () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setLogP('-(x^2)/2');
        result.current.setChainConfig(0, { seed: 42 });
      });

      // Mock step
      HMCSampler.prototype.step.mockReturnValue({
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

      expect(result.current.chains[0].seed).toBe(42);
      expect(result.current.chains[0].seed !== null).toBe(true);
      // reset calls setSeed to restore RNG state
      expect(HMCSampler.prototype.setSeed).toHaveBeenCalledWith(42);
    });

    it('should reset RNG state after reset', async () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setLogP('-(x^2)/2');
        result.current.setChainConfig(0, { seed: 42 });
      });

      // Clear mocks
      HMCSampler.prototype.setSeed.mockClear();

      act(() => {
        result.current.reset();
      });

      // reset should call setSeed(42)
      expect(HMCSampler.prototype.setSeed).toHaveBeenCalledWith(42);
    });

    it('should reset RNG state after reset to produce same sequence', async () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setLogP('-(x^2)/2');
        result.current.setChainConfig(0, { seed: 42 });
      });

      HMCSampler.prototype.step.mockImplementation(() => {
        // We can't test if the 'randomness' is identical between runs
        //  because we removed the randomness by mocking the sampler.
        // The mock returns the same thing no matter what the seed is. We just check
        // that setSeed was called with the correct seed and test sampler behavior with seed
        // separatly.
        return {
          q: { x: 1, y: 1 },
          p: { x: 0, y: 0 },
          accepted: true,
          trajectory: [{ x: 1, y: 1 }],
        };
      });

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

      // Verify setSeed called
      expect(HMCSampler.prototype.setSeed).toHaveBeenCalledWith(42);

      // Second run
      act(() => {
        result.current.sampleSteps(3);
      });

      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 1000 }
      );

      // We can't really compare "rng outputs" because we control the outputs via mock.
      // So I will just verify the interactions flow correctly.
    });

    it('should toggle seeded mode on/off', () => {
      const { result } = renderHook(() => useSamplingController());

      // Enable seeded mode
      act(() => {
        result.current.setChainConfig(0, { seed: 42 });
      });

      expect(result.current.chains[0].seed !== null).toBe(true);

      // Disable seeded mode (via setSeed(null))
      act(() => {
        result.current.setChainConfig(0, { seed: null });
      });

      expect(result.current.chains[0].seed !== null).toBe(false);

      // Enable again
      act(() => {
        result.current.setChainConfig(0, { seed: 42 });
      });

      expect(result.current.chains[0].seed !== null).toBe(true);
    });

    describe('Error Handling', () => {
      it('should handle error during step execution', async () => {
        const { result } = renderHook(() => useSamplingController());

        act(() => {
          result.current.setLogP('-(x^2)/2');
          result.current.setChainConfig(0, { initialPosition: { x: 0, y: 0 } });
        });

        // Mock step to throw an exception
        HMCSampler.prototype.step.mockImplementation(() => {
          throw new Error('Step execution failed');
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

        // Per-chain errors are now captured in chain.error, not the global error field
        expect(result.current.chains[0].error).toBe('Step execution failed');
        expect(result.current.error).toBeNull();
        expect(result.current.isRunning).toBe(false);
      });

      it('should handle sampleSteps with null logP', async () => {
        const { result } = renderHook(() => useSamplingController());

        // Don't set logP - logpInstanceRef.current will be null
        act(() => {
          result.current.sampleSteps(5);
        });

        // Should return early and set isRunning to false
        await waitFor(
          () => {
            expect(result.current.isRunning).toBe(false);
          },
          { timeout: 500 }
        );

        // Step should not have been called
        expect(HMCSampler.prototype.step).not.toHaveBeenCalled();
        expect(result.current.chains[0].samples).toHaveLength(0);
        expect(result.current.iterationCount).toBe(0);
      });

      it('should handle contour computation error gracefully', () => {
        const { result } = renderHook(() => useSamplingController());

        // Mock console.error to suppress error output during test
        const consoleErrorSpy = vi
          .spyOn(console, 'error')
          .mockImplementation(() => {});

        // Set a logP - doesn't matter what it is as we'll mock the failure
        // Mock createContourTrace to throw an error
        createContourTrace.mockImplementationOnce(() => {
          throw new Error('Contour generation failed');
        });

        act(() => {
          result.current.setLogP('-(x^2 + y^2)/2');
        });

        // Verify that the error was caught and logged
        // The hook logic catches the error, logs it, and sets contourData to null
        // It intentionally does NOT set result.current.error (which is for parsing errors)
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error computing contour:',
          expect.any(Error)
        );
        expect(result.current.contourData).toBeNull();
        expect(result.current.error).toBeNull();

        consoleErrorSpy.mockRestore();
      });

      it('should handle grid point evaluation failures with NaN', () => {
        const { result } = renderHook(() => useSamplingController());

        // This test verifies that the try-catch in computeContour handles failures gracefully
        // Use a function that might have undefined regions
        act(() => {
          result.current.setLogP('1/x');
        });

        // Contour should still be computed even though 1/x has singularity at x=0
        // The grid evaluation try-catch should handle any errors
        expect(result.current.contourData).not.toBeNull();
        expect(result.current.error).toBeNull();
      });
    });

    describe('Edge Cases', () => {
      it('should handle partial parameter update (epsilon only)', () => {
        const { result } = renderHook(() => useSamplingController());

        // Set initial params
        act(() => {
          result.current.setChainConfig(0, {
            params: { epsilon: 0.1, L: 10, steps: 1 },
          });
        });

        // Clear mock calls
        HMCSampler.prototype.setParams.mockClear();

        // Update only epsilon
        act(() => {
          result.current.setChainConfig(0, { params: { epsilon: 0.05 } });
        });

        expect(result.current.chains[0].params.epsilon).toBe(0.05);
        expect(result.current.chains[0].params.L).toBe(10);
        expect(result.current.chains[0].params.steps).toBe(1);

        // Sampler should be updated with new epsilon and existing L
        expect(HMCSampler.prototype.setParams).toHaveBeenCalledWith({
          epsilon: 0.05,
          L: 10,
          steps: 1,
        });
      });

      it('should handle partial parameter update (L only)', () => {
        const { result } = renderHook(() => useSamplingController());

        // Set initial params
        act(() => {
          result.current.setChainConfig(0, {
            params: { epsilon: 0.1, L: 10, steps: 1 },
          });
        });

        // Clear mock calls
        HMCSampler.prototype.setParams.mockClear();

        // Update only L
        act(() => {
          result.current.setChainConfig(0, { params: { L: 20 } });
        });

        expect(result.current.chains[0].params.epsilon).toBe(0.1);
        expect(result.current.chains[0].params.L).toBe(20);
        expect(result.current.chains[0].params.steps).toBe(1);

        // Sampler should be updated with existing epsilon and new L
        expect(HMCSampler.prototype.setParams).toHaveBeenCalledWith({
          epsilon: 0.1,
          L: 20,
          steps: 1,
        });
      });

      it('should handle partial parameter update (steps only)', () => {
        const { result } = renderHook(() => useSamplingController());

        // Set initial params
        act(() => {
          result.current.setChainConfig(0, {
            params: { epsilon: 0.1, L: 10, steps: 1 },
          });
        });

        // Clear mock calls
        HMCSampler.prototype.setParams.mockClear();

        // Update only steps
        act(() => {
          result.current.setChainConfig(0, { params: { steps: 5 } });
        });

        expect(result.current.chains[0].params.epsilon).toBe(0.1);
        expect(result.current.chains[0].params.L).toBe(10);
        expect(result.current.chains[0].params.steps).toBe(5);

        // Sampler should NOT be updated (steps doesn't affect sampler)
        // The useEffect only triggers on epsilon or L changes
        expect(HMCSampler.prototype.setParams).not.toHaveBeenCalled();
      });

      it('should handle initial position changes', () => {
        const { result } = renderHook(() => useSamplingController());

        act(() => {
          result.current.setLogP('-(x^2 + y^2)/2');
          result.current.setChainConfig(0, {
            initialPosition: { x: 5, y: -3 },
          });
        });

        expect(result.current.chains[0].initialPosition).toEqual({
          x: 5,
          y: -3,
        });

        // Reset should use new initial position
        act(() => {
          result.current.reset();
        });

        expect(result.current.chains[0].currentParticle).toEqual({
          q: { x: 5, y: -3 },
          p: { x: 0, y: 0 },
        });
      });

      it('should handle particle momentum fallback when p is undefined', async () => {
        const { result } = renderHook(() => useSamplingController());

        act(() => {
          result.current.setLogP('-(x^2)/2');
          result.current.setChainConfig(0, { initialPosition: { x: 0, y: 0 } });
        });

        // Mock step to return result without p (undefined)
        HMCSampler.prototype.step.mockReturnValue({
          q: { x: 1, y: 1 },
          p: undefined,
          accepted: true,
          trajectory: [{ x: 1, y: 1 }],
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

        // Verify momentum defaults to { x: 0, y: 0 }
        expect(result.current.chains[0].currentParticle.p).toEqual({
          x: 0,
          y: 0,
        });
      });

      it('should handle edge case of manual initial position reset', async () => {
        const { result } = renderHook(() => useSamplingController());

        // This test verifies that changing initialPosition and then calling reset works correctly
        act(() => {
          result.current.setLogP('-(x^2)/2');
        });

        // Now change initial position
        act(() => {
          result.current.setChainConfig(0, { initialPosition: { x: 3, y: 4 } });
        });

        // Call reset manually
        act(() => {
          result.current.reset();
        });

        // Now currentParticle should be at the new initial position
        expect(result.current.chains[0].currentParticle).not.toBeNull();
        expect(result.current.chains[0].currentParticle.q).toEqual({
          x: 3,
          y: 4,
        });
        expect(result.current.chains[0].currentParticle.p).toEqual({
          x: 0,
          y: 0,
        });
      });

      it('should not call setSeed on reset when seeded mode is disabled', () => {
        const { result } = renderHook(() => useSamplingController());

        act(() => {
          result.current.setLogP('-(x^2)/2');
        });

        // Don't set seed - useSeededMode should be false
        expect(result.current.chains[0].seed !== null).toBe(false);

        // Clear mock
        HMCSampler.prototype.setSeed.mockClear();

        act(() => {
          result.current.reset();
        });

        // setSeed should NOT have been called
        expect(HMCSampler.prototype.setSeed).not.toHaveBeenCalled();
      });

      it('should handle non-zero initial positions correctly', async () => {
        const { result } = renderHook(() => useSamplingController());

        act(() => {
          result.current.setLogP('-(x^2 + y^2)/2');
          result.current.setChainConfig(0, {
            initialPosition: { x: 10, y: -5 },
          });
        });

        HMCSampler.prototype.step.mockReturnValue({
          q: { x: 10.1, y: -4.9 },
          p: { x: 0.1, y: -0.1 },
          accepted: true,
          trajectory: [
            { x: 10, y: -5 },
            { x: 10.1, y: -4.9 },
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

        expect(result.current.chains[0].samples).toHaveLength(1);
        expect(result.current.chains[0].samples[0]).toEqual({
          x: 10.1,
          y: -4.9,
        });

        // Reset should restore to non-zero initial position
        act(() => {
          result.current.reset();
        });

        expect(result.current.chains[0].currentParticle.q).toEqual({
          x: 10,
          y: -5,
        });
      });

      it('should track mixed accept/reject sequence correctly', async () => {
        const { result } = renderHook(() => useSamplingController());

        act(() => {
          result.current.setLogP('-(x^2 + y^2)/2');
          result.current.setChainConfig(0, { initialPosition: { x: 0, y: 0 } });
        });

        // Sequence: accept -> reject -> accept -> reject -> accept
        const mockSequence = [
          {
            q: { x: 1, y: 1 },
            p: { x: 0, y: 0 },
            accepted: true,
            trajectory: [{ x: 1, y: 1 }],
          },
          {
            q: { x: 1, y: 1 },
            p: { x: 0, y: 0 },
            accepted: false,
            trajectory: [{ x: 1.5, y: 1.5 }],
          },
          {
            q: { x: 2, y: 2 },
            p: { x: 0, y: 0 },
            accepted: true,
            trajectory: [{ x: 2, y: 2 }],
          },
          {
            q: { x: 2, y: 2 },
            p: { x: 0, y: 0 },
            accepted: false,
            trajectory: [{ x: 2.5, y: 2.5 }],
          },
          {
            q: { x: 3, y: 3 },
            p: { x: 0, y: 0 },
            accepted: true,
            trajectory: [{ x: 3, y: 3 }],
          },
        ];

        let callIndex = 0;
        HMCSampler.prototype.step.mockImplementation(
          () => mockSequence[callIndex++]
        );

        act(() => {
          result.current.sampleSteps(5);
        });

        await waitFor(
          () => {
            expect(result.current.isRunning).toBe(false);
          },
          { timeout: 1000 }
        );

        // Verify counts: 3 accepted, 2 rejected, 5 total iterations
        expect(result.current.chains[0].samples.length).toBe(3);
        expect(result.current.chains[0].rejectedCount).toBe(2);
        expect(result.current.iterationCount).toBe(5);
        expect(result.current.chains[0].samples).toHaveLength(3);
      });

      it('should return complete object structure with correct types', () => {
        const { result } = renderHook(() => useSamplingController());

        // Verify top-level properties
        expect(result.current).toHaveProperty('logP');
        expect(result.current).toHaveProperty('chains');
        expect(result.current).toHaveProperty('isRunning');
        expect(result.current).toHaveProperty('iterationCount');
        expect(result.current).toHaveProperty('error');
        expect(result.current).toHaveProperty('contourData');
        expect(result.current).toHaveProperty('setLogP');
        expect(result.current).toHaveProperty('setChainConfig');
        expect(result.current).toHaveProperty('addChain');
        expect(result.current).toHaveProperty('removeChain');
        expect(result.current).toHaveProperty('sampleSteps');
        expect(result.current).toHaveProperty('step');
        expect(result.current).toHaveProperty('reset');

        // Verify chain structure
        const chain = result.current.chains[0];
        expect(chain).toHaveProperty('id');
        expect(chain).toHaveProperty('samplerType');
        expect(chain).toHaveProperty('params');
        expect(chain).toHaveProperty('initialPosition');
        expect(chain).toHaveProperty('samples');
        expect(chain).toHaveProperty('trajectory');
        expect(chain).toHaveProperty('rejectedCount');
        expect(chain).toHaveProperty('seed');

        // Verify types
        expect(typeof result.current.logP).toBe('string');
        expect(typeof chain.params).toBe('object');
        expect(typeof chain.initialPosition).toBe('object');
        expect(Array.isArray(chain.samples)).toBe(true);
        expect(Array.isArray(chain.trajectory)).toBe(true);
        expect(typeof result.current.isRunning).toBe('boolean');
        expect(typeof result.current.iterationCount).toBe('number');
        expect(typeof chain.rejectedCount).toBe('number');
        expect(typeof result.current.setLogP).toBe('function');
        expect(typeof result.current.setChainConfig).toBe('function');
        expect(typeof result.current.sampleSteps).toBe('function');
        expect(typeof result.current.step).toBe('function');
        expect(typeof result.current.reset).toBe('function');
      });

      it('should validate trajectory point structure', async () => {
        const { result } = renderHook(() => useSamplingController());

        act(() => {
          result.current.setLogP('-(x^2 + y^2)/2');
          result.current.setChainConfig(0, { initialPosition: { x: 0, y: 0 } });
        });

        HMCSampler.prototype.step.mockReturnValue({
          q: { x: 1, y: 1 },
          p: { x: 0.5, y: 0.5 },
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

        // Verify each trajectory point has x and y properties that are numbers
        expect(result.current.chains[0].trajectory).toHaveLength(3);
        result.current.chains[0].trajectory.forEach((point) => {
          expect(point).toHaveProperty('x');
          expect(point).toHaveProperty('y');
          expect(typeof point.x).toBe('number');
          expect(typeof point.y).toBe('number');
        });
      });
    });
  });

  describe('Second Chain Integration', () => {
    it('should initialize with second chain disabled', () => {
      const { result } = renderHook(() => useSamplingController());

      // Only one chain exists by default
      expect(result.current.chains.length).toBe(1);
      expect(result.current.chains[0].samples).toEqual([]);
      expect(result.current.chains[0].trajectory).toEqual([]);
      expect(result.current.chains[0].rejectedCount).toBe(0);
      expect(result.current.chains[0].seed).toBeNull();
    });

    it('should enable and disable second chain', () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.addChain({ id: 1 });
      });

      expect(result.current.chains.length > 1).toBe(true);

      act(() => {
        result.current.removeChain(1);
      });

      expect(result.current.chains.length > 1).toBe(false);
    });

    it('should have independent initial positions for both chains', () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.addChain({ id: 1, initialPosition: { x: -1, y: -2 } });
        result.current.setChainConfig(0, { initialPosition: { x: 2, y: 3 } });
        result.current.setChainConfig(1, { initialPosition: { x: -1, y: -2 } });
      });

      expect(result.current.chains[0].initialPosition).toEqual({ x: 2, y: 3 });
      expect(result.current.chains[1].initialPosition).toEqual({
        x: -1,
        y: -2,
      });
    });

    it('should have independent seeds for both chains', () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.addChain({ id: 1 });
        result.current.setChainConfig(0, { seed: 42 });
        result.current.setChainConfig(1, { seed: 100 });
      });

      expect(result.current.chains[0].seed).toBe(42);
      expect(result.current.chains[1].seed).toBe(100);

      // Verify both samplers received their respective seeds
      expect(HMCSampler.prototype.setSeed).toHaveBeenCalledWith(42);
      expect(HMCSampler.prototype.setSeed).toHaveBeenCalledWith(100);
    });

    it('should run both chains in parallel when second chain is enabled', async () => {
      const { result } = renderHook(() => useSamplingController());

      // Setup
      act(() => {
        result.current.addChain({ id: 1, initialPosition: { x: 1, y: 1 } });
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.setChainConfig(0, { initialPosition: { x: 0, y: 0 } });
        result.current.setChainConfig(1, { initialPosition: { x: 1, y: 1 } });
      });

      // Mock step implementation that tracks which instance is calling
      let chain1CallCount = 0;
      let chain2CallCount = 0;

      const mockStepImplementation = vi.fn(() => {
        // Alternate between chains (step is called once per chain per iteration)
        const isChain1 = HMCSampler.prototype.step.mock.calls.length % 2 === 1;
        const count = isChain1 ? chain1CallCount++ : chain2CallCount++;

        return {
          q: { x: count, y: count },
          p: { x: 0, y: 0 },
          accepted: true,
          trajectory: [{ x: count, y: count }],
        };
      });

      HMCSampler.prototype.step.mockImplementation(mockStepImplementation);

      // Run sampling
      act(() => {
        result.current.sampleSteps(3);
      });

      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 1000 }
      );

      // Verify both chains were sampled
      expect(result.current.iterationCount).toBe(3);
      expect(result.current.chains[0].samples).toHaveLength(3);
      expect(result.current.chains[1].samples).toHaveLength(3);

      // step should be called 6 times total (3 steps × 2 chains)
      expect(HMCSampler.prototype.step).toHaveBeenCalledTimes(6);
    });

    it('should track separate statistics for each chain', async () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.addChain({ id: 1 });
      });

      // Mock: Chain 1 accepts all, Chain 2 rejects all
      HMCSampler.prototype.step.mockImplementation(() => {
        const callNum = HMCSampler.prototype.step.mock.calls.length;
        const isChain1 = callNum % 2 === 1;

        return {
          q: { x: 0, y: 0 },
          p: { x: 0, y: 0 },
          accepted: isChain1, // Chain 1 accepts, Chain 2 rejects
          trajectory: [{ x: 0, y: 0 }],
        };
      });

      act(() => {
        result.current.sampleSteps(3);
      });

      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 1000 }
      );

      // Chain 1: 3 accepted, 0 rejected
      expect(result.current.chains[0].samples.length).toBe(3);
      expect(result.current.chains[0].rejectedCount).toBe(0);

      // Chain 2: 0 accepted, 3 rejected
      expect(result.current.chains[1].samples.length).toBe(0);
      expect(result.current.chains[1].rejectedCount).toBe(3);
    });

    it('should reset both chains when reset is called', async () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.addChain({ id: 1 });
      });

      HMCSampler.prototype.step.mockReturnValue({
        q: { x: 1, y: 1 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [{ x: 1, y: 1 }],
      });

      // Run some steps
      act(() => {
        result.current.sampleSteps(2);
      });

      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 1000 }
      );

      // Verify both chains have data
      expect(result.current.chains[0].samples.length).toBeGreaterThan(0);
      expect(result.current.chains[1].samples.length).toBeGreaterThan(0);

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify both chains are reset
      expect(result.current.chains[0].samples).toEqual([]);
      expect(result.current.chains[1].samples).toEqual([]);
      expect(result.current.chains[0].trajectory).toEqual([]);
      expect(result.current.chains[1].trajectory).toEqual([]);
      expect(result.current.iterationCount).toBe(0);
      expect(result.current.chains[0].rejectedCount).toBe(0);
      expect(result.current.chains[1].rejectedCount).toBe(0);
    });

    it('should reset both chain RNGs when both are seeded', async () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.addChain({ id: 1 });
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.setChainConfig(0, { seed: 42 });
        result.current.setChainConfig(1, { seed: 100 });
      });

      // Clear mock to track reset calls
      HMCSampler.prototype.setSeed.mockClear();

      act(() => {
        result.current.reset();
      });

      // After reset, samplers should be re-instantiated; seeds remain on chains
      expect(result.current.chains[0].seed).toBe(42);
      expect(result.current.chains[1].seed).toBe(100);
    });

    it('should only sample chain 1 when second chain is disabled', async () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.removeChain(1);
      });

      HMCSampler.prototype.step.mockReturnValue({
        q: { x: 1, y: 1 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [{ x: 1, y: 1 }],
      });

      act(() => {
        result.current.sampleSteps(3);
      });

      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 1000 }
      );

      // Only chain 1 should have samples (no second chain)
      expect(result.current.chains[0].samples).toHaveLength(3);
      expect(result.current.chains.length).toBe(1);

      // step should be called 3 times (only chain 1)
      expect(HMCSampler.prototype.step).toHaveBeenCalledTimes(3);
    });

    it('should handle same initial position for both chains', async () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.addChain({ id: 1, initialPosition: { x: 0, y: 0 } });
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.setChainConfig(0, { initialPosition: { x: 0, y: 0 } });
        result.current.setChainConfig(1, { initialPosition: { x: 0, y: 0 } }); // Same position
      });

      HMCSampler.prototype.step.mockReturnValue({
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

      // Both chains should still work independently
      expect(result.current.chains[0].samples).toHaveLength(1);
      expect(result.current.chains[1].samples).toHaveLength(1);
    });

    it('should preserve second chain trajectory on each step', async () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.addChain({ id: 1 });
      });

      // Mock to return different trajectories for each chain
      HMCSampler.prototype.step.mockImplementation(() => {
        const callNum = HMCSampler.prototype.step.mock.calls.length;
        const isChain1 = callNum % 2 === 1;

        return {
          q: { x: callNum, y: callNum },
          p: { x: 0, y: 0 },
          accepted: true,
          trajectory: isChain1
            ? [
                { x: 0, y: 0 },
                { x: 1, y: 1 },
              ]
            : [
                { x: 2, y: 2 },
                { x: 3, y: 3 },
              ],
        };
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

      // Both chains should have their respective trajectories
      expect(result.current.chains[0].trajectory.length).toBeGreaterThan(0);
      expect(result.current.chains[1].trajectory.length).toBeGreaterThan(0);
    });

    it('should clear second chain data when logP changes', () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
        result.current.addChain({ id: 1 });
      });

      // Manually set some second chain data
      act(() => {
        result.current.step();
      });

      // Change logP (which calls reset)
      act(() => {
        result.current.setLogP('-(x^2)/2');
      });

      // Second chain data should be cleared
      expect(result.current.chains[1]?.samples ?? []).toEqual([]);
      expect(result.current.chains[1]?.trajectory ?? []).toEqual([]);
      expect(result.current.chains[1]?.rejectedCount ?? 0).toBe(0);
    });
  });

  describe('R-hat Statistics', () => {
    it('should calculate rHat after sampling finishes with second chain', async () => {
      const { result } = renderHook(() => useSamplingController());

      // Setup: Enable second chain and set positions
      act(() => {
        result.current.setLogP('-(x^2)/2');
        result.current.setChainConfig(0, { initialPosition: { x: 0, y: 0 } });
        result.current.addChain({ id: 1 });
        result.current.setChainConfig(1, { initialPosition: { x: 10, y: 10 } });
      });

      // Mock step behavior for distinct chains.
      // Since the mock is shared, we distinguish chains based on the input particle's position.
      // Chain 1 starts at 0, Chain 2 starts at 10.
      HMCSampler.prototype.step.mockImplementation((particle) => {
        const x = particle.q.x;
        // If particle is near 0, treat as Chain 1 (return 0).
        // If near 10, treat as Chain 2 (return 10).
        const nextX = Math.abs(x) < 5 ? 0 : 10;

        return {
          q: { x: nextX, y: nextX },
          p: { x: 0, y: 0 },
          accepted: true,
          trajectory: [{ x: nextX, y: nextX }],
        };
      });

      // Run 15 steps (burnIn is 10, need >10 samples)
      act(() => {
        result.current.sampleSteps(15);
      });

      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 1000 }
      );

      // Verify rHat
      // We expect it to be calculated because we have samples and finished running
      expect(result.current.rHat).not.toBeNull();
      expect(result.current.rHat).toHaveProperty('x');
      expect(result.current.rHat).toHaveProperty('y');
    });

    it('should not calculate rHat if second chain is disabled', async () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setLogP('-(x^2)/2');
        result.current.removeChain(1);
      });

      // Mock step
      HMCSampler.prototype.step.mockReturnValue({
        q: { x: 0, y: 0 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [],
      });

      act(() => {
        result.current.sampleSteps(3);
      });

      await waitFor(() => expect(result.current.isRunning).toBe(false));

      expect(result.current.rHat).toBeNull();
    });
    it('should exclude burn-in samples from R-hat calculation', async () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setLogP('-(x^2)/2');
        result.current.addChain({ id: 1 });
      });

      let callCount = 0;
      HMCSampler.prototype.step.mockImplementation(() => {
        // Implementation calls step() twice per loop iteration (once per chain).
        // callCount 0: chain 1, iter 0
        // callCount 1: chain 2, iter 0
        // callCount 2: chain 1, iter 1
        // ...
        const iteration = Math.floor(callCount / 2);
        const isChain2 = callCount % 2 !== 0;
        callCount++;

        // Burn-in is 10. So iterations 0-9 are burn-in.
        let val;
        if (iteration < 10) {
          // Burn-in: Make them distinct.
          // Chain 1 -> -100, Chain 2 -> 100
          val = isChain2 ? 100 : -100;
        } else {
          // Valid: Both 0 (Perfect convergence)
          val = 0;
        }

        return {
          q: { x: val, y: val },
          p: { x: 0, y: 0 },
          accepted: true,
          trajectory: [{ x: val, y: val }],
        };
      });

      // Run 20 steps (10 burn-in + 10 valid)
      act(() => {
        result.current.sampleSteps(20);
      });

      await waitFor(() => expect(result.current.isRunning).toBe(false));

      // If burn-in (first 10) was included, we'd have -100 and 100, variance would be high (R-hat >> 1).
      // With only valid samples (all 0), R-hat should be 1 (Converged).

      expect(result.current.rHat).not.toBeNull();
      // Since valid samples are identical (constant 0), W=0, B=0 => returns 1.
      expect(result.current.rHat.x).toBe(1);
    });
  });
});

describe('Statistics Calculation (R-hat and ESS)', () => {
  it('should initialize statistics as null', () => {
    const { result } = renderHook(() => useSamplingController());
    expect(result.current.rHat).toBeNull();
    expect(result.current.ess).toBeNull();
  });

  // Validating that ESS updates would require mocking calculateESS or simulating enough samples
  // Since we mock HMCSampler, we can simulate samples accumulation.
  // However, calculateESS is imported in the hook.
  // If we want to test that 'setEss' is called, we need to inspect the state changes.
});

describe('Burn-in Parameter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HMCSampler.prototype.step.mockReturnValue({
      q: { x: 0, y: 0 },
      p: { x: 0, y: 0 },
      accepted: true,
      trajectory: [{ x: 0, y: 0 }],
    });
  });

  it('should initialize with default burn-in value of 10', () => {
    const { result } = renderHook(() => useSamplingController());
    expect(result.current.burnIn).toBe(10);
  });

  it('should expose setBurnIn function', () => {
    const { result } = renderHook(() => useSamplingController());
    expect(result.current.setBurnIn).toBeDefined();
    expect(typeof result.current.setBurnIn).toBe('function');
  });

  it('should update burn-in value when setBurnIn is called', () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setBurnIn(20);
    });

    expect(result.current.burnIn).toBe(20);
  });

  it('should recalculate R-hat when burn-in changes with dual chains', async () => {
    const { result } = renderHook(() => useSamplingController());

    // Setup: Enable second chain
    act(() => {
      result.current.setLogP('-(x^2)/2');
      result.current.addChain({ id: 1 });
    });

    // Mock step to return consistent values
    let callCount = 0;
    HMCSampler.prototype.step.mockImplementation(() => {
      const val = callCount++;
      return {
        q: { x: val, y: val },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [{ x: val, y: val }],
      };
    });

    // Run 30 steps
    act(() => {
      result.current.sampleSteps(30);
    });

    await waitFor(() => expect(result.current.isRunning).toBe(false), {
      timeout: 1000,
    });

    // Initial R-hat with burn-in = 10 (20 valid samples)
    const initialRHat = result.current.rHat;
    expect(initialRHat).not.toBeNull();

    // Change burn-in to 5
    act(() => {
      result.current.setBurnIn(5);
    });

    // R-hat should recalculate with new burn-in (25 valid samples)
    const newRHat = result.current.rHat;
    expect(newRHat).not.toBeNull();
    // Values should be different because we're using different sample ranges
    expect(newRHat).not.toBe(initialRHat);
  });

  it('should recalculate ESS when burn-in changes', async () => {
    const { result } = renderHook(() => useSamplingController());

    // Setup
    act(() => {
      result.current.setLogP('-(x^2)/2');
    });

    // Mock step
    let callCount = 0;
    HMCSampler.prototype.step.mockImplementation(() => {
      const val = callCount++;
      return {
        q: { x: val, y: val },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [{ x: val, y: val }],
      };
    });

    // Run 30 steps
    act(() => {
      result.current.sampleSteps(30);
    });

    await waitFor(() => expect(result.current.isRunning).toBe(false), {
      timeout: 1000,
    });

    // Initial ESS with burn-in = 10
    const initialESS = result.current.ess;
    expect(initialESS).not.toBeNull();

    // Change burn-in to 15
    act(() => {
      result.current.setBurnIn(15);
    });

    // ESS should recalculate
    const newESS = result.current.ess;
    expect(newESS).not.toBeNull();
    // Values should be different
    expect(newESS).not.toBe(initialESS);
  });

  it('should handle burn-in = 0 (all samples valid)', async () => {
    const { result } = renderHook(() => useSamplingController());

    // Setup
    act(() => {
      result.current.setLogP('-(x^2)/2');
      result.current.setBurnIn(0);
    });

    // Mock step
    HMCSampler.prototype.step.mockReturnValue({
      q: { x: 0, y: 0 },
      p: { x: 0, y: 0 },
      accepted: true,
      trajectory: [{ x: 0, y: 0 }],
    });

    // Run 20 steps
    act(() => {
      result.current.sampleSteps(20);
    });

    await waitFor(() => expect(result.current.isRunning).toBe(false), {
      timeout: 1000,
    });

    // All 20 samples should be valid, ESS should be calculated
    expect(result.current.chains[0].samples).toHaveLength(20);
    expect(result.current.ess).not.toBeNull();
  });

  it('should clear statistics when burn-in > sample count', async () => {
    const { result } = renderHook(() => useSamplingController());

    // Setup
    act(() => {
      result.current.setLogP('-(x^2)/2');
    });

    // Mock step
    HMCSampler.prototype.step.mockReturnValue({
      q: { x: 0, y: 0 },
      p: { x: 0, y: 0 },
      accepted: true,
      trajectory: [{ x: 0, y: 0 }],
    });

    // Run 15 steps
    act(() => {
      result.current.sampleSteps(15);
    });

    await waitFor(() => expect(result.current.isRunning).toBe(false), {
      timeout: 1000,
    });

    // Should have ESS with burn-in = 10
    expect(result.current.ess).not.toBeNull();

    // Set burn-in > sample count
    act(() => {
      result.current.setBurnIn(20);
    });

    // Statistics should be null (no valid samples)
    expect(result.current.rHat).toBeNull();
    expect(result.current.ess).toBeNull();
  });

  it('should clear statistics when burn-in leaves insufficient samples for dual chains', async () => {
    const { result } = renderHook(() => useSamplingController());

    // Setup: Enable second chain
    act(() => {
      result.current.setLogP('-(x^2)/2');
      result.current.addChain({ id: 1 });
    });

    // Mock step
    HMCSampler.prototype.step.mockReturnValue({
      q: { x: 0, y: 0 },
      p: { x: 0, y: 0 },
      accepted: true,
      trajectory: [{ x: 0, y: 0 }],
    });

    // Run 12 steps (12 samples per chain)
    act(() => {
      result.current.sampleSteps(12);
    });

    await waitFor(() => expect(result.current.isRunning).toBe(false), {
      timeout: 1000,
    });

    // With burn-in = 10, we have 2 valid samples per chain, R-hat should be calculated
    expect(result.current.rHat).not.toBeNull();

    // Set burn-in to 11 (only 1 valid sample per chain)
    act(() => {
      result.current.setBurnIn(11);
    });

    // Statistics should be null (need >1 sample per chain)
    expect(result.current.rHat).toBeNull();
    expect(result.current.ess).toBeNull();
  });
});

describe('Axis Limits', () => {
  it('should initialize with default axis limits', () => {
    const { result } = renderHook(() => useSamplingController());

    expect(result.current.axisLimits).toEqual({
      xMin: -5,
      xMax: 5,
      yMin: -5,
      yMax: 5,
    });
  });

  it('should update axis limits', () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setAxisLimits({
        xMin: -10,
        xMax: 10,
        yMin: -10,
        yMax: 10,
      });
    });

    expect(result.current.axisLimits).toEqual({
      xMin: -10,
      xMax: 10,
      yMin: -10,
      yMax: 10,
    });
  });

  it('should allow partial updates to axis limits', () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setAxisLimits({
        xMin: -20,
      });
    });

    expect(result.current.axisLimits).toEqual({
      xMin: -20,
      xMax: 5,
      yMin: -5,
      yMax: 5,
    });
  });
});

describe('Fast Sampling Mode', () => {
  it('should initialize with useFastMode as false', () => {
    const { result } = renderHook(() => useSamplingController());
    expect(result.current.useFastMode).toBe(false);
  });

  it('should update useFastMode state', () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setUseFastMode(true);
    });

    expect(result.current.useFastMode).toBe(true);
  });

  it('should execute batch sampling in fast mode', async () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setLogP('-(x^2)/2');
      result.current.setUseFastMode(true);
    });

    // Mock step implementation
    let callCount = 0;
    HMCSampler.prototype.step.mockImplementation(() => {
      const val = callCount++;
      return {
        q: { x: val, y: val },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [{ x: val, y: val }],
      };
    });

    // Clear any previous calls
    HMCSampler.prototype.step.mockClear();

    // Run 5 samples in fast mode
    act(() => {
      result.current.sampleSteps(5);
    });

    // Wait for async batch execution
    await waitFor(() => {
      expect(result.current.isRunning).toBe(false);
    });

    expect(HMCSampler.prototype.step).toHaveBeenCalledTimes(5);
    expect(result.current.chains[0].samples).toHaveLength(5);
    expect(result.current.iterationCount).toBe(5);
  });

  it('should handle errors in fast mode batch execution', async () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setLogP('-(x^2)/2');
      result.current.setUseFastMode(true);
    });

    // Mock step to always throw — this ensures the error persists after all iterations
    HMCSampler.prototype.step.mockImplementation(() => {
      throw new Error('Simulation failed');
    });

    act(() => {
      result.current.sampleSteps(5);
    });

    await waitFor(() => {
      expect(result.current.isRunning).toBe(false);
    });

    // Per-chain errors are captured in chain.error; global error remains null
    expect(result.current.chains[0].error).toBe('Simulation failed');
    expect(result.current.error).toBeNull();
    expect(result.current.isRunning).toBe(false);
  });

  it('should execute batch sampling with dual chains in fast mode', async () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setLogP('-(x^2)/2');
      result.current.setUseFastMode(true);
      result.current.addChain({ id: 1 });
      result.current.setChainConfig(1, { initialPosition: { x: 1, y: 1 } });
    });

    // Mock step implementation
    // Since we mock the prototype, both chains use the same mock
    // We can just count total calls: 5 steps * 2 chains = 10 calls
    // Mock step implementation with mixed results
    let callCount = 0;
    HMCSampler.prototype.step.mockImplementation(() => {
      callCount++;
      // Reject every 2nd step (Chain 2 steps)
      const isAccepted = callCount % 2 !== 0;
      return {
        q: { x: 0, y: 0 },
        p: { x: 0, y: 0 },
        accepted: isAccepted,
        trajectory: [{ x: 0, y: 0 }],
      };
    });

    HMCSampler.prototype.step.mockClear();

    act(() => {
      result.current.sampleSteps(5);
    });

    await waitFor(() => {
      expect(result.current.isRunning).toBe(false);
    });

    // 5 steps for chain 1 + 5 steps for chain 2 = 10 calls
    expect(HMCSampler.prototype.step).toHaveBeenCalledTimes(10);

    // Verify samples update
    // Chain 1 (odd calls): Accepted
    // Chain 2 (even calls): Rejected
    expect(result.current.chains[0].samples).toHaveLength(5);
    // Chain 2: all rejected (even calls rejected)
    expect(result.current.chains[1].samples.length).toBe(0);
    expect(result.current.chains[1].rejectedCount).toBe(5);
    expect(result.current.iterationCount).toBe(5);
  });
});

describe('Plan Bug-Fix Tests (test cases 11-18)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HMCSampler.prototype.step.mockReturnValue({
      q: { x: 1, y: 1 },
      p: { x: 0, y: 0 },
      accepted: true,
      trajectory: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    });
    GibbsSampler.prototype.step.mockReturnValue({
      q: { x: 1, y: 1 },
      p: { x: 0, y: 0 },
      accepted: true,
      trajectory: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    });
  });

  // Test case 11: addChain() adds to chains array
  it('addChain() adds to chains array — chains has length 2', () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.addChain({ id: 99, samplerType: 'GIBBS' });
    });

    expect(result.current.chains).toHaveLength(2);
    expect(result.current.chains[1].samplerType).toBe('GIBBS');
  });

  // Test case 12: addChain() creates exactly one ref instance
  it('addChain() creates exactly one ref instance — samplingChainsRef has two entries after add', async () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.addChain({ id: 1 });
    });

    // The ref map should have exactly 2 entries (chain 0 and chain 1)
    expect(result.current.chains).toHaveLength(2);
    // Both chains should be functional (setLogP and step work for both)
    act(() => {
      result.current.setLogP('-(x^2 + y^2)/2');
    });

    act(() => {
      result.current.step();
    });

    await waitFor(() => expect(result.current.isRunning).toBe(false), {
      timeout: 1000,
    });

    // Both chains should have accumulated a sample — meaning both refs were created
    expect(result.current.chains[0].samples).toHaveLength(1);
    expect(result.current.chains[1].samples).toHaveLength(1);
  });

  // Test case 13: removeChain() removes correct chain
  it('removeChain() removes the correct chain — chains has length 1 with remaining id', () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.addChain({ id: 77 });
    });

    expect(result.current.chains).toHaveLength(2);

    act(() => {
      result.current.removeChain(77);
    });

    expect(result.current.chains).toHaveLength(1);
    expect(result.current.chains[0].id).toBe(0);
  });

  // Test case 14: removeChain() is blocked while running
  it('removeChain() is blocked while running — chain is still present', async () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.addChain({ id: 1 });
      result.current.setLogP('-(x^2 + y^2)/2');
    });

    expect(result.current.chains).toHaveLength(2);

    // Start a multi-step run (sampleSteps sets isRunning=true)
    act(() => {
      result.current.sampleSteps(100);
    });

    // While running, attempt to remove — should be a no-op
    act(() => {
      result.current.removeChain(1);
    });

    expect(result.current.chains).toHaveLength(2);

    // Wait for run to finish
    await waitFor(() => expect(result.current.isRunning).toBe(false), {
      timeout: 2000,
    });
  });

  // Test case 15: setChainConfig() with samplerType change syncs ref
  it('setChainConfig() with samplerType change syncs ref — ref samplerType equals GIBBS', () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setChainConfig(0, { samplerType: 'GIBBS' });
    });

    expect(result.current.chains[0].samplerType).toBe('GIBBS');
    // GibbsSampler constructor should have been called for chain 0
    expect(GibbsSampler).toHaveBeenCalled();
  });

  // Test case 16: resetChain(id) resets only target chain
  it('resetChain(id) resets only target chain — other chain samples are unchanged', async () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.addChain({ id: 1 });
      result.current.setLogP('-(x^2 + y^2)/2');
    });

    // Sample a few steps so both chains accumulate data
    act(() => {
      result.current.sampleSteps(3);
    });

    await waitFor(() => expect(result.current.isRunning).toBe(false), {
      timeout: 1000,
    });

    expect(result.current.chains[0].samples.length).toBeGreaterThan(0);
    expect(result.current.chains[1].samples.length).toBeGreaterThan(0);

    const chain1SamplesCount = result.current.chains[1].samples.length;

    // Reset only chain 0
    act(() => {
      result.current.resetChain(0);
    });

    // Chain 0 is reset
    expect(result.current.chains[0].samples).toHaveLength(0);
    expect(result.current.chains[0].rejectedCount).toBe(0);
    expect(result.current.chains[0].acceptedCount).toBe(0);

    // Chain 1 is unchanged
    expect(result.current.chains[1].samples).toHaveLength(chain1SamplesCount);
  });

  // Test case 17: Multi-chain step() — both chains accumulate samples
  it('sampleSteps(10) with two chains — both chains accumulate ~10 samples', async () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.addChain({ id: 1 });
      result.current.setLogP('-(x^2 + y^2)/2');
    });

    act(() => {
      result.current.sampleSteps(10);
    });

    await waitFor(() => expect(result.current.isRunning).toBe(false), {
      timeout: 2000,
    });

    expect(result.current.chains[0].samples).toHaveLength(10);
    expect(result.current.chains[1].samples).toHaveLength(10);
  });

  // Test case 18: Per-chain error does not stop other chain
  it('per-chain error in chain 0 does not stop chain 1 from sampling', async () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.addChain({ id: 1 });
      result.current.setLogP('-(x^2 + y^2)/2');
    });

    // Chain 0's sampler throws; chain 1 succeeds.
    // Since both chains share the HMCSampler mock prototype, we need a call counter
    // to alternate: odd calls throw, even calls succeed.
    let callCount = 0;
    HMCSampler.prototype.step.mockImplementation(() => {
      callCount++;
      if (callCount % 2 === 1) {
        // Chain 0 (first call per step) throws
        throw new Error('logP eval error in chain 0');
      }
      // Chain 1 (second call per step) succeeds
      return {
        q: { x: 1, y: 1 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [{ x: 1, y: 1 }],
      };
    });

    act(() => {
      result.current.step();
    });

    await waitFor(() => expect(result.current.isRunning).toBe(false), {
      timeout: 1000,
    });

    // Chain 0 error is captured, not thrown globally
    expect(result.current.chains[0].error).toBe('logP eval error in chain 0');
    // Chain 1 still accumulated a sample
    expect(result.current.chains[1].samples).toHaveLength(1);
    // Global error should not be set (per-chain errors are isolated)
    expect(result.current.error).toBeNull();
  });

  // Test: resetChain exposes the function on the hook
  it('hook exposes resetChain function', () => {
    const { result } = renderHook(() => useSamplingController());
    expect(result.current.resetChain).toBeDefined();
    expect(typeof result.current.resetChain).toBe('function');
  });

  // Test: chainErrors object is exposed
  it('hook exposes chainErrors plain object', () => {
    const { result } = renderHook(() => useSamplingController());
    expect(result.current.chainErrors).toBeDefined();
    expect(result.current.chainErrors instanceof Map).toBe(false);
    expect(typeof result.current.chainErrors).toBe('object');
  });

  // Test: acceptedCount is exposed on chains
  it('chains expose acceptedCount field', async () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setLogP('-(x^2 + y^2)/2');
    });

    act(() => {
      result.current.step();
    });

    await waitFor(() => expect(result.current.isRunning).toBe(false), {
      timeout: 1000,
    });

    expect(typeof result.current.chains[0].acceptedCount).toBe('number');
    expect(result.current.chains[0].acceptedCount).toBe(1);
  });

  // Regression test 10: addChain() with no arguments does not throw
  it('addChain() with no arguments does not throw and chains grows to length 2', () => {
    const { result } = renderHook(() => useSamplingController());

    expect(() => {
      act(() => {
        result.current.addChain();
      });
    }).not.toThrow();

    expect(result.current.chains).toHaveLength(2);
  });

  // Regression test 11: addChain() with no arguments assigns a numeric id
  it('addChain() with no arguments assigns a numeric id', () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.addChain();
    });

    expect(typeof result.current.chains[1].id).toBe('number');
  });

  // Regression test 12: addChain({ samplerType: 'GIBBS' }) still works correctly
  it('addChain({ samplerType: "GIBBS" }) creates a Gibbs chain', () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.addChain({ samplerType: 'GIBBS' });
    });

    expect(result.current.chains).toHaveLength(2);
    expect(result.current.chains[1].samplerType).toBe('GIBBS');
  });
});

describe('Code Quality Fix Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HMCSampler.prototype.step.mockReturnValue({
      q: { x: 1, y: 1 },
      p: { x: 0, y: 0 },
      accepted: true,
      trajectory: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    });
  });

  // Test 1: Trajectory deep-copy — mutating the ref's trajectory does not affect React state
  it('trajectory in React state is deep-copied from ref trajectory', async () => {
    const { result } = renderHook(() => useSamplingController());

    // Keep a reference to the trajectory array that the mock returns
    const mockTrajectoryPoint = { x: 0, y: 0 };
    const mockTrajectory = [mockTrajectoryPoint, { x: 1, y: 1 }];
    HMCSampler.prototype.step.mockReturnValue({
      q: { x: 1, y: 1 },
      p: { x: 0, y: 0 },
      accepted: true,
      trajectory: mockTrajectory,
    });

    act(() => {
      result.current.setLogP('-(x^2 + y^2)/2');
    });

    act(() => {
      result.current.step();
    });

    await waitFor(() => expect(result.current.isRunning).toBe(false), {
      timeout: 1000,
    });

    // Capture the React state trajectory point before mutation
    const statePoint = result.current.chains[0].trajectory[0];
    expect(statePoint).toEqual({ x: 0, y: 0 });

    // Mutate the original mock trajectory point (simulating in-place sampler mutation)
    mockTrajectoryPoint.x = 999;

    // React state point must be unaffected (deep copy)
    expect(result.current.chains[0].trajectory[0].x).toBe(0);
    expect(statePoint.x).toBe(0);
  });

  // Test 2: Samples sync after accepted step
  it('samples in React state are populated after an accepted step', async () => {
    const { result } = renderHook(() => useSamplingController());

    HMCSampler.prototype.step.mockReturnValue({
      q: { x: 2.5, y: -1.3 },
      p: { x: 0.1, y: 0.2 },
      accepted: true,
      trajectory: [
        { x: 0, y: 0 },
        { x: 2.5, y: -1.3 },
      ],
    });

    act(() => {
      result.current.setLogP('-(x^2 + y^2)/2');
    });

    act(() => {
      result.current.step();
    });

    await waitFor(() => expect(result.current.isRunning).toBe(false), {
      timeout: 1000,
    });

    expect(result.current.chains[0].samples).toHaveLength(1);
    expect(result.current.chains[0].samples[0]).toEqual({ x: 2.5, y: -1.3 });
  });

  // Test 3: Counters (acceptedCount/rejectedCount) sync correctly after mixed steps
  it('acceptedCount and rejectedCount sync correctly after mixed accept/reject steps', async () => {
    const { result } = renderHook(() => useSamplingController());

    const mockSequence = [
      {
        q: { x: 1, y: 1 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [{ x: 1, y: 1 }],
      },
      {
        q: { x: 1, y: 1 },
        p: { x: 0, y: 0 },
        accepted: false,
        trajectory: [{ x: 0.5, y: 0.5 }],
      },
      {
        q: { x: 2, y: 2 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [{ x: 2, y: 2 }],
      },
    ];
    let callIndex = 0;
    HMCSampler.prototype.step.mockImplementation(
      () => mockSequence[callIndex++]
    );

    act(() => {
      result.current.setLogP('-(x^2 + y^2)/2');
    });

    act(() => {
      result.current.sampleSteps(3);
    });

    await waitFor(() => expect(result.current.isRunning).toBe(false), {
      timeout: 1000,
    });

    expect(result.current.chains[0].acceptedCount).toBe(2);
    expect(result.current.chains[0].rejectedCount).toBe(1);
  });

  // Test 4: Stale error is cleared after a successful step
  it('stale chainError for a chain is cleared after a successful step', async () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setLogP('-(x^2 + y^2)/2');
    });

    // First step throws to set an error
    HMCSampler.prototype.step.mockImplementationOnce(() => {
      throw new Error('temporary error');
    });

    act(() => {
      result.current.step();
    });

    await waitFor(() => expect(result.current.isRunning).toBe(false), {
      timeout: 1000,
    });

    // Verify an error was recorded on the chain
    expect(result.current.chains[0].error).toBe('temporary error');

    // Second step succeeds
    HMCSampler.prototype.step.mockReturnValue({
      q: { x: 1, y: 1 },
      p: { x: 0, y: 0 },
      accepted: true,
      trajectory: [{ x: 1, y: 1 }],
    });

    act(() => {
      result.current.step();
    });

    await waitFor(() => expect(result.current.isRunning).toBe(false), {
      timeout: 1000,
    });

    // chainErrors should no longer contain this chain's id after successful step
    expect(result.current.chainErrors[0]).toBeUndefined();
    // The chain's error field should also be cleared
    expect(result.current.chains[0].error).toBeNull();
  });

  // Test 5: chainErrors is a plain object, not a Map instance
  it('chainErrors is a plain object (not a Map instance)', () => {
    const { result } = renderHook(() => useSamplingController());

    expect(result.current.chainErrors).toBeDefined();
    expect(result.current.chainErrors instanceof Map).toBe(false);
    expect(typeof result.current.chainErrors).toBe('object');
    // Verify it behaves like a plain object
    expect(Object.keys(result.current.chainErrors)).toEqual([]);
  });

  describe('allChainsCompatible helper', () => {
    it('returns true when all chains have the same samplerType', () => {
      const chains = [
        { id: 0, samplerType: 'HMC' },
        { id: 1, samplerType: 'HMC' },
      ];
      expect(allChainsCompatible(chains)).toBe(true);
    });

    it('returns true for a single chain', () => {
      expect(allChainsCompatible([{ id: 0, samplerType: 'HMC' }])).toBe(true);
    });

    it('returns true for empty array', () => {
      expect(allChainsCompatible([])).toBe(true);
    });

    it('returns false when at least one chain has a different samplerType', () => {
      const chains = [
        { id: 0, samplerType: 'HMC' },
        { id: 1, samplerType: 'Gibbs' },
      ];
      expect(allChainsCompatible(chains)).toBe(false);
    });

    it('returns false when chains have the same samplerType but different params', () => {
      const chains = [
        {
          id: 0,
          samplerType: 'HMC',
          params: { epsilon: 0.1, numLeapfrog: 10 },
        },
        {
          id: 1,
          samplerType: 'HMC',
          params: { epsilon: 0.3, numLeapfrog: 10 },
        },
      ];
      expect(allChainsCompatible(chains)).toBe(false);
    });

    it('returns true when chains differ only in seed or initialPosition', () => {
      const chains = [
        {
          id: 0,
          samplerType: 'HMC',
          params: { epsilon: 0.1, numLeapfrog: 10 },
          seed: 42,
          initialPosition: { x: 0, y: 0 },
        },
        {
          id: 1,
          samplerType: 'HMC',
          params: { epsilon: 0.1, numLeapfrog: 10 },
          seed: 99,
          initialPosition: { x: 1, y: 1 },
        },
      ];
      expect(allChainsCompatible(chains)).toBe(true);
    });
  });

  describe('mixed sampler type post-processing', () => {
    it('sets essPerChain and clears rHat/histogramData when chain types differ', async () => {
      const { result } = renderHook(() => useSamplingController());

      // Set up logP so sampling can run
      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
      });

      // Add a second chain with a different sampler type
      act(() => {
        result.current.addChain({ id: 99, samplerType: 'Gibbs' });
      });

      // Simulate samples on chain 0 (HMC mock) and chain 1 (Gibbs mock)
      // Inject samples directly through setChainConfig — we test the useEffect branch,
      // so we need isRunning to be false. The effect fires when chains state changes.

      // Mock steps to populate samples
      let hmcCallCount = 0;
      HMCSampler.prototype.step.mockImplementation(() => {
        const val = hmcCallCount++;
        return {
          q: { x: val * 0.1, y: val * 0.2 },
          p: { x: 0, y: 0 },
          accepted: true,
          trajectory: [{ x: val * 0.1, y: val * 0.2 }],
        };
      });

      let gibbsCallCount = 0;
      GibbsSampler.prototype.step.mockImplementation(() => {
        const val = gibbsCallCount++;
        return {
          q: { x: val * 0.5, y: val * 0.5 },
          p: { x: 0, y: 0 },
          accepted: true,
          trajectory: [{ x: val * 0.5, y: val * 0.5 }],
        };
      });

      // Run a batch of steps so both chains accumulate samples
      act(() => {
        result.current.sampleSteps(20);
      });

      await waitFor(() => expect(result.current.isRunning).toBe(false), {
        timeout: 3000,
      });

      // With burnIn=10 (default), after 20 samples each chain has 10 post-burnin samples
      // Different sampler types → essPerChain populated, rHat null, histogramData empty
      expect(result.current.rHat).toBeNull();
      expect(result.current.histogramData).toEqual({ samples: [] });
      expect(result.current.essPerChain).not.toBeNull();
      expect(result.current.essPerChain).toHaveLength(2);
      expect(result.current.essPerChain[0]).toHaveProperty('chainId');
      expect(result.current.essPerChain[0]).toHaveProperty('ess');
      expect(result.current.essPerChain[0].ess).toHaveProperty('x');
      expect(result.current.essPerChain[0].ess).toHaveProperty('y');
      expect(result.current.histogramDataPerChain).not.toBeNull();
      expect(result.current.histogramDataPerChain).toHaveLength(2);
    });

    it('keeps existing merged behaviour (rHat, histogramData) when all chains share same samplerType', async () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setLogP('-(x^2 + y^2)/2');
      });

      // Add a second HMC chain (same type)
      act(() => {
        result.current.addChain({ id: 88, samplerType: 'HMC' });
      });

      let hmcCallCount = 0;
      HMCSampler.prototype.step.mockImplementation(() => {
        const val = hmcCallCount++;
        return {
          q: { x: val * 0.1, y: val * 0.2 },
          p: { x: 0, y: 0 },
          accepted: true,
          trajectory: [{ x: val * 0.1, y: val * 0.2 }],
        };
      });

      act(() => {
        result.current.sampleSteps(20);
      });

      await waitFor(() => expect(result.current.isRunning).toBe(false), {
        timeout: 3000,
      });

      // Same sampler type → rHat computed, essPerChain null, histogramDataPerChain null
      expect(result.current.rHat).not.toBeNull();
      expect(result.current.essPerChain).toBeNull();
      expect(result.current.histogramDataPerChain).toBeNull();
      expect(result.current.histogramData).not.toBeNull();
      expect(result.current.histogramData).toHaveProperty('samples');
    });
  });

  describe('Stop Sampling', () => {
    it('should expose stopSampling function in returned object', () => {
      const { result } = renderHook(() => useSamplingController());
      expect(typeof result.current.stopSampling).toBe('function');
    });

    it('should stop an in-progress run and set isRunning to false', async () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setLogP('-(x^2)/2');
      });

      let callCount = 0;
      HMCSampler.prototype.step.mockImplementation(() => {
        callCount++;
        return {
          q: { x: callCount, y: callCount },
          p: { x: 0, y: 0 },
          accepted: true,
          trajectory: [{ x: callCount, y: callCount }],
        };
      });

      // Start a long 100-step run
      act(() => {
        result.current.sampleSteps(100);
      });

      // Call stopSampling after a few frames
      await waitFor(() => {
        expect(result.current.iterationCount).toBeGreaterThan(0);
      });

      act(() => {
        result.current.stopSampling();
      });

      await waitFor(
        () => {
          expect(result.current.isRunning).toBe(false);
        },
        { timeout: 2000 }
      );

      // Fewer than all 100 steps should have run
      expect(result.current.iterationCount).toBeLessThan(100);
    });

    it('should reset cancelRef so a new sampleSteps call runs normally', async () => {
      const { result } = renderHook(() => useSamplingController());

      act(() => {
        result.current.setLogP('-(x^2)/2');
      });

      HMCSampler.prototype.step.mockImplementation(() => ({
        q: { x: 1, y: 1 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [{ x: 1, y: 1 }],
      }));

      // Start and immediately stop a run
      act(() => {
        result.current.sampleSteps(100);
      });

      act(() => {
        result.current.stopSampling();
      });

      await waitFor(() => expect(result.current.isRunning).toBe(false), {
        timeout: 2000,
      });

      const countAfterStop = result.current.iterationCount;

      // Now start a fresh short run — it must NOT be immediately cancelled
      act(() => {
        result.current.sampleSteps(5);
      });

      await waitFor(() => expect(result.current.isRunning).toBe(false), {
        timeout: 2000,
      });

      // Iteration count should have increased by 5
      expect(result.current.iterationCount).toBe(countAfterStop + 5);
    });
  });
});
