import { HMCSampler } from './HMCSampler';
import { GibbsSampler } from './GibbsSampler';
import { DEFAULT_SAMPLER_PARAMS } from './defaultConfigs';

export class SamplingChain {
  constructor(config = {}) {
    // Skeleton for now, to support tests
    this.id = config.id || 0;
    this.samplerType = config.samplerType || 'HMC';
    this.params = config.params || { ...DEFAULT_SAMPLER_PARAMS[this.samplerType] };
    this.initialPosition = config.initialPosition || { x: 0, y: 0 };
    this.seed = config.seed !== undefined ? config.seed : null;
    
    this.samples = [];
    this.trajectory = [];
    this.rejectedCount = 0;
    this.currentParticle = { q: { ...this.initialPosition }, p: { x: 0, y: 0 } };
    
    this.sampler = null;
  }

  setParams(newParams) {}
  setSamplerType(type) {}
  setSeed(seed) {}
  step(logpInstance) {}
  reset() {}
}
