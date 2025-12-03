import { describe, it, expect } from 'vitest';
import { Logp } from '../../src/utils/mathEngine';

describe('Logp Class', () => {
  describe('Constructor & Parsing', () => {
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
});
