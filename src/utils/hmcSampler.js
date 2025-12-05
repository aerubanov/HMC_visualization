// HMC Sampler - Physics simulation
// Implements leapfrog integration and Metropolis-Hastings acceptance

/**
 * Generate a standard normal random variable using Box-Muller transform
 * @returns {number} Sample from N(0, 1)
 */
function randn() {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Leapfrog integrator for Hamiltonian dynamics
 * Implements symplectic integration:
 *   p_{t+ε/2} = p_t - (ε/2) * ∇U(q_t)
 *   q_{t+ε} = q_t + ε * p_{t+ε/2}
 *   p_{t+ε} = p_{t+ε/2} - (ε/2) * ∇U(q_{t+ε})
 *
 * @param {Object} q - Position {x, y}
 * @param {Object} p - Momentum {x, y}
 * @param {number} epsilon - Step size
 * @param {Function} gradU - Gradient function (x, y) => {x, y}
 * @returns {Object} {q: {x, y}, p: {x, y}}
 */
export function leapfrog(q, p, epsilon, gradU) {
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
 * Execute one full HMC step
 * Algorithm:
 *   1. Sample momentum p ~ N(0, I)
 *   2. Simulate dynamics for L steps using leapfrog
 *   3. Compute energy change ΔH = H(q*, p*) - H(q, p)
 *   4. Accept with probability min(1, e^(-ΔH))
 *
 * @param {Object} q - Current position {x, y}
 * @param {number} epsilon - Step size
 * @param {number} L - Number of leapfrog steps
 * @param {Function} U - Potential function (x, y) => number
 * @param {Function} gradU - Gradient function (x, y) => {x, y}
 * @returns {Object} {q: {x, y}, p: {x, y}, accepted: boolean, trajectory: Array<{x, y}>}
 */
export function step(q, epsilon, L, U, gradU) {
  // 1. Sample initial momentum from N(0, I)
  const p_initial = {
    x: randn(),
    y: randn(),
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
    const result = leapfrog(q_proposed, p_proposed, epsilon, gradU);
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

  // 6. Metropolis acceptance step
  const deltaH = H_proposed - H_initial;
  const acceptProb = Math.min(1, Math.exp(-deltaH));
  const accepted = Math.random() < acceptProb;

  // 7. Return result
  if (accepted) {
    return {
      q: q_proposed,
      p: p_proposed,
      accepted: true,
      trajectory: trajectory,
    };
  } else {
    // Rejected: return original position but still return the proposed trajectory
    return {
      q: q,
      p: { x: 0, y: 0 },
      accepted: false,
      trajectory: trajectory, // Return trajectory even for rejected steps
    };
  }
}
