import { BaseSampler, type Particle } from './BaseSampler';
import { sampleSlice } from '../utils/sliceSampler';
import { logger } from '../utils/logger';
import type { GibbsParams, StepResult } from '../types';
import type { Logp } from '../utils/mathEngine';
import type { SeededRandom } from '../utils/seededRandom';

/**
 * Gibbs sampler using coordinate-wise slice sampling.
 * Always accepts; produces "Manhattan" trajectories in 2D.
 */
export class GibbsSampler extends BaseSampler {
  /** Current Gibbs parameters (slice width etc.). */
  public params: GibbsParams;

  /**
   * Create a new Gibbs sampler.
   * @param params - Initial Gibbs parameters `{ w }`.
   * @param seed - Optional random seed.
   */
  constructor(params: Partial<GibbsParams> = {}, seed: number | null = null) {
    super(seed);
    this.params = { w: 1.0, ...params };
    logger.debug('GibbsSampler initialised', { ...this.params, seed });
  }

  /**
   * Update Gibbs sampler parameters.
   * @param params - Partial parameter object; only provided keys are updated.
   */
  setParams(params: Partial<GibbsParams & Record<string, unknown>>): void {
    this.params = { ...this.params, ...params } as GibbsParams;
    logger.debug('GibbsSampler params updated', { ...params });
  }

  /**
   * Perform one Gibbs sampling step using coordinate-wise slice sampling.
   * Updates X given Y, then Y given the new X.
   * @param currentState - Current particle `{ q, p }`.
   * @param logPInstance - Compiled log-probability instance.
   * @returns Step result `{ q, p, accepted: true, trajectory }`.
   */
  step(currentState: Particle, logPInstance: Logp): StepResult {
    const { x: currentX, y: currentY } = currentState.q;

    // 1. Update X given Y: P(x | y) ~ P(x, y)
    const logPx = (x: number) => logPInstance.getLogProbability(x, currentY);
    const nextX = sampleSlice(
      logPx,
      currentX,
      this.params.w,
      this.rng as SeededRandom | null
    );

    // 2. Update Y given new X: P(y | x) ~ P(x, y)
    const logPy = (y: number) => logPInstance.getLogProbability(nextX, y);
    const nextY = sampleSlice(
      logPy,
      currentY,
      this.params.w,
      this.rng as SeededRandom | null
    );

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
      accepted: true, // Gibbs always accepts
      trajectory: trajectory,
    };
  }
}
