import { BaseSampler } from './BaseSampler';
import { sampleSlice } from '../utils/sliceSampler';

export class GibbsSampler extends BaseSampler {
  /**
   * Create a new Gibbs Sampler (Mock)
   * @param {Object} params - Sampler parameters (placeholder)
   * @param {number|null} [seed] - Random seed
   */
  constructor(params = {}, seed = null) {
    super(seed);
    this.params = params;
  }

  /**
   * Update sampler parameters
   * @param {Object} params - Partial parameters
   */
  setParams(params) {
    this.params = { ...this.params, ...params };
  }

  /**
   * Perform one sampling step
   * @param {Object} currentState - Current particle state { q: {x, y} }
   * @param {Object} logPInstance - Log probability instance
   * @returns {Object} Result { q, p, accepted, trajectory }
   */
  step(currentState, logPInstance) {
    const { x: currentX, y: currentY } = currentState.q;

    // 1. Update X given Y
    // P(x | y) ~ P(x, y)
    const logPx = (x) => logPInstance.getLogProbability(x, currentY);
    const nextX = sampleSlice(logPx, currentX, 1.0, this.rng);

    // 2. Update Y given new X
    // P(y | x) ~ P(x, y)
    const logPy = (y) => logPInstance.getLogProbability(nextX, y);
    const nextY = sampleSlice(logPy, currentY, 1.0, this.rng);

    const q_new = { x: nextX, y: nextY };
    const p_new = { x: 0, y: 0 }; // Gibbs doesn't use momentum

    // Trajectory shows "Manhattan" updates: (x0, y0) -> (x1, y0) -> (x1, y1)
    const trajectory = [
      { x: currentX, y: currentY },
      { x: nextX, y: currentY },
      { x: nextX, y: nextY },
    ];

    return {
      q: q_new,
      p: p_new,
      accepted: true, // Gibbs is always accepted
      trajectory: trajectory,
    };
  }
}
