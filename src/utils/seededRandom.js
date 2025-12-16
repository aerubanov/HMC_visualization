/**
 * Seeded pseudo-random number generator for reproducible HMC sampling
 * Uses Mulberry32 algorithm - a simple, fast, and high-quality PRNG
 *
 * Reference: https://github.com/bryc/code/blob/master/jshash/PRNGs.md
 */
export class SeededRandom {
  /**
   * Create a new seeded random number generator
   * @param {number} [seed] - Optional seed value. If not provided, uses Date.now()
   */
  constructor(seed) {
    this.seed = seed !== undefined ? seed : Date.now();
    this.state = this.seed;
  }

  /**
   * Generate a random number in [0, 1) using the Mulberry32 PRNG
   * @returns {number} Random value in [0, 1)
   */
  random() {
    // Mulberry32 algorithm
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate a standard normal random variable using Box-Muller transform
   * @returns {number} Sample from N(0, 1)
   */
  randn() {
    const u1 = this.random();
    const u2 = this.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Set a new seed and reset the generator state
   * @param {number} seed - New seed value
   */
  setSeed(seed) {
    this.seed = seed;
    this.state = seed;
  }

  /**
   * Get the current seed value
   * @returns {number} Current seed
   */
  getSeed() {
    return this.seed;
  }
}
