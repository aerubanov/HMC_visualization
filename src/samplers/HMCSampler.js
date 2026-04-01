/**
 * HMCSampler class
 * Encapsulates Hamiltonian Monte Carlo sampling logic
 */

/**
 * Generate a standard normal random variable using Box-Muller transform
 * @param {Object} [rng] - Optional seeded RNG with random() method
 * @returns {number} Sample from N(0, 1)
 */
function randn(rng = null) {
  const randomFn = rng ? () => rng.random() : Math.random;
  const u1 = randomFn();
  const u2 = randomFn();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Leapfrog integrator for Hamiltonian dynamics
 * Implements symplectic integration:
 *   p_{t+ε/2} = p_t - (ε/2) * ∇U(q_t)
 *   q_{t+ε} = q_t + ε * p_{t+ε/2}
 *   p_{t+ε} = p_{t+ε/2} - (ε/2) * ∇U(q_{t+ε})
 * @param {Object} q - Position {x, y}
 * @param {Object} p - Momentum {x, y}
 * @param {number} epsilon - Step size
 * @param {Function} gradU - Gradient function (x, y) => {x, y}
 * @returns {Object} {q: {x, y}, p: {x, y}}
 */
export function leapfrogStep(q, p, epsilon, gradU) {
  // Half-step momentum update
  const grad = gradU(q.x, q.y);
  const p_half = {
    x: p.x - (epsilon / 2) * grad.x,
    y: p.y - (epsilon / 2) * grad.y,
  };

  // Full-step position update
  const q_new = {
    x: q.x + epsilon * p_half.x,
    y: q.y + epsilon * p_half.y,
  };

  // Final half-step momentum update
  const grad_new = gradU(q_new.x, q_new.y);
  const p_new = {
    x: p_half.x - (epsilon / 2) * grad_new.x,
    y: p_half.y - (epsilon / 2) * grad_new.y,
  };

  return { q: q_new, p: p_new };
}

/**
 * Generate a proposal using HMC dynamics
 * @param {Object} q - Current position {x, y}
 * @param {number} epsilon - Step size
 * @param {number} L - Number of leapfrog steps
 * @param {Function} U - Potential function (x, y) => number
 * @param {Function} gradU - Gradient function (x, y) => {x, y}
 * @param {Object} [rng] - Optional seeded RNG. If not provided, uses Math.random()
 * @returns {Object} {q_proposed, p_proposed, H_initial, H_proposed, trajectory}
 */
export function generateProposal(q, epsilon, L, U, gradU, rng = null) {
  // 1. Sample initial momentum from N(0, I)
  const p_initial = {
    x: randn(rng),
    y: randn(rng),
  };

  // 2. Compute initial Hamiltonian
  const K_initial =
    0.5 * (p_initial.x * p_initial.x + p_initial.y * p_initial.y);
  const U_initial = U(q.x, q.y);
  const H_initial = K_initial + U_initial;

  // 3. Simulate dynamics for L steps
  let q_proposed = { x: q.x, y: q.y };
  let p_proposed = { x: p_initial.x, y: p_initial.y };
  const trajectory = [{ x: q.x, y: q.y }];

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
 * Execute one full HMC step
 * @param {Object} q - Current position {x, y}
 * @param {number} epsilon - Step size
 * @param {number} L - Number of leapfrog steps
 * @param {Function} U - Potential function (x, y) => number
 * @param {Function} gradU - Gradient function (x, y) => {x, y}
 * @param {Object} [rng] - Optional seeded RNG. If not provided, uses Math.random()
 * @returns {Object} {q: {x, y}, p: {x, y}, accepted: boolean, trajectory: Array<{x, y}>}
 */
export function hmcStep(q, epsilon, L, U, gradU, rng = null) {
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
      trajectory: proposal.trajectory, // Return trajectory even for rejected steps
    };
  }
}

import { BaseSampler } from './BaseSampler';

export class HMCSampler extends BaseSampler {
  /**
   * Create a new HMC Sampler
   * @param {Object} params - HMC parameters { epsilon, L }
   * @param {number|null} [seed] - Random seed
   */
  constructor(params = {}, seed = null) {
    super(seed);
    this.epsilon = params.epsilon || 0.1;
    this.L = params.L || 10;
  }

  /**
   * Update sampler parameters
   * @param {Object} params - Partial parameters { epsilon, L }
   */
  setParams(params) {
    if (params.epsilon !== undefined) this.epsilon = params.epsilon;
    if (params.L !== undefined) this.L = params.L;
  }

  /**
   * Perform one sampling step
   * @param {Object} currentState - Current particle state { q: {x, y}, ... }
   * @param {Object} logPInstance - Log probability instance with getLogProbability and getLogProbabilityGradient
   * @returns {Object} Result of hmcStep { q, p, accepted, trajectory }
   */
  step(currentState, logPInstance) {
    const U = (x, y) => -logPInstance.getLogProbability(x, y);
    const gradU = (x, y) => {
      const [dx, dy] = logPInstance.getLogProbabilityGradient(x, y);
      return { x: -dx, y: -dy };
    };

    return hmcStep(currentState.q, this.epsilon, this.L, U, gradU, this.rng);
  }
}
