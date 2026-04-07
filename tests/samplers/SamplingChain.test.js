import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SamplingChain } from '../../src/samplers/SamplingChain';
import { HMCSampler } from '../../src/samplers/HMCSampler';
import { GibbsSampler } from '../../src/samplers/GibbsSampler';
import { DEFAULT_SAMPLER_PARAMS } from '../../src/samplers/defaultConfigs';

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

describe('SamplingChain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    // Test case 1: Initializes with HMC by default
    it('should initialize with HMC by default when no samplerType provided', () => {
      const chain = new SamplingChain({ id: 0 });
      expect(chain.samplerType).toBe('HMC');
      expect(HMCSampler).toHaveBeenCalled();
      expect(GibbsSampler).not.toHaveBeenCalled();
    });

    // Test case 2: Initializes with Gibbs when specified
    it('should initialize with GibbsSampler when samplerType is GIBBS', () => {
      const chain = new SamplingChain({ id: 1, samplerType: 'GIBBS' });
      expect(chain.samplerType).toBe('GIBBS');
      expect(GibbsSampler).toHaveBeenCalled();
      expect(HMCSampler).not.toHaveBeenCalled();
    });

    it('should initialize with default parameters for HMC', () => {
      const chain = new SamplingChain({ id: 1, samplerType: 'HMC' });
      expect(chain.id).toBe(1);
      expect(chain.samplerType).toBe('HMC');
      expect(chain.params).toEqual(DEFAULT_SAMPLER_PARAMS.HMC);
      expect(HMCSampler).toHaveBeenCalledWith(DEFAULT_SAMPLER_PARAMS.HMC, null);
    });

    it('should initialize with default parameters for GIBBS', () => {
      const chain = new SamplingChain({ id: 2, samplerType: 'GIBBS' });
      expect(chain.id).toBe(2);
      expect(chain.samplerType).toBe('GIBBS');
      expect(chain.params).toEqual(DEFAULT_SAMPLER_PARAMS.GIBBS);
      expect(GibbsSampler).toHaveBeenCalledWith(
        DEFAULT_SAMPLER_PARAMS.GIBBS,
        null
      );
    });

    it('should override defaults if params are provided', () => {
      const customParams = { epsilon: 0.05, L: 20 };
      const chain = new SamplingChain({
        id: 1,
        samplerType: 'HMC',
        params: customParams,
      });
      expect(chain.params).toEqual(customParams);
      expect(HMCSampler).toHaveBeenCalledWith(customParams, null);
    });
  });

  describe('Step Behavior', () => {
    // Test case 3: step() updates currentParticle
    it('should update currentParticle.q after one step', () => {
      const chain = new SamplingChain({ id: 1 });
      const initialQ = { ...chain.currentParticle.q };
      const mockResult = {
        q: { x: 2.5, y: 3.5 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [
          { x: 0, y: 0 },
          { x: 2.5, y: 3.5 },
        ],
      };
      HMCSampler.prototype.step.mockReturnValueOnce(mockResult);

      chain.step({});

      expect(chain.currentParticle.q).not.toEqual(initialQ);
      expect(chain.currentParticle.q).toEqual({ x: 2.5, y: 3.5 });
    });

    // Test case 4: step() increments samples on acceptance
    it('should increment samples.length when step is accepted', () => {
      const chain = new SamplingChain({ id: 1 });
      const mockResult = {
        q: { x: 1, y: 1 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      };
      HMCSampler.prototype.step.mockReturnValueOnce(mockResult);

      chain.step({});

      expect(chain.samples).toHaveLength(1);
      expect(chain.acceptedCount).toBe(1);
      expect(chain.rejectedCount).toBe(0);
    });

    // Test case 5: step() increments rejectedCount on rejection
    it('should increment rejectedCount when step is rejected', () => {
      const chain = new SamplingChain({ id: 1 });
      const mockResult = {
        q: { x: 0, y: 0 },
        p: { x: 0, y: 0 },
        accepted: false,
        trajectory: [
          { x: 0, y: 0 },
          { x: 0.5, y: 0.5 },
        ],
      };
      HMCSampler.prototype.step.mockReturnValueOnce(mockResult);

      chain.step({});

      expect(chain.samples).toHaveLength(0);
      expect(chain.rejectedCount).toBe(1);
      expect(chain.acceptedCount).toBe(0);
    });

    // Test case 6: step() returns null-safe on missing sampler
    it('should return null without throwing when sampler is null', () => {
      const chain = new SamplingChain({ id: 1 });
      chain.sampler = null;

      let result;
      expect(() => {
        result = chain.step({});
      }).not.toThrow();
      expect(result).toBeNull();
    });

    // Test case 7: step() catches logP errors
    it('should catch errors thrown by sampler.step, set error field, and return null', () => {
      const chain = new SamplingChain({ id: 1 });
      HMCSampler.prototype.step.mockImplementationOnce(() => {
        throw new Error('logP evaluation failed');
      });

      const result = chain.step({});

      expect(result).toBeNull();
      expect(chain.error).toBe('logP evaluation failed');
      // Counts must not change
      expect(chain.samples).toHaveLength(0);
      expect(chain.rejectedCount).toBe(0);
    });

    it('should call sampler.step and update state for accepted step', () => {
      const chain = new SamplingChain({ id: 1 });
      const mockResult = {
        q: { x: 1, y: 1 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      };
      HMCSampler.prototype.step.mockReturnValueOnce(mockResult);

      const logpInstance = {}; // mock
      const result = chain.step(logpInstance);

      expect(HMCSampler.prototype.step).toHaveBeenCalledWith(
        { q: { x: 0, y: 0 }, p: { x: 0, y: 0 } },
        logpInstance
      );

      expect(result).toBe(mockResult);
      expect(chain.samples).toHaveLength(1);
      expect(chain.samples[0]).toEqual({ x: 1, y: 1 });
      expect(chain.trajectory).toHaveLength(2);
      expect(chain.rejectedCount).toBe(0);
      expect(chain.currentParticle.q).toEqual({ x: 1, y: 1 });
    });

    it('should update state appropriately for rejected step', () => {
      const chain = new SamplingChain({ id: 1 });
      const mockResult = {
        q: { x: 0, y: 0 },
        p: { x: 0, y: 0 },
        accepted: false,
        trajectory: [
          { x: 0, y: 0 },
          { x: 0.5, y: 0.5 },
        ],
      };
      HMCSampler.prototype.step.mockReturnValueOnce(mockResult);

      chain.step({});

      expect(chain.samples).toHaveLength(0);
      expect(chain.trajectory).toHaveLength(2);
      expect(chain.rejectedCount).toBe(1);
      expect(chain.currentParticle.q).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Parameter Mutation', () => {
    // Test case 8: setParams() propagates to sampler
    it('should call sampler.setParams with the correct subset of params', () => {
      const chain = new SamplingChain({ id: 1, samplerType: 'HMC' });
      chain.setParams({ L: 15 });
      expect(chain.params.L).toBe(15);
      expect(chain.params.epsilon).toBe(0.1); // remains unchanged
      expect(HMCSampler.prototype.setParams).toHaveBeenCalledWith({
        epsilon: 0.1,
        L: 15,
        steps: 1,
      });
    });

    it('should update params correctly', () => {
      const chain = new SamplingChain({ id: 1 });
      chain.setParams({ L: 15 });
      expect(chain.params.L).toBe(15);
      expect(chain.params.epsilon).toBe(0.1); // remains unchanged
      expect(HMCSampler.prototype.setParams).toHaveBeenCalledWith({
        epsilon: 0.1,
        L: 15,
        steps: 1,
      });
    });
  });

  describe('Sampler Switching', () => {
    // Test case 9: setSamplerType() resets samples and trajectory
    it('should reset samples and trajectory and create GibbsSampler when switching HMC→GIBBS', () => {
      const chain = new SamplingChain({ id: 1, samplerType: 'HMC' });
      // Simulate some sampling
      chain.samples = [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ];
      chain.trajectory = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ];
      chain.rejectedCount = 3;
      chain.acceptedCount = 2;

      chain.setSamplerType('GIBBS');

      expect(chain.samplerType).toBe('GIBBS');
      expect(chain.params).toEqual(DEFAULT_SAMPLER_PARAMS.GIBBS);
      expect(GibbsSampler).toHaveBeenCalledWith(
        DEFAULT_SAMPLER_PARAMS.GIBBS,
        null
      );
      expect(chain.samples).toHaveLength(0);
      expect(chain.trajectory).toHaveLength(0);
      expect(chain.rejectedCount).toBe(0);
      expect(chain.acceptedCount).toBe(0);
    });

    it('should transition to new sampler and reset internal stats', () => {
      const chain = new SamplingChain({ id: 1, samplerType: 'HMC' });
      // mock a step
      chain.samples = [{ x: 1, y: 1 }];
      chain.rejectedCount = 2;

      chain.setSamplerType('GIBBS');

      expect(chain.samplerType).toBe('GIBBS');
      expect(chain.params).toEqual(DEFAULT_SAMPLER_PARAMS.GIBBS);
      expect(GibbsSampler).toHaveBeenCalledWith(
        DEFAULT_SAMPLER_PARAMS.GIBBS,
        null
      );
      expect(chain.samples).toHaveLength(0);
      expect(chain.rejectedCount).toBe(0);
    });
  });

  describe('Reset and Seeding', () => {
    // Test case 10: reset() restores initial position
    it('should restore currentParticle.q to initialPosition after reset', () => {
      const chain = new SamplingChain({
        id: 1,
        initialPosition: { x: 5, y: -3 },
      });
      // Simulate sampling steps
      HMCSampler.prototype.step.mockReturnValue({
        q: { x: 99, y: 99 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [],
      });
      chain.step({});
      chain.step({});
      chain.step({});

      expect(chain.samples).toHaveLength(3);
      expect(chain.currentParticle.q).toEqual({ x: 99, y: 99 });

      chain.reset();

      expect(chain.currentParticle.q).toEqual({ x: 5, y: -3 });
      expect(chain.samples).toHaveLength(0);
      expect(chain.trajectory).toHaveLength(0);
      expect(chain.rejectedCount).toBe(0);
      expect(chain.acceptedCount).toBe(0);
    });

    it('should reset properly', () => {
      const chain = new SamplingChain({
        id: 1,
        initialPosition: { x: 2, y: 3 },
      });
      chain.samples = [{ x: 1, y: 1 }];
      chain.rejectedCount = 1;

      chain.reset();

      expect(chain.samples).toHaveLength(0);
      expect(chain.rejectedCount).toBe(0);
      expect(chain.trajectory).toHaveLength(0);
      expect(chain.currentParticle.q).toEqual({ x: 2, y: 3 });
    });

    it('should update seed properly and reseed underlying sampler', () => {
      const chain = new SamplingChain({ id: 1, seed: 42 });
      chain.setSeed(100);
      expect(chain.seed).toBe(100);
      expect(HMCSampler.prototype.setSeed).toHaveBeenCalledWith(100);
    });
  });

  describe('acceptedCount tracking', () => {
    it('should start with acceptedCount of 0', () => {
      const chain = new SamplingChain({ id: 1 });
      expect(chain.acceptedCount).toBe(0);
    });

    it('should increment acceptedCount on each accepted step', () => {
      const chain = new SamplingChain({ id: 1 });
      HMCSampler.prototype.step.mockReturnValue({
        q: { x: 1, y: 1 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [],
      });

      chain.step({});
      chain.step({});
      chain.step({});

      expect(chain.acceptedCount).toBe(3);
      expect(chain.rejectedCount).toBe(0);
    });

    it('should reset acceptedCount to 0 on reset()', () => {
      const chain = new SamplingChain({ id: 1 });
      HMCSampler.prototype.step.mockReturnValue({
        q: { x: 1, y: 1 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [],
      });
      chain.step({});
      chain.step({});

      chain.reset();

      expect(chain.acceptedCount).toBe(0);
    });
  });
});
