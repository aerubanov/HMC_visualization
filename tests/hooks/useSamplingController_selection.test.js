import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSamplingController from '../../src/hooks/useSamplingController';
import { HMCSampler } from '../../src/samplers/HMCSampler';
import { GibbsSampler } from '../../src/samplers/GibbsSampler';

// Mock plotFunctions
vi.mock('../../src/utils/plotFunctions', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createContourTrace: vi.fn(),
    generateGrid: vi.fn(() => ({ x: [], y: [] })),
  };
});

// Mock samplers
vi.mock('../../src/samplers/HMCSampler', () => {
  const HMCSamplerMock = vi.fn();
  HMCSamplerMock.prototype.setParams = vi.fn();
  HMCSamplerMock.prototype.setSeed = vi.fn();
  HMCSamplerMock.prototype.step = vi.fn();
  return { HMCSampler: HMCSamplerMock };
});

vi.mock('../../src/samplers/GibbsSampler', () => {
  const GibbsSamplerMock = vi.fn();
  GibbsSamplerMock.prototype.setParams = vi.fn();
  GibbsSamplerMock.prototype.setSeed = vi.fn();
  GibbsSamplerMock.prototype.step = vi.fn();
  return { GibbsSampler: GibbsSamplerMock };
});

describe('useSamplingController Sampler Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock behavior
    HMCSampler.prototype.step.mockReturnValue({
      q: { x: 0, y: 0 },
      p: { x: 0, y: 0 },
      accepted: true,
      trajectory: [{ x: 0, y: 0 }],
    });

    GibbsSampler.prototype.step.mockReturnValue({
      q: { x: 0, y: 0 },
      p: { x: 0, y: 0 },
      accepted: true,
      trajectory: [{ x: 0, y: 0 }],
    });
  });

  it('should initialize with HMC sampler by default', () => {
    const { result } = renderHook(() => useSamplingController());
    expect(result.current.samplerType).toBe('HMC');
    expect(HMCSampler).toHaveBeenCalled();
  });

  it('should switch to Gibbs sampler', () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setSamplerType('GIBBS');
    });

    expect(result.current.samplerType).toBe('GIBBS');
    expect(GibbsSampler).toHaveBeenCalled();
  });

  it('should switch back to HMC sampler', () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setSamplerType('GIBBS');
    });

    expect(result.current.samplerType).toBe('GIBBS');
    vi.clearAllMocks(); // Clear previous instantiations

    act(() => {
      result.current.setSamplerType('HMC');
    });

    expect(result.current.samplerType).toBe('HMC');
    expect(HMCSampler).toHaveBeenCalled();
  });

  it('should clear state when switching samplers', () => {
    const { result } = renderHook(() => useSamplingController());

    // Generate some state
    act(() => {
      result.current.setLogP('-(x^2)/2');
      result.current.step();
    });

    expect(result.current.iterationCount).toBe(1);
    expect(result.current.samples.length).toBe(1);

    // Switch sampler
    act(() => {
      result.current.setSamplerType('GIBBS');
    });

    expect(result.current.iterationCount).toBe(0);
    expect(result.current.samples.length).toBe(0);
    expect(result.current.trajectory.length).toBe(0);
  });

  it('should use correct sampler for stepping', () => {
    const { result } = renderHook(() => useSamplingController());

    // Default HMC
    act(() => {
      result.current.setLogP('-(x^2)/2');
      result.current.step();
    });
    expect(HMCSampler.prototype.step).toHaveBeenCalled();
    expect(GibbsSampler.prototype.step).not.toHaveBeenCalled();

    vi.clearAllMocks();

    // Switch to Gibbs
    act(() => {
      result.current.setSamplerType('GIBBS');
    });

    act(() => {
      result.current.step();
    });
    expect(GibbsSampler.prototype.step).toHaveBeenCalled();
    expect(HMCSampler.prototype.step).not.toHaveBeenCalled();
  });

  it('should maintain sampler type after reset', () => {
    const { result } = renderHook(() => useSamplingController());

    act(() => {
      result.current.setSamplerType('GIBBS');
      result.current.reset();
    });

    expect(result.current.samplerType).toBe('GIBBS');
    // reset re-instantiates or ensures sampler
    expect(GibbsSampler).toHaveBeenCalled();
  });
});
