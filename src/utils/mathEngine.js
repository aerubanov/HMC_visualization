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
    let pdfNode;
    try {
      pdfNode = parse(pdfString);
    } catch (e) {
      throw new Error(`Syntax error in PDF string: ${e.message}`);
    }

    // Validate symbols (only x, y allowed, plus standard constants and functions)
    const allowedSymbols = new Set([
      'x',
      'y',
      'e',
      'pi',
      'E',
      'PI',
      'Infinity',
      'NaN',
      'exp',
      'log',
      'ln',
      'sqrt',
      'pow',
      'abs',
      'sin',
      'cos',
      'tan',
      'asin',
      'acos',
      'atan',
      'sinh',
      'cosh',
      'tanh',
    ]);

    pdfNode.traverse((node) => {
      // Check if it's a symbol node (variable or constant)
      if (node.isSymbolNode) {
        if (!allowedSymbols.has(node.name)) {
          throw new Error(
            `Unknown symbol: "${node.name}". Only 'x' and 'y' are allowed variables.`
          );
        }
      }
    });

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
      return this.logCompiled.evaluate({ x, y });
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
      return [
        this.gradXCompiled.evaluate({ x, y }),
        this.gradYCompiled.evaluate({ x, y }),
      ];
    } catch (e) {
      throw new Error(`Error evaluating gradient: ${e.message}`);
    }
  }
}
