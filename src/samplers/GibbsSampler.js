import { SeededRandom } from '../utils/seededRandom';

export class GibbsSampler {
  /**
   * Create a new Gibbs Sampler (Mock)
   * @param {Object} params - Sampler parameters (placeholder)
   * @param {number|null} [seed] - Random seed
   */
  constructor(params = {}, seed = null) {
    this.params = params;
    this.seed = seed;
    this.rng = seed !== null ? new SeededRandom(seed) : null;
  }

  /**
   * Update sampler parameters
   * @param {Object} params - Partial parameters
   */
  setParams(params) {
    this.params = { ...this.params, ...params };
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
   * Perform one sampling step (Mock)
   * @param {Object} currentState - Current particle state { q: {x, y} }
   * @param {Object} logPInstance - Log probability instance (unused in mock)
   * @returns {Object} Result { q, p, accepted, trajectory }
   */
  step(currentState, _logPInstance) {
    // Mock logic: randomly perturb position slightly to simulate movement
    const randomFn = this.rng ? () => this.rng.random() : Math.random;

    // Simple random walk for mock visualization
    const stepSize = 0.5;
    const dx = (randomFn() - 0.5) * stepSize;
    const dy = (randomFn() - 0.5) * stepSize;

    const q_new = {
      x: currentState.q.x + dx,
      y: currentState.q.y + dy,
    };

    // Gibbs doesn't use momentum in the same way, but we return 0 for compatibility
    const p_new = { x: 0, y: 0 };

    const trajectory = [
      { x: currentState.q.x, y: currentState.q.y },
      { x: q_new.x, y: q_new.y },
    ];

    return {
      q: q_new,
      p: p_new,
      accepted: true, // Always accept in this mock
      trajectory: trajectory,
    };
  }
}
