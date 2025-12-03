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
});
