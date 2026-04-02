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
      expect(GibbsSampler).toHaveBeenCalledWith(DEFAULT_SAMPLER_PARAMS.GIBBS, null);
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
    it('should call sampler.step and update state for accepted step', () => {
      const chain = new SamplingChain({ id: 1 });
      const mockResult = {
        q: { x: 1, y: 1 },
        p: { x: 0, y: 0 },
        accepted: true,
        trajectory: [{ x: 0, y: 0 }, { x: 1, y: 1 }]
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
        trajectory: [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }]
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
    it('should update params correctly', () => {
      const chain = new SamplingChain({ id: 1 });
      chain.setParams({ L: 15 });
      expect(chain.params.L).toBe(15);
      expect(chain.params.epsilon).toBe(0.1); // remains unchanged
      expect(HMCSampler.prototype.setParams).toHaveBeenCalledWith({ epsilon: 0.1, L: 15, steps: 1 });
    });
  });

  describe('Sampler Switching', () => {
    it('should transition to new sampler and reset internal stats', () => {
      const chain = new SamplingChain({ id: 1, samplerType: 'HMC' });
      // mock a step
      chain.samples = [{ x: 1, y: 1 }];
      chain.rejectedCount = 2;

      chain.setSamplerType('GIBBS');

      expect(chain.samplerType).toBe('GIBBS');
      expect(chain.params).toEqual(DEFAULT_SAMPLER_PARAMS.GIBBS);
      expect(GibbsSampler).toHaveBeenCalledWith(DEFAULT_SAMPLER_PARAMS.GIBBS, null);
      expect(chain.samples).toHaveLength(0);
      expect(chain.rejectedCount).toBe(0);
    });
  });

  describe('Reset and Seeding', () => {
    it('should reset properly', () => {
      const chain = new SamplingChain({ id: 1, initialPosition: { x: 2, y: 3 } });
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
});
