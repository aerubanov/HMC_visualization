import { parse, derivative, simplify } from 'mathjs';
import type { MathNode, EvalFunction } from 'mathjs';
import { logger } from './logger';

/**
 * Represents a complex number as returned by mathjs when evaluating expressions
 * that produce complex results (e.g. log of a negative number).
 */
interface ComplexNumber {
  re: number;
  im: number;
}

/**
 * Type guard that checks whether a value is a mathjs complex number object.
 * Used to extract the real part when gradient/log-probability evaluation
 * returns a complex result instead of a plain number.
 */
function isComplex(value: unknown): value is ComplexNumber {
  return (
    typeof value === 'object' &&
    value !== null &&
    're' in value &&
    typeof (value as ComplexNumber).re === 'number'
  );
}

export class Logp {
  private readonly logNode: MathNode;
  private readonly logCompiled: EvalFunction;
  private readonly gradXNode: MathNode;
  private readonly gradYNode: MathNode;
  private readonly gradXCompiled: EvalFunction;
  private readonly gradYCompiled: EvalFunction;

  /**
   * @param pdfString - User input string for unnormalized PDF, e.g., "exp(-(x^2 + y^2))"
   */
  constructor(pdfString: string) {
    if (!pdfString || typeof pdfString !== 'string') {
      throw new Error('Invalid input: PDF must be a non-empty string.');
    }

    // 1. Parse the string to validate syntax
    try {
      parse(pdfString);
    } catch (e) {
      const err = e as Error;
      logger.error('logP compile error', { message: err.message });
      throw new Error(`Syntax error in PDF string: ${err.message}`);
    }

    // 2. Apply log transform: log(pdfString)
    const logExpr = `log(${pdfString})`;
    let rawLogNode: MathNode;
    try {
      rawLogNode = parse(logExpr);
    } catch (e) {
      const err = e as Error;
      logger.error('logP compile error', { message: err.message });
      throw new Error(`Error parsing log expression: ${err.message}`);
    }

    // 3. Simplify the expression (e.g., log(exp(...)) -> ...)
    try {
      this.logNode = simplify(rawLogNode);
    } catch (e) {
      const err = e as Error;
      logger.warn('logP simplification fallback', { message: err.message });
      this.logNode = rawLogNode;
    }

    // 4. Compile for efficiency
    this.logCompiled = this.logNode.compile();

    // 5. Validate by attempting to evaluate at a test point
    try {
      this.logCompiled.evaluate({ x: 1, y: 1 });
    } catch (e) {
      const err = e as Error;
      logger.error('logP compile error', { message: err.message });
      throw new Error(
        `Invalid function: unable to evaluate. Ensure only 'x' and 'y' are used as variables. Details: ${err.message}`
      );
    }

    // 6. Compute symbolic gradients: d(logP)/dx, d(logP)/dy
    let gradX: MathNode;
    let gradY: MathNode;
    try {
      gradX = derivative(this.logNode, 'x');
      gradY = derivative(this.logNode, 'y');

      this.gradXNode = simplify(gradX);
      this.gradYNode = simplify(gradY);
    } catch (e) {
      const err = e as Error;
      logger.error('logP compile error', { message: err.message });
      throw new Error(`Error computing gradients: ${err.message}`);
    }

    this.gradXCompiled = this.gradXNode.compile();
    this.gradYCompiled = this.gradYNode.compile();

    logger.info('logP compiled', { expr: pdfString.slice(0, 60) });
  }

  /**
   * Computes the log-probability value at (x, y).
   * @param x - x coordinate
   * @param y - y coordinate
   * @returns The log-probability as a number
   */
  getLogProbability(x: number, y: number): number {
    try {
      const result: unknown = this.logCompiled.evaluate({ x, y });
      // Math.js may return complex numbers for some expressions;
      // extract the real part when that happens.
      if (isComplex(result)) {
        return result.re;
      }
      return result as number;
    } catch (e) {
      const err = e as Error;
      throw new Error(`Error evaluating log probability: ${err.message}`);
    }
  }

  /**
   * Computes the gradient of the log-probability at (x, y).
   * @param x - x coordinate
   * @param y - y coordinate
   * @returns [d/dx, d/dy]
   */
  getLogProbabilityGradient(x: number, y: number): [number, number] {
    try {
      const dxRaw: unknown = this.gradXCompiled.evaluate({ x, y });
      const dyRaw: unknown = this.gradYCompiled.evaluate({ x, y });

      // Extract real parts if math.js returned complex numbers
      const dx: number = isComplex(dxRaw) ? dxRaw.re : (dxRaw as number);
      const dy: number = isComplex(dyRaw) ? dyRaw.re : (dyRaw as number);

      return [dx, dy];
    } catch (e) {
      const err = e as Error;
      throw new Error(`Error evaluating gradient: ${err.message}`);
    }
  }
}
