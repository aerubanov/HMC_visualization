import { describe, it, expect, vi, afterEach } from 'vitest';
import * as mathjs from 'mathjs';
import { Logp } from '../../src/utils/mathEngine';

// Mock mathjs to allow overriding simplify for specific tests
vi.mock('mathjs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    simplify: vi.fn((...args) => actual.simplify(...args)),
    derivative: vi.fn((...args) => actual.derivative(...args)),
    parse: vi.fn((...args) => actual.parse(...args)),
  };
});

describe('Logp Class', () => {
  describe('Constructor & Parsing', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should throw an error for empty or non-string input', () => {
      expect(() => new Logp('')).toThrow('Invalid input');
      expect(() => new Logp(null)).toThrow('Invalid input');
      expect(() => new Logp(123)).toThrow('Invalid input');
    });

    it('should throw error when log expression parsing fails', async () => {
      // Mock parse to throw ONLY when parsing the log() wrapped expression
      // We use importActual to delegate the first call (validation) to real mathjs
      const actualMath = await vi.importActual('mathjs');

      vi.mocked(mathjs.parse)
        .mockImplementationOnce((...args) => actualMath.parse(...args)) // 1. Validation parse: succeed
        .mockImplementationOnce(() => {
          // 2. Log parse: fail
          throw new Error('Log parse error');
        });

      expect(() => new Logp('exp(x)')).toThrow(
        'Error parsing log expression: Log parse error'
      );
    });

    it('should handle simplify failure gracefully (fallback to original node)', () => {
      // Force simplify to throw an error once
      const error = new Error('Simpson error');
      vi.mocked(mathjs.simplify).mockImplementationOnce(() => {
        throw error;
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Should not throw, should log warn
      expect(() => new Logp('exp(x)')).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Simplification failed, using original expression',
        error
      );

      consoleSpy.mockRestore();
    });

    it('should throw error when gradient calculation fails', () => {
      // Mock derivative to throw error
      vi.mocked(mathjs.derivative).mockImplementationOnce(() => {
        throw new Error('Derivative error');
      });

      expect(() => new Logp('x^2')).toThrow(
        'Error computing gradients: Derivative error'
      );
    });

    it('should successfully parse a valid expression', () => {
      expect(() => new Logp('exp(-(x^2 + y^2))')).not.toThrow();
    });

    it('should throw an error for invalid syntax', () => {
      expect(() => new Logp('exp(-(x^2 + y^2')).toThrow();
    });

    it('should throw an error for unknown variables', () => {
      expect(() => new Logp('exp(-z)')).toThrow(
        /Invalid function: unable to evaluate/
      );
    });

    it('should throw an error for undefined functions', () => {
      expect(() => new Logp('unknownFunc(x)')).toThrow(
        /Invalid function: unable to evaluate/
      );
    });
  });

  describe('getLogProbability(x, y)', () => {
    it('should correctly evaluate Gaussian at (0,0)', () => {
      // pdf = exp(-(x^2 + y^2)/2) -> logp = -(x^2 + y^2)/2
      const logp = new Logp('exp(-(x^2 + y^2)/2)');
      expect(logp.getLogProbability(0, 0)).toBeCloseTo(0);
    });

    it('should correctly evaluate Gaussian at (1,1)', () => {
      // logp = -(1^2 + 1^2)/2 = -1
      const logp = new Logp('exp(-(x^2 + y^2)/2)');
      expect(logp.getLogProbability(1, 1)).toBeCloseTo(-1);
    });

    it('should correctly evaluate constant function', () => {
      // pdf = 1 -> logp = 0
      const logp = new Logp('1');
      expect(logp.getLogProbability(10, 10)).toBeCloseTo(0);
    });

    it('should throw error when evaluation fails', () => {
      const logp = new Logp('x + y');
      // Pass an object that causes mathjs evaluate to fail if possible,
      // or corrupt the compiled node mock if we could.
      // Easiest way to trigger "Error evaluating log probability" is if 'evaluate' throws.
      // We can't easily mock the internal 'logCompiled' property from here without casting to any.
      // But we can pass invalid variable types that might break it.
      // However, mathjs is robust. Let's try to pass a Symbol which usually throws.

      // @ts-ignore
      expect(() => logp.getLogProbability(Symbol('fail'), 1)).toThrow(
        /Error evaluating log probability/
      );
    });
  });

  describe('getLogProbabilityGradient(x, y)', () => {
    it('should correctly compute gradient for Gaussian', () => {
      // logp = -(x^2 + y^2)/2
      // d/dx = -x, d/dy = -y
      const logp = new Logp('exp(-(x^2 + y^2)/2)');

      const grad0 = logp.getLogProbabilityGradient(0, 0);
      expect(grad0[0]).toBeCloseTo(0);
      expect(grad0[1]).toBeCloseTo(0);

      const grad1 = logp.getLogProbabilityGradient(1, 2);
      expect(grad1[0]).toBeCloseTo(-1);
      expect(grad1[1]).toBeCloseTo(-2);
    });

    it('should correctly compute gradient for Rosenbrock-like term', () => {
      // pdf = exp(-100*(y - x^2)^2) -> logp = -100*(y - x^2)^2
      // d/dx = -100 * 2 * (y - x^2) * (-2x) = 400x(y - x^2)
      // d/dy = -100 * 2 * (y - x^2) * (1) = -200(y - x^2)
      const logp = new Logp('exp(-100*(y - x^2)^2)');

      // At x=1, y=1: term=(1-1)=0 -> grad=[0, 0]
      const grad1 = logp.getLogProbabilityGradient(1, 1);
      expect(grad1[0]).toBeCloseTo(0);
      expect(grad1[1]).toBeCloseTo(0);

      // At x=1, y=2: term=(2-1)=1
      // d/dx = 400*1*1 = 400
      // d/dy = -200*1 = -200
      const grad2 = logp.getLogProbabilityGradient(1, 2);
      expect(grad2[0]).toBeCloseTo(400);
      expect(grad2[1]).toBeCloseTo(-200);
    });
  });

  describe('Complex Number Handling', () => {
    it('should extract real part from complex results in getLogProbability', () => {
      // Some math.js operations may return complex numbers with zero imaginary part
      // or non-zero imaginary part. We want to ensure specific logic for extracting .re is hit.
      // logp = sqrt(x). At x=-1 -> i. Result is complex object {re: 0, im: 1}.
      // Should return 0.

      const logp = new Logp('exp(sqrt(x))');
      const result = logp.getLogProbability(-1, 0);

      // If result is object with re, it returns re.
      expect(result).toBeCloseTo(0);
    });

    it('should extract real parts from complex results in getLogProbabilityGradient', () => {
      // Test that gradient components are plain numbers
      const logp = new Logp('exp(-(x^2 + y^2)/2)');

      const grad = logp.getLogProbabilityGradient(2, 3);
      expect(Array.isArray(grad)).toBe(true);
      expect(grad).toHaveLength(2);

      // Each component should be a plain number
      expect(typeof grad[0]).toBe('number');
      expect(typeof grad[1]).toBe('number');
      expect(grad[0]).not.toHaveProperty('re');
      expect(grad[1]).not.toHaveProperty('re');

      // Verify the values are correct
      expect(grad[0]).toBeCloseTo(-2);
      expect(grad[1]).toBeCloseTo(-3);
    });

    it('should handle dy being complex in gradient', () => {
      // We need a function where d/dx is real but d/dy is complex (or has complex part).
      // pdf = exp(sqrt(y)) -> logp = sqrt(y)
      // d/dy = 1/(2*sqrt(y)). At y=-1 -> 1/(2i) = -0.5i. Re part is 0.
      // To ensure we get a non-zero real part to check if it's extracted?
      // The code extracts .re. If result is purely imaginary, .re is 0.
      // If we want to check that it handles the object return:
      // sqrt(y) at y=-1 returns 0 + i.

      const logp = new Logp('exp(sqrt(y))');
      const grad = logp.getLogProbabilityGradient(1, -1);

      // d/dx = 0
      // d/dy = 0 (Real part of -0.5i)

      expect(grad[0]).toBeCloseTo(0);
      expect(grad[1]).toBeCloseTo(0);
    });

    it('should handle dx being complex in gradient', () => {
      // pdf = exp(sqrt(x)) -> logp = sqrt(x)
      // d/dx = 1/(2*sqrt(x)). At x=-1 -> -0.5i. Re part 0.
      const logp = new Logp('exp(sqrt(x))');
      const grad = logp.getLogProbabilityGradient(-1, 1);

      expect(grad[0]).toBeCloseTo(0);
      expect(grad[1]).toBeCloseTo(0);
    });

    it('should throw error when gradient evaluation fails', () => {
      const logp = new Logp('x^2 + y^2');
      // @ts-ignore
      expect(() => logp.getLogProbabilityGradient(Symbol('fail'), 1)).toThrow(
        /Error evaluating gradient/
      );
    });

    it('should handle expressions that naturally produce real results', () => {
      // Simple polynomial wrapped in exp - should produce real numbers
      // Logp wraps in log(), so exp(x^2 + y^2) -> log(exp(x^2 + y^2)) -> x^2 + y^2
      const logp = new Logp('exp(x^2 + y^2)');

      const result = logp.getLogProbability(3, 4);
      expect(typeof result).toBe('number');
      expect(result).toBeCloseTo(25); // 3^2 + 4^2 = 25
    });

    it('should handle negative log expressions correctly', () => {
      // -(x^2 + y^2)/2 is a common log-probability form
      const logp = new Logp('exp(-(x^2 + y^2)/2)');

      // Test at multiple points to ensure consistency
      const points = [
        [0, 0, 0],
        [1, 0, -0.5],
        [0, 1, -0.5],
        [2, 2, -4],
      ];

      points.forEach(([x, y, expected]) => {
        const result = logp.getLogProbability(x, y);
        expect(typeof result).toBe('number');
        expect(result).toBeCloseTo(expected);
      });
    });
  });
});
