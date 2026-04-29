/**
 * HMCSampler — Hamiltonian Monte Carlo sampler.
 * Exports the class and three standalone helper functions used directly by tests.
 */

import { BaseSampler, type Particle } from './BaseSampler';
import { logger } from '../utils/logger';
import type { Point, HMCParams, StepResult } from '../types';
import type { Logp } from '../utils/mathEngine';
import type { SeededRandom } from '../utils/seededRandom';

/** Minimal RNG interface accepted by standalone functions (real or mock). */
interface Rng {
  random(): number;
}

/**
 * Generate a standard normal random variable using Box-Muller transform.
 * @param rng - Optional seeded RNG with a `random()` method. Defaults to `Math.random`.
 * @returns A sample from N(0, 1).
 */
function randn(rng: Rng | null = null): number {
  const randomFn = rng ? () => rng.random() : Math.random;
  const u1 = randomFn();
  const u2 = randomFn();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Gradient function type: maps position (x, y) to a gradient vector. */
type GradFn = (x: number, y: number) => Point;

/** Potential energy function type: maps position (x, y) to a scalar. */
type PotentialFn = (x: number, y: number) => number;

/**
 * Leapfrog integrator for Hamiltonian dynamics.
 * Implements one symplectic integration step:
 *   p_{t+ε/2} = p_t − (ε/2) ∇U(q_t)
 *   q_{t+ε}   = q_t + ε · p_{t+ε/2}
 *   p_{t+ε}   = p_{t+ε/2} − (ε/2) ∇U(q_{t+ε})
 * @param q - Current position `{ x, y }`.
 * @param p - Current momentum `{ x, y }`.
 * @param epsilon - Integration step size.
 * @param gradU - Gradient of the potential energy ∇U(x, y).
 * @returns Updated `{ q, p }` after one leapfrog step.
 */
export function leapfrogStep(
  q: Point,
  p: Point,
  epsilon: number,
  gradU: GradFn
): { q: Point; p: Point } {
  // Half-step momentum update
  const grad = gradU(q.x, q.y);
  const p_half: Point = {
    x: p.x - (epsilon / 2) * grad.x,
    y: p.y - (epsilon / 2) * grad.y,
  };

  // Full-step position update
  const q_new: Point = {
    x: q.x + epsilon * p_half.x,
    y: q.y + epsilon * p_half.y,
  };

  // Final half-step momentum update
  const grad_new = gradU(q_new.x, q_new.y);
  const p_new: Point = {
    x: p_half.x - (epsilon / 2) * grad_new.x,
    y: p_half.y - (epsilon / 2) * grad_new.y,
  };

  return { q: q_new, p: p_new };
}

/** Shape returned by {@link generateProposal}. */
interface Proposal {
  q_proposed: Point;
  p_proposed: Point;
  H_initial: number;
  H_proposed: number;
  trajectory: Point[];
}

/**
 * Generate an HMC proposal by simulating Hamiltonian dynamics.
 * @param q - Current position `{ x, y }`.
 * @param epsilon - Leapfrog step size.
 * @param L - Number of leapfrog steps.
 * @param U - Potential energy U(x, y) = −log p(x, y).
 * @param gradU - Gradient ∇U(x, y).
 * @param rng - Optional seeded RNG. Defaults to `Math.random` when null.
 * @returns `{ q_proposed, p_proposed, H_initial, H_proposed, trajectory }`.
 */
export function generateProposal(
  q: Point,
  epsilon: number,
  L: number,
  U: PotentialFn,
  gradU: GradFn,
  rng: Rng | null = null
): Proposal {
  // 1. Sample initial momentum from N(0, I)
  const p_initial: Point = {
    x: randn(rng),
    y: randn(rng),
  };

  // 2. Compute initial Hamiltonian
  const K_initial =
    0.5 * (p_initial.x * p_initial.x + p_initial.y * p_initial.y);
  const U_initial = U(q.x, q.y);
  const H_initial = K_initial + U_initial;

  // 3. Simulate dynamics for L steps
  let q_proposed: Point = { x: q.x, y: q.y };
  let p_proposed: Point = { x: p_initial.x, y: p_initial.y };
  const trajectory: Point[] = [{ x: q.x, y: q.y }];

  for (let i = 0; i < L; i++) {
    const result = leapfrogStep(q_proposed, p_proposed, epsilon, gradU);
    q_proposed = result.q;
    p_proposed = result.p;

    // Store trajectory point (copy to avoid reference issues)
    trajectory.push({ x: q_proposed.x, y: q_proposed.y });
  }

  // 4. Negate momentum to make proposal symmetric
  p_proposed = { x: -p_proposed.x, y: -p_proposed.y };

  // 5. Compute proposed Hamiltonian
  const K_proposed =
    0.5 * (p_proposed.x * p_proposed.x + p_proposed.y * p_proposed.y);
  const U_proposed = U(q_proposed.x, q_proposed.y);
  const H_proposed = K_proposed + U_proposed;

  return {
    q_proposed,
    p_proposed,
    H_initial,
    H_proposed,
    trajectory,
  };
}

/**
 * Execute one full HMC step including Metropolis acceptance.
 * @param q - Current position `{ x, y }`.
 * @param epsilon - Leapfrog step size.
 * @param L - Number of leapfrog steps.
 * @param U - Potential energy function.
 * @param gradU - Gradient of the potential energy.
 * @param rng - Optional seeded RNG. Defaults to `Math.random` when null.
 * @returns `{ q, p, accepted, trajectory }`.
 */
export function hmcStep(
  q: Point,
  epsilon: number,
  L: number,
  U: PotentialFn,
  gradU: GradFn,
  rng: Rng | null = null
): StepResult {
  const proposal = generateProposal(q, epsilon, L, U, gradU, rng);

  // 6. Metropolis acceptance step
  const deltaH = proposal.H_proposed - proposal.H_initial;
  const acceptProb = Math.min(1, Math.exp(-deltaH));
  const randomFn = rng ? () => rng.random() : Math.random;
  const accepted = randomFn() < acceptProb;

  // 7. Return result
  if (accepted) {
    return {
      q: proposal.q_proposed,
      p: proposal.p_proposed,
      accepted: true,
      trajectory: proposal.trajectory,
    };
  } else {
    // Rejected: return original position but still return the proposed trajectory
    return {
      q: q,
      p: { x: 0, y: 0 },
      accepted: false,
      trajectory: proposal.trajectory,
    };
  }
}

/**
 * Hamiltonian Monte Carlo sampler class.
 * Uses leapfrog integration followed by Metropolis acceptance.
 */
export class HMCSampler extends BaseSampler {
  /** Leapfrog step size. */
  public epsilon: number;

  /** Number of leapfrog steps per proposal. */
  public L: number;

  /**
   * Create a new HMC sampler.
   * @param params - Initial HMC parameters `{ epsilon, L }`.
   * @param seed - Optional random seed.
   */
  constructor(params: Partial<HMCParams> = {}, seed: number | null = null) {
    super(seed);
    this.epsilon = params.epsilon ?? 0.1;
    this.L = params.L ?? 10;
    logger.debug('HMCSampler initialised', {
      epsilon: this.epsilon,
      L: this.L,
      seed,
    });
  }

  /**
   * Update HMC parameters.
   * @param params - Partial parameter object; only provided keys are updated.
   */
  setParams(params: Partial<HMCParams>): void {
    if (params.epsilon !== undefined) this.epsilon = params.epsilon;
    if (params.L !== undefined) this.L = params.L;
    logger.debug('HMCSampler params updated', { ...params });
  }

  /**
   * Perform one HMC sampling step.
   * @param currentState - Current particle `{ q, p }`.
   * @param logPInstance - Compiled log-probability with gradient support.
   * @returns Step result `{ q, p, accepted, trajectory }`.
   */
  step(currentState: Particle, logPInstance: Logp): StepResult {
    const U: PotentialFn = (x, y) => -logPInstance.getLogProbability(x, y);
    const gradU: GradFn = (x, y) => {
      const [dx, dy] = logPInstance.getLogProbabilityGradient(x, y);
      return { x: -dx, y: -dy };
    };

    return hmcStep(
      currentState.q,
      this.epsilon,
      this.L,
      U,
      gradU,
      this.rng as SeededRandom | null
    );
  }
}
