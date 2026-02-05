import { SeededRandom } from '../utils/seededRandom';

/**
 * Base abstract class for all samplers.
 * Enforces a common interface and handles random seed management.
 */
export class BaseSampler {
  /**
   * Create a new Sampler
   * @param {number|null} [seed] - Random seed
   */
  constructor(seed = null) {
    if (new.target === BaseSampler) {
      throw new TypeError('Cannot construct BaseSampler instances directly');
    }
    this.setSeed(seed);
  }

  /**
   * Set the random seed
   * @param {number|null} seed - New seed or null
   */
  setSeed(seed) {
    this.seed = seed;
    this.rng = seed !== null ? new SeededRandom(seed) : null;
  }

  /**
   * Update sampler parameters
   * @param {Object} params - Partial parameters
   */
  setParams(_params) {
    throw new Error("Method 'setParams()' must be implemented.");
  }

  /**
   * Perform one sampling step
   * @param {Object} currentState - Current particle state
   * @param {Object} logPInstance - Log probability instance
   * @returns {Object} Result { q, p, accepted, trajectory }
   */
  step(_currentState, _logPInstance) {
    throw new Error("Method 'step()' must be implemented.");
  }
}
