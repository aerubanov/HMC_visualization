import { describe, it, expect, beforeEach } from 'vitest';
import { GibbsSampler } from '../../src/samplers/GibbsSampler';

describe('GibbsSampler', () => {
  let sampler;
  const mockLogP = {
    getLogProbability: () => -1,
    getLogProbabilityGradient: () => [0, 0],
  };

  beforeEach(() => {
    sampler = new GibbsSampler();
  });

  it('should initialize with default parameters', () => {
    expect(sampler.params).toEqual({});
    expect(sampler.seed).toBeNull();
  });

  it('should update parameters via setParams', () => {
    sampler.setParams({ test: 123 });
    expect(sampler.params).toEqual({ test: 123 });
  });

  it('should set seed correctly', () => {
    sampler.setSeed(42);
    expect(sampler.seed).toBe(42);
    expect(sampler.rng).toBeDefined();
  });

  it('should perform a step and return correct structure', () => {
    const startState = { q: { x: 0, y: 0 } };
    const result = sampler.step(startState, mockLogP);

    expect(result).toHaveProperty('q');
    expect(result).toHaveProperty('p');
    expect(result).toHaveProperty('accepted');
    expect(result).toHaveProperty('trajectory');

    // With flat logP, it might move or stay, but trajectory should represent Manhattan steps
    // (x,y) -> (x', y) -> (x', y')
    expect(result.trajectory).toHaveLength(3);
    const [p0, p1, p2] = result.trajectory;

    expect(p0.x).toBe(startState.q.x);
    expect(p0.y).toBe(startState.q.y);

    expect(p1.y).toBe(p0.y); // First step changes X only (Y constant)
    expect(p2.x).toBe(p1.x); // Second step changes Y only (X constant)
  });

  it('should be reproducible with seed', () => {
    const startState = { q: { x: 0, y: 0 } };

    const sampler1 = new GibbsSampler({}, 123);
    const result1 = sampler1.step(startState, mockLogP);

    const sampler2 = new GibbsSampler({}, 123);
    const result2 = sampler2.step(startState, mockLogP);

    expect(result1.q).toEqual(result2.q);
  });
});
