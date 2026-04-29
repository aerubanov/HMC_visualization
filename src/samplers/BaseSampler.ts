import { SeededRandom } from '../utils/seededRandom';
import { logger } from '../utils/logger';
import type { Point, StepResult } from '../types';
import type { Logp } from '../utils/mathEngine';

/** Minimal particle shape passed to each sampler step. */
export interface Particle {
  q: Point;
  p: Point;
}

/**
 * Abstract base class for all samplers.
 * Enforces a common interface and handles random seed management.
 * Subclasses must implement {@link step} and {@link setParams}.
 */
export abstract class BaseSampler {
  /** The current seed value, or null if the sampler uses system randomness. */
  public readonly seed: number | null;

  /** The seeded RNG instance, or null when no seed is set. */
  public readonly rng: SeededRandom | null;

  /**
   * Create a new sampler.
   * @param seed - Optional random seed. Pass null to use system randomness.
   */
  constructor(seed: number | null = null) {
    // Runtime guard: abstract classes in TypeScript are only enforced at
    // compile time; this check preserves the runtime TypeError that JS tests
    // rely on when attempting to instantiate BaseSampler directly.
    if (new.target === BaseSampler) {
      throw new TypeError('Cannot construct BaseSampler instances directly');
    }
    // Initialise fields to satisfy TypeScript's definite-assignment analysis;
    // setSeed() overwrites them immediately.
    this.seed = null;
    this.rng = null;
    this.setSeed(seed);
  }

  /**
   * Set or replace the random seed.
   * Although `seed` and `rng` are declared `readonly`, this method reassigns
   * them via a type cast so that the public contract (readonly to callers)
   * is preserved while internal mutation remains possible.
   * @param seed - New seed value, or null to disable seeding.
   */
  setSeed(seed: number | null): void {
    (this as { seed: number | null }).seed = seed;
    (this as { rng: SeededRandom | null }).rng =
      seed !== null ? new SeededRandom(seed) : null;
    if (seed !== null) {
      logger.debug('BaseSampler seed set', { seed });
    }
  }

  /**
   * Update sampler-specific parameters.
   * @param params - Partial parameter object for the concrete sampler type.
   */
  abstract setParams(params: unknown): void;

  /**
   * Perform one sampling step.
   * @param particle - Current particle state `{ q, p }`.
   * @param logp - Compiled log-probability instance.
   * @returns The new particle state plus acceptance flag and trajectory.
   */
  abstract step(particle: Particle, logp: Logp): StepResult;
}
