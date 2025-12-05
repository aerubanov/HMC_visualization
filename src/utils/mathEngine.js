import { parse, derivative, simplify } from 'mathjs';

export class Logp {
  /**
   * @param {string} pdfString - User input string for unnormalized PDF, e.g., "exp(-(x^2 + y^2))"
   */
  constructor(pdfString) {
    if (!pdfString || typeof pdfString !== 'string') {
      throw new Error('Invalid input: PDF must be a non-empty string.');
    }

    // 1. Parse the string to validate and check symbols
    try {
      parse(pdfString);
    } catch (e) {
      throw new Error(`Syntax error in PDF string: ${e.message}`);
    }

    // 2. Apply log transform: log(pdfString)
    // We wrap the expression in log(...)
    const logExpr = `log(${pdfString})`;
    let logNode;
    try {
      logNode = parse(logExpr);
    } catch (e) {
      throw new Error(`Error parsing log expression: ${e.message}`);
    }

    // Simplify the expression (e.g., log(exp(...)) -> ...)
    try {
      this.logNode = simplify(logNode);
    } catch (e) {
      console.warn('Simplification failed, using original expression', e);
      this.logNode = logNode;
    }

    // Compile for efficiency
    this.logCompiled = this.logNode.compile();

    // Validate by attempting to evaluate at a test point
    try {
      this.logCompiled.evaluate({ x: 1, y: 1 });
    } catch (e) {
      throw new Error(
        `Invalid function: unable to evaluate. Ensure only 'x' and 'y' are used as variables. Details: ${e.message}`
      );
    }

    // 3. Compute symbolic gradients: d(logP)/dx, d(logP)/dy
    try {
      const gradX = derivative(this.logNode, 'x');
      const gradY = derivative(this.logNode, 'y');

      this.gradXNode = simplify(gradX);
      this.gradYNode = simplify(gradY);
    } catch (e) {
      throw new Error(`Error computing gradients: ${e.message}`);
    }

    this.gradXCompiled = this.gradXNode.compile();
    this.gradYCompiled = this.gradYNode.compile();
  }

  /**
   * Computes the log-probability value at (x, y)
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  getLogProbability(x, y) {
    try {
      const result = this.logCompiled.evaluate({ x, y });
      // Math.js may return complex numbers for some expressions
      // Extract the real part if it's a complex number object
      if (typeof result === 'object' && result !== null && 're' in result) {
        return result.re;
      }
      return result;
    } catch (e) {
      throw new Error(`Error evaluating log probability: ${e.message}`);
    }
  }

  /**
   * Computes the gradient of the log-probability at (x, y)
   * @param {number} x
   * @param {number} y
   * @returns {Array<number>} [d/dx, d/dy]
   */
  getLogProbabilityGradient(x, y) {
    try {
      let dx = this.gradXCompiled.evaluate({ x, y });
      let dy = this.gradYCompiled.evaluate({ x, y });

      // Extract real parts if math.js returned complex numbers
      if (typeof dx === 'object' && dx !== null && 're' in dx) {
        dx = dx.re;
      }
      if (typeof dy === 'object' && dy !== null && 're' in dy) {
        dy = dy.re;
      }

      return [dx, dy];
    } catch (e) {
      throw new Error(`Error evaluating gradient: ${e.message}`);
    }
  }
}
