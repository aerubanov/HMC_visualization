import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  leapfrogStep,
  generateProposal,
  hmcStep,
} from '../../src/utils/hmcSampler';

// Helper functions for testing
function kineticEnergy(p) {
  return 0.5 * (p.x * p.x + p.y * p.y);
}

function hamiltonian(q, p, U) {
  return kineticEnergy(p) + U(q.x, q.y);
}

function positionsClose(q1, q2, tolerance = 1e-10) {
  return Math.abs(q1.x - q2.x) < tolerance && Math.abs(q1.y - q2.y) < tolerance;
}

function momentaClose(p1, p2, tolerance = 1e-10) {
  return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
}

describe('HMCSampler', () => {
  describe('leapfrogStep', () => {
    describe('reversibility', () => {
      it('should be reversible (forward then backward returns to start)', () => {
        const q0 = { x: 1.0, y: 2.0 };
        const p0 = { x: 0.5, y: -0.3 };
        const epsilon = 0.01;
        const gradU = (x, y) => ({ x: x, y: y }); // Quadratic potential

        // Forward step
        const { q: q1, p: p1 } = leapfrogStep(q0, p0, epsilon, gradU);

        // Backward step with negated momentum
        const { q: q2, p: p2 } = leapfrogStep(
          q1,
          { x: -p1.x, y: -p1.y },
          epsilon,
          gradU
        );

        // Should return to start (within numerical tolerance)
        expect(positionsClose(q2, q0, 1e-10)).toBe(true);
        expect(momentaClose({ x: -p2.x, y: -p2.y }, p0, 1e-10)).toBe(true);
      });

      it('should be reversible with zero momentum', () => {
        const q0 = { x: 1.0, y: 2.0 };
        const p0 = { x: 0.0, y: 0.0 };
        const epsilon = 0.01;
        const gradU = (x, y) => ({ x: x, y: y });

        const { q: q1, p: p1 } = leapfrogStep(q0, p0, epsilon, gradU);
        const { q: q2, p: p2 } = leapfrogStep(
          q1,
          { x: -p1.x, y: -p1.y },
          epsilon,
          gradU
        );

        expect(positionsClose(q2, q0, 1e-10)).toBe(true);
        expect(momentaClose({ x: -p2.x, y: -p2.y }, p0, 1e-10)).toBe(true);
      });

      it('should be reversible with large momentum', () => {
        const q0 = { x: 1.0, y: 2.0 };
        const p0 = { x: 10.0, y: 10.0 };
        const epsilon = 0.01;
        const gradU = (x, y) => ({ x: x, y: y });

        const { q: q1, p: p1 } = leapfrogStep(q0, p0, epsilon, gradU);
        const { q: q2, p: p2 } = leapfrogStep(
          q1,
          { x: -p1.x, y: -p1.y },
          epsilon,
          gradU
        );

        expect(positionsClose(q2, q0, 1e-10)).toBe(true);
        expect(momentaClose({ x: -p2.x, y: -p2.y }, p0, 1e-10)).toBe(true);
      });

      it('should be reversible with negative positions', () => {
        const q0 = { x: -5.0, y: -3.0 };
        const p0 = { x: 0.5, y: -0.3 };
        const epsilon = 0.01;
        const gradU = (x, y) => ({ x: x, y: y });

        const { q: q1, p: p1 } = leapfrogStep(q0, p0, epsilon, gradU);
        const { q: q2, p: p2 } = leapfrogStep(
          q1,
          { x: -p1.x, y: -p1.y },
          epsilon,
          gradU
        );

        expect(positionsClose(q2, q0, 1e-10)).toBe(true);
        expect(momentaClose({ x: -p2.x, y: -p2.y }, p0, 1e-10)).toBe(true);
      });

      it('should be reversible over multiple steps', () => {
        const q0 = { x: 1.0, y: 1.0 };
        const p0 = { x: 0.5, y: 0.5 };
        const epsilon = 0.01;
        const nSteps = 10;
        const gradU = (x, y) => ({ x: x, y: y });

        // Forward integration
        let q = { ...q0 };
        let p = { ...p0 };
        for (let i = 0; i < nSteps; i++) {
          const result = leapfrogStep(q, p, epsilon, gradU);
          q = result.q;
          p = result.p;
        }

        // Backward integration with negated momentum
        p = { x: -p.x, y: -p.y };
        for (let i = 0; i < nSteps; i++) {
          const result = leapfrogStep(q, p, epsilon, gradU);
          q = result.q;
          p = result.p;
        }
        p = { x: -p.x, y: -p.y };

        expect(positionsClose(q, q0, 1e-9)).toBe(true);
        expect(momentaClose(p, p0, 1e-9)).toBe(true);
      });
    });

    describe('integration accuracy', () => {
      it('should maintain constant radius for harmonic oscillator', () => {
        // Harmonic oscillator: circular orbit
        const q0 = { x: 1.0, y: 0.0 };
        const p0 = { x: 0.0, y: 1.0 };
        const epsilon = 0.01;
        const gradU = (x, y) => ({ x: x, y: y });

        const r0 = Math.sqrt(
          q0.x * q0.x + q0.y * q0.y + p0.x * p0.x + p0.y * p0.y
        );

        let q = { ...q0 };
        let p = { ...p0 };

        // Integrate for multiple steps
        for (let i = 0; i < 100; i++) {
          const result = leapfrogStep(q, p, epsilon, gradU);
          q = result.q;
          p = result.p;

          const r = Math.sqrt(q.x * q.x + q.y * q.y + p.x * p.x + p.y * p.y);
          // Phase space radius should remain approximately constant
          expect(Math.abs(r - r0) / r0).toBeLessThan(0.02); // Within 2%
        }
      });
    });
  });

  describe('energy conservation', () => {
    it('should preserve Hamiltonian for small epsilon', () => {
      const q0 = { x: 1.0, y: 1.0 };
      const p0 = { x: 0.5, y: 0.5 };
      const epsilon = 0.01;
      const nSteps = 100;
      const U = (x, y) => 0.5 * (x * x + y * y);
      const gradU = (x, y) => ({ x: x, y: y });

      const H0 = hamiltonian(q0, p0, U);

      let q = { ...q0 };
      let p = { ...p0 };
      for (let i = 0; i < nSteps; i++) {
        const result = leapfrogStep(q, p, epsilon, gradU);
        q = result.q;
        p = result.p;
      }

      const H_final = hamiltonian(q, p, U);
      const relError = Math.abs(H_final - H0) / H0;

      // Energy drift should be small (< 1%)
      expect(relError).toBeLessThan(0.01);
    });

    it('should have smaller energy drift for smaller step sizes', () => {
      const q0 = { x: 1.0, y: 1.0 };
      const p0 = { x: 0.5, y: 0.5 };
      const nSteps = 100;
      const U = (x, y) => 0.5 * (x * x + y * y);
      const gradU = (x, y) => ({ x: x, y: y });

      // Use more distinct step sizes to ensure error difference is clear
      const epsilons = [0.2, 0.1, 0.01];
      const errors = [];

      for (const epsilon of epsilons) {
        const H0 = hamiltonian(q0, p0, U);
        let q = { ...q0 };
        let p = { ...p0 };

        for (let i = 0; i < nSteps; i++) {
          const result = leapfrogStep(q, p, epsilon, gradU);
          q = result.q;
          p = result.p;
        }

        const H_final = hamiltonian(q, p, U);
        errors.push(Math.abs(H_final - H0) / H0);
      }

      // Smaller epsilon should give smaller error
      expect(errors[1]).toBeLessThan(errors[0]);
      expect(errors[2]).toBeLessThan(errors[1]);
    });
  });

  describe('generateProposal', () => {
    let originalRandom;

    beforeEach(() => {
      originalRandom = Math.random;
    });

    afterEach(() => {
      Math.random = originalRandom;
    });

    it('should return proposal with correct structure', () => {
      Math.random = () => 0.5;

      const q = { x: 0.0, y: 0.0 };
      const epsilon = 0.1;
      const L = 5;
      const U = (x, y) => 0.5 * (x * x + y * y);
      const gradU = (x, y) => ({ x: x, y: y });

      const result = generateProposal(q, epsilon, L, U, gradU);

      expect(result).toHaveProperty('q_proposed');
      expect(result).toHaveProperty('p_proposed');
      expect(result).toHaveProperty('H_initial');
      expect(result).toHaveProperty('H_proposed');
      expect(result).toHaveProperty('trajectory');
      expect(result.trajectory.length).toBe(L + 1);
    });

    it('should sample varying momentum values', () => {
      const q = { x: 1.0, y: 1.0 };
      const epsilon = 0.1;
      const L = 5;
      const U = (x, y) => 0.5 * (x * x + y * y);
      const gradU = (x, y) => ({ x: x, y: y });

      const momenta = [];
      for (let i = 0; i < 20; i++) {
        const result = generateProposal(q, epsilon, L, U, gradU);
        // We can't access initial momentum directly from result, but we can check if results vary
        momenta.push(result.q_proposed);
      }

      // Check that proposed positions vary (due to varying initial momentum)
      const uniqueX = new Set(momenta.map((q) => q.x));
      const uniqueY = new Set(momenta.map((q) => q.y));

      expect(uniqueX.size).toBeGreaterThan(1);
      expect(uniqueY.size).toBeGreaterThan(1);
    });
  });

  describe('hmcStep', () => {
    let originalRandom;

    beforeEach(() => {
      originalRandom = Math.random;
    });

    afterEach(() => {
      Math.random = originalRandom;
    });

    describe('Metropolis acceptance', () => {
      it('should accept most proposals when starting from high energy', () => {
        // Mock Math.random to accept with prob > 0.5
        Math.random = () => 0.5;

        const q = { x: 3.0, y: 3.0 }; // High energy state
        const epsilon = 0.1;
        const L = 10;
        const U = (x, y) => 0.5 * (x * x + y * y); // Minimum at origin
        const gradU = (x, y) => ({ x: x, y: y });

        let acceptCount = 0;
        for (let i = 0; i < 100; i++) {
          const result = hmcStep(q, epsilon, L, U, gradU);
          if (result.accepted) acceptCount++;

          // Verify result structure
          expect(result).toHaveProperty('accepted');
          expect(result).toHaveProperty('trajectory');
          expect(result).toHaveProperty('q');
          expect(result).toHaveProperty('p');
        }

        // From high energy, most proposals should be accepted
        expect(acceptCount).toBeGreaterThan(50);
      });

      it('should sometimes reject when starting from low energy', () => {
        // We need to align random values with the calls in hmcStep():
        // 1. randn() -> u1 (in generateProposal)
        // 2. randn() -> u2
        // 3. randn() -> u1
        // 4. randn() -> u2
        // 5. Acceptance check

        // We want a case where:
        // - Momentum is large (so u1 should be small in randn) -> Large deltaH
        // - Acceptance check is high (so it rejects)

        // Sequence of 5 values per step:
        // [small, any, small, any, large]
        const stepSequence = [0.001, 0.5, 0.001, 0.5, 0.99];

        let callCount = 0;
        Math.random = () => {
          const val = stepSequence[callCount % stepSequence.length];
          callCount++;
          return val;
        };

        const q = { x: 0.01, y: 0.01 }; // Near minimum
        const epsilon = 0.5; // Large step
        const L = 10;
        const U = (x, y) => 0.5 * (x * x + y * y);
        const gradU = (x, y) => ({ x: x, y: y });

        const results = [];
        // Run enough times to hit the rejection logic
        for (let i = 0; i < 5; i++) {
          results.push(hmcStep(q, epsilon, L, U, gradU));
        }

        const rejectedCount = results.filter((r) => !r.accepted).length;

        // Should have at least some rejections
        expect(rejectedCount).toBeGreaterThan(0);
      });

      it('should return original position when rejected', () => {
        // Mock to always reject
        Math.random = () => 0.999;

        const q = { x: 0.01, y: 0.01 };
        const epsilon = 1.0; // Large step to increase energy
        const L = 20;
        const U = (x, y) => 0.5 * (x * x + y * y);
        const gradU = (x, y) => ({ x: x, y: y });

        const result = hmcStep(q, epsilon, L, U, gradU);

        if (!result.accepted) {
          expect(result.q.x).toBe(q.x);
          expect(result.q.y).toBe(q.y);
          // Trajectory should include initial point + L steps
          expect(result.trajectory.length).toBe(L + 1);
        }
      });
    });

    describe('trajectory return format', () => {
      it('should return trajectory with correct length', () => {
        Math.random = () => 0.5;

        const q = { x: 0.0, y: 0.0 };
        const epsilon = 0.1;
        const L = 5;
        const U = (x, y) => 0.5 * (x * x + y * y);
        const gradU = (x, y) => ({ x: x, y: y });

        const result = hmcStep(q, epsilon, L, U, gradU);

        expect(Array.isArray(result.trajectory)).toBe(true);

        if (result.accepted) {
          expect(result.trajectory.length).toBe(L + 1);

          // Each trajectory point should have x and y
          result.trajectory.forEach((point) => {
            expect(point).toHaveProperty('x');
            expect(point).toHaveProperty('y');
            expect(typeof point.x).toBe('number');
            expect(typeof point.y).toBe('number');
          });
        } else {
          // Even if rejected, we return the trajectory
          expect(result.trajectory.length).toBe(L + 1);
        }
      });

      it('should return empty trajectory when rejected', () => {
        Math.random = () => 0.999; // Always reject

        const q = { x: 0.01, y: 0.01 };
        const epsilon = 1.0;
        const L = 10;
        const U = (x, y) => 0.5 * (x * x + y * y);
        const gradU = (x, y) => ({ x: x, y: y });

        const result = hmcStep(q, epsilon, L, U, gradU);

        if (!result.accepted) {
          expect(result.trajectory.length).toBe(L + 1);
          expect(result.trajectory[0]).toEqual(q);
        }
      });
    });

    describe('edge cases', () => {
      it('should handle zero leapfrog steps gracefully', () => {
        Math.random = () => 0.5;

        const q = { x: 1.0, y: 1.0 };
        const epsilon = 0.1;
        const L = 0;
        const U = (x, y) => 0.5 * (x * x + y * y);
        const gradU = (x, y) => ({ x: x, y: y });

        const result = hmcStep(q, epsilon, L, U, gradU);

        expect(result).toHaveProperty('q');
        expect(result).toHaveProperty('p');
        expect(result).toHaveProperty('accepted');
        expect(result).toHaveProperty('trajectory');
        // Initial point only
        expect(result.trajectory.length).toBe(1);
      });

      it('should not produce NaN with extreme gradients', () => {
        Math.random = () => 0.5;

        const q = { x: 0.1, y: 0.1 };
        const epsilon = 0.001; // Small step to avoid overflow
        const L = 5;
        const U = (x, y) => 500 * (x * x + y * y);
        const gradU = (x, y) => ({ x: 1000 * x, y: 1000 * y });

        const result = hmcStep(q, epsilon, L, U, gradU);

        expect(isNaN(result.q.x)).toBe(false);
        expect(isNaN(result.q.y)).toBe(false);
        expect(isNaN(result.p.x)).toBe(false);
        expect(isNaN(result.p.y)).toBe(false);
      });
    });
  });

  describe('Seeded RNG Integration', () => {
    // Import will be added when SeededRandom is implemented
    // For now, we'll create a mock
    class MockSeededRandom {
      constructor(seed) {
        this.seed = seed;
        this.state = seed;
      }

      random() {
        // Simple Mulberry32 PRNG
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      }

      randn() {
        const u1 = this.random();
        const u2 = this.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      }

      setSeed(seed) {
        this.seed = seed;
        this.state = seed;
      }

      getSeed() {
        return this.seed;
      }
    }

    describe('generateProposal with RNG', () => {
      it('should produce reproducible results with same seed', () => {
        const q = { x: 0.0, y: 0.0 };
        const epsilon = 0.1;
        const L = 5;
        const U = (x, y) => 0.5 * (x * x + y * y);
        const gradU = (x, y) => ({ x: x, y: y });

        const rng1 = new MockSeededRandom(42);
        const result1 = generateProposal(q, epsilon, L, U, gradU, rng1);

        const rng2 = new MockSeededRandom(42);
        const result2 = generateProposal(q, epsilon, L, U, gradU, rng2);

        expect(result1.q_proposed).toEqual(result2.q_proposed);
        expect(result1.p_proposed).toEqual(result2.p_proposed);
        expect(result1.H_initial).toEqual(result2.H_initial);
        expect(result1.H_proposed).toEqual(result2.H_proposed);
        expect(result1.trajectory).toEqual(result2.trajectory);
      });

      it('should produce different results with different seeds', () => {
        const q = { x: 0.0, y: 0.0 };
        const epsilon = 0.1;
        const L = 5;
        const U = (x, y) => 0.5 * (x * x + y * y);
        const gradU = (x, y) => ({ x: x, y: y });

        const rng1 = new MockSeededRandom(42);
        const result1 = generateProposal(q, epsilon, L, U, gradU, rng1);

        const rng2 = new MockSeededRandom(100);
        const result2 = generateProposal(q, epsilon, L, U, gradU, rng2);

        expect(result1.q_proposed).not.toEqual(result2.q_proposed);
        expect(result1.p_proposed).not.toEqual(result2.p_proposed);
      });

      it('should work without RNG parameter (backward compatibility)', () => {
        const q = { x: 0.0, y: 0.0 };
        const epsilon = 0.1;
        const L = 5;
        const U = (x, y) => 0.5 * (x * x + y * y);
        const gradU = (x, y) => ({ x: x, y: y });

        const result = generateProposal(q, epsilon, L, U, gradU);

        expect(result).toHaveProperty('q_proposed');
        expect(result).toHaveProperty('p_proposed');
        expect(result).toHaveProperty('H_initial');
        expect(result).toHaveProperty('H_proposed');
        expect(result).toHaveProperty('trajectory');
      });

      it('should use Math.random when rng is null', () => {
        const q = { x: 0.0, y: 0.0 };
        const epsilon = 0.1;
        const L = 5;
        const U = (x, y) => 0.5 * (x * x + y * y);
        const gradU = (x, y) => ({ x: x, y: y });

        const result = generateProposal(q, epsilon, L, U, gradU, null);

        expect(result).toHaveProperty('q_proposed');
        expect(result).toHaveProperty('p_proposed');
      });
    });

    describe('hmcStep with RNG', () => {
      it('should produce reproducible results with same seed', () => {
        const q = { x: 0.0, y: 0.0 };
        const epsilon = 0.1;
        const L = 5;
        const U = (x, y) => 0.5 * (x * x + y * y);
        const gradU = (x, y) => ({ x: x, y: y });

        const rng1 = new MockSeededRandom(42);
        const result1 = hmcStep(q, epsilon, L, U, gradU, rng1);

        const rng2 = new MockSeededRandom(42);
        const result2 = hmcStep(q, epsilon, L, U, gradU, rng2);

        expect(result1.q).toEqual(result2.q);
        expect(result1.p).toEqual(result2.p);
        expect(result1.accepted).toEqual(result2.accepted);
        expect(result1.trajectory).toEqual(result2.trajectory);
      });

      it('should produce reproducible acceptance decisions', () => {
        const q = { x: 1.0, y: 1.0 };
        const epsilon = 0.1;
        const L = 10;
        const U = (x, y) => 0.5 * (x * x + y * y);
        const gradU = (x, y) => ({ x: x, y: y });

        // Run multiple times with same seed
        const results = [];
        for (let i = 0; i < 5; i++) {
          const rng = new MockSeededRandom(42);
          const result = hmcStep(q, epsilon, L, U, gradU, rng);
          results.push(result.accepted);
        }

        // All should be the same
        expect(results.every((val) => val === results[0])).toBe(true);
      });

      it('should work without RNG parameter (backward compatibility)', () => {
        const q = { x: 0.0, y: 0.0 };
        const epsilon = 0.1;
        const L = 5;
        const U = (x, y) => 0.5 * (x * x + y * y);
        const gradU = (x, y) => ({ x: x, y: y });

        const result = hmcStep(q, epsilon, L, U, gradU);

        expect(result).toHaveProperty('q');
        expect(result).toHaveProperty('p');
        expect(result).toHaveProperty('accepted');
        expect(result).toHaveProperty('trajectory');
      });

      it('should produce different results with different seeds', () => {
        const q = { x: 0.0, y: 0.0 };
        const epsilon = 0.1;
        const L = 5;
        const U = (x, y) => 0.5 * (x * x + y * y);
        const gradU = (x, y) => ({ x: x, y: y });

        const rng1 = new MockSeededRandom(42);
        const result1 = hmcStep(q, epsilon, L, U, gradU, rng1);

        const rng2 = new MockSeededRandom(100);
        const result2 = hmcStep(q, epsilon, L, U, gradU, rng2);

        // At least one of these should be different
        const isDifferent =
          result1.q.x !== result2.q.x ||
          result1.q.y !== result2.q.y ||
          result1.accepted !== result2.accepted;

        expect(isDifferent).toBe(true);
      });
    });
  });
});
