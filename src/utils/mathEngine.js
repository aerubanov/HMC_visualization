// Math Engine - math.js wrappers
// Parses user input strings and computes gradients

/**
 * Parse a user-provided string into a potential function U(q)
 * @param {string} expression - User input like "-(x^2+y^2)/2"
 * @returns {Function} Compiled function U(x, y)
 */
export function parseFunction(_expression) {
  // TODO: Implement using math.js
  throw new Error('Not implemented');
}

/**
 * Compute the gradient of the potential function
 * @param {string} expression - User input like "-(x^2+y^2)/2"
 * @returns {Function} Compiled gradient function returning [dU/dx, dU/dy]
 */
export function computeGradient(_expression) {
  // TODO: Implement using math.derivative
  throw new Error('Not implemented');
}
