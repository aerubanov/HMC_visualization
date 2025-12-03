import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { leapfrog, step } from '../../src/utils/hmcSampler';

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
  describe('leapfrog', () => {
    describe('reversibility', () => {
      it('should be reversible (forward then backward returns to start)', () => {
        const q0 = { x: 1.0, y: 2.0 };
        const p0 = { x: 0.5, y: -0.3 };
        const epsilon = 0.01;
        const gradU = (x, y) => ({ x: x, y: y }); // Quadratic potential

        // Forward step
        const { q: q1, p: p1 } = leapfrog(q0, p0, epsilon, gradU);

        // Backward step with negated momentum
        const { q: q2, p: p2 } = leapfrog(
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

        const { q: q1, p: p1 } = leapfrog(q0, p0, epsilon, gradU);
        const { q: q2, p: p2 } = leapfrog(
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

        const { q: q1, p: p1 } = leapfrog(q0, p0, epsilon, gradU);
        const { q: q2, p: p2 } = leapfrog(
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

        const { q: q1, p: p1 } = leapfrog(q0, p0, epsilon, gradU);
        const { q: q2, p: p2 } = leapfrog(
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
          const result = leapfrog(q, p, epsilon, gradU);
          q = result.q;
          p = result.p;
        }

        // Backward integration with negated momentum
        p = { x: -p.x, y: -p.y };
        for (let i = 0; i < nSteps; i++) {
          const result = leapfrog(q, p, epsilon, gradU);
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
          const result = leapfrog(q, p, epsilon, gradU);
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
        const result = leapfrog(q, p, epsilon, gradU);
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
          const result = leapfrog(q, p, epsilon, gradU);
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

  describe('step', () => {
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
          const result = step(q, epsilon, L, U, gradU);
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
        // We need to align random values with the calls in step():
        // 1. randn() -> u1
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
          results.push(step(q, epsilon, L, U, gradU));
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

        const result = step(q, epsilon, L, U, gradU);

        if (!result.accepted) {
          expect(result.q.x).toBe(q.x);
          expect(result.q.y).toBe(q.y);
          expect(result.trajectory.length).toBe(0);
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

        const result = step(q, epsilon, L, U, gradU);

        expect(Array.isArray(result.trajectory)).toBe(true);

        if (result.accepted) {
          expect(result.trajectory.length).toBe(L);

          // Each trajectory point should have x and y
          result.trajectory.forEach((point) => {
            expect(point).toHaveProperty('x');
            expect(point).toHaveProperty('y');
            expect(typeof point.x).toBe('number');
            expect(typeof point.y).toBe('number');
          });
        } else {
          expect(result.trajectory.length).toBe(0);
        }
      });

      it('should return empty trajectory when rejected', () => {
        Math.random = () => 0.999; // Always reject

        const q = { x: 0.01, y: 0.01 };
        const epsilon = 1.0;
        const L = 10;
        const U = (x, y) => 0.5 * (x * x + y * y);
        const gradU = (x, y) => ({ x: x, y: y });

        const result = step(q, epsilon, L, U, gradU);

        if (!result.accepted) {
          expect(result.trajectory).toEqual([]);
        }
      });
    });

    describe('momentum sampling', () => {
      it('should sample varying momentum values', () => {
        const q = { x: 1.0, y: 1.0 };
        const epsilon = 0.1;
        const L = 5;
        const U = (x, y) => 0.5 * (x * x + y * y);
        const gradU = (x, y) => ({ x: x, y: y });

        const momenta = [];
        for (let i = 0; i < 20; i++) {
          const result = step(q, epsilon, L, U, gradU);
          momenta.push(result.p);
        }

        // Check that momentum values are not all the same
        const uniqueX = new Set(momenta.map((p) => p.x));
        const uniqueY = new Set(momenta.map((p) => p.y));

        expect(uniqueX.size).toBeGreaterThan(1);
        expect(uniqueY.size).toBeGreaterThan(1);
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

        const result = step(q, epsilon, L, U, gradU);

        expect(result).toHaveProperty('q');
        expect(result).toHaveProperty('p');
        expect(result).toHaveProperty('accepted');
        expect(result).toHaveProperty('trajectory');
        expect(result.trajectory.length).toBe(0);
      });

      it('should not produce NaN with extreme gradients', () => {
        Math.random = () => 0.5;

        const q = { x: 0.1, y: 0.1 };
        const epsilon = 0.001; // Small step to avoid overflow
        const L = 5;
        const U = (x, y) => 500 * (x * x + y * y);
        const gradU = (x, y) => ({ x: 1000 * x, y: 1000 * y });

        const result = step(q, epsilon, L, U, gradU);

        expect(isNaN(result.q.x)).toBe(false);
        expect(isNaN(result.q.y)).toBe(false);
        expect(isNaN(result.p.x)).toBe(false);
        expect(isNaN(result.p.y)).toBe(false);
      });
    });
  });
});
