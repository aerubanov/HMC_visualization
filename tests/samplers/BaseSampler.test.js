import { describe, it, expect, vi } from 'vitest';
import { BaseSampler } from '../../src/samplers/BaseSampler';

vi.mock('../../src/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { logger } from '../../src/utils/logger';

class TestSampler extends BaseSampler {
  constructor(seed) {
    super(seed);
    this.params = {};
  }

  setParams(params) {
    this.params = { ...this.params, ...params };
  }

  step() {
    return { accepted: true };
  }
}

describe('BaseSampler', () => {
  it('should not allow direct instantiation', () => {
    expect(() => new BaseSampler()).toThrow(TypeError);
  });

  it('should allow instantiation of concrete implementation', () => {
    const sampler = new TestSampler(null);
    expect(sampler).toBeInstanceOf(BaseSampler);
    expect(sampler).toBeInstanceOf(TestSampler);
  });

  it('should initialize with null seed', () => {
    const sampler = new TestSampler(null);
    expect(sampler.seed).toBeNull();
    expect(sampler.rng).toBeNull();
  });

  it('should initialize with specific seed', () => {
    const sampler = new TestSampler(42);
    expect(sampler.seed).toBe(42);
    expect(sampler.rng).toBeDefined();
    expect(typeof sampler.rng.random).toBe('function');
  });

  it('should update seed via setSeed', () => {
    const sampler = new TestSampler(null);
    sampler.setSeed(123);
    expect(sampler.seed).toBe(123);
    expect(sampler.rng).toBeDefined();
  });

  it('setSeed(42) calls logger.debug', () => {
    const sampler = new TestSampler(null);
    vi.clearAllMocks();
    sampler.setSeed(42);
    expect(logger.debug).toHaveBeenCalledWith(
      'BaseSampler seed set',
      expect.objectContaining({ seed: 42 })
    );
  });
});
