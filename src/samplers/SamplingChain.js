import { HMCSampler } from './HMCSampler';
import { GibbsSampler } from './GibbsSampler';
import { DEFAULT_SAMPLER_PARAMS } from './defaultConfigs';

export class SamplingChain {
  constructor(config = {}) {
    this.id = config.id || 0;
    this.samplerType = config.samplerType || 'HMC';
    this.params = config.params || { ...DEFAULT_SAMPLER_PARAMS[this.samplerType] };
    this.initialPosition = config.initialPosition || { x: 0, y: 0 };
    this.seed = config.seed !== undefined ? config.seed : null;
    
    this.samples = [];
    this.trajectory = [];
    this.rejectedCount = 0;
    this.currentParticle = { q: { ...this.initialPosition }, p: { x: 0, y: 0 } };
    
    this._initializeSampler();
  }

  _initializeSampler() {
    if (this.samplerType === 'GIBBS') {
      this.sampler = new GibbsSampler(this.params, this.seed);
    } else {
      this.sampler = new HMCSampler(this.params, this.seed);
    }
  }

  setParams(newParams) {
    this.params = { ...this.params, ...newParams };
    if (this.sampler && this.sampler.setParams) {
      this.sampler.setParams(this.params);
    }
  }

  setSamplerType(type) {
    if (this.samplerType !== type) {
      this.samplerType = type;
      this.params = { ...DEFAULT_SAMPLER_PARAMS[type] };
      this._initializeSampler();
      // Internal reset but keeping initial pos and seed
      this.samples = [];
      this.trajectory = [];
      this.rejectedCount = 0;
      this.currentParticle = { q: { ...this.initialPosition }, p: { x: 0, y: 0 } };
    }
  }

  setSeed(seed) {
    this.seed = seed;
    if (this.sampler && this.sampler.setSeed) {
      this.sampler.setSeed(seed);
    }
  }

  step(logpInstance) {
    if (!this.sampler) return null;
    try {
      const result = this.sampler.step(this.currentParticle, logpInstance);
      
      this.currentParticle = {
        q: result.q,
        p: result.p || { x: 0, y: 0 }
      };

      if (result.accepted) {
        this.samples.push(result.q);
      } else {
        this.rejectedCount++;
      }

      this.trajectory = result.trajectory || [];
      return result;
    } catch (error) {
      throw error;
    }
  }

  reset() {
    this._initializeSampler();
    this.samples = [];
    this.trajectory = [];
    this.rejectedCount = 0;
    this.currentParticle = { q: { ...this.initialPosition }, p: { x: 0, y: 0 } };
  }
}
