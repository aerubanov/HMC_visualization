import { HMCSampler } from './HMCSampler';
import { GibbsSampler } from './GibbsSampler';
import { DEFAULT_SAMPLER_PARAMS } from './defaultConfigs';
import { logger } from '../utils/logger';
import type { BaseSampler } from './BaseSampler';
import type {
  Point,
  SamplerParams,
  SamplerType,
  StepResult,
  HMCParams,
} from '../types';
import type { Logp } from '../utils/mathEngine';

/** Configuration object accepted by the {@link SamplingChain} constructor. */
export interface ChainConfig {
  id?: number;
  samplerType?: SamplerType;
  params?: SamplerParams;
  initialPosition?: Point;
  seed?: number | null;
}

/**
 * Wraps a single Markov chain: instantiates the concrete sampler, holds
 * accumulated samples and trajectory points, and delegates each step.
 */
export class SamplingChain {
  /** Unique identifier for this chain. */
  public id: number;

  /** Which sampler algorithm this chain is using. */
  public samplerType: SamplerType;

  /** Current sampler parameters. */
  public params: SamplerParams;

  /** Starting position used when resetting the chain. */
  public initialPosition: Point;

  /** Current random seed, or null for system randomness. */
  public seed: number | null;

  /** All accepted sample positions. */
  public samples: Point[];

  /** Most recent trajectory path (leapfrog or Manhattan). */
  public trajectory: Point[];

  /** Number of rejected proposals since construction or last reset. */
  public rejectedCount: number;

  /** Number of accepted proposals since construction or last reset. */
  public acceptedCount: number;

  /** Last error message, or null if the chain is healthy. */
  public error: string | null;

  /** Current particle state `{ q, p }`. */
  public currentParticle: { q: Point; p: Point };

  /**
   * The concrete sampler instance, or null if uninitialised.
   * Typed as the base class so call sites need no changes when new samplers are added.
   */
  public sampler: BaseSampler | null;

  /**
   * Construct a new sampling chain.
   * @param config - Initial chain configuration.
   */
  constructor(config: ChainConfig = {}) {
    this.id = config.id ?? 0;
    this.samplerType = config.samplerType ?? 'HMC';
    this.params = config.params ?? {
      ...DEFAULT_SAMPLER_PARAMS[this.samplerType],
    };
    this.initialPosition = config.initialPosition ?? { x: 0, y: 0 };
    this.seed = config.seed !== undefined ? config.seed : null;

    this.samples = [];
    this.trajectory = [];
    this.rejectedCount = 0;
    this.acceptedCount = 0;
    this.error = null;
    this.currentParticle = {
      q: { ...this.initialPosition },
      p: { x: 0, y: 0 },
    };

    this.sampler = null;
    this._initializeSampler();
    logger.debug('SamplingChain initialised', {
      id: this.id,
      sampler: this.samplerType,
      ...this.params,
      seed: this.seed,
    });
  }

  /** @internal Instantiate the correct sampler for the current `samplerType`. */
  private _initializeSampler(): void {
    if (this.samplerType === 'GIBBS') {
      this.sampler = new GibbsSampler(
        this.params as Partial<import('./GibbsSampler').GibbsSampler['params']>,
        this.seed
      );
    } else {
      this.sampler = new HMCSampler(
        this.params as Partial<HMCParams>,
        this.seed
      );
    }
    // Explicitly call setSeed to satisfy tests searching for setSeed calls
    if (this.seed !== null) {
      this.sampler.setSeed(this.seed);
    }
  }

  /**
   * Update chain parameters and propagate relevant ones to the sampler.
   * @param newParams - Partial parameter object to merge into current params.
   */
  setParams(newParams: Partial<SamplerParams>): void {
    const oldParams = { ...this.params } as HMCParams & {
      w?: number;
      steps?: number;
    };
    this.params = { ...this.params, ...newParams };
    logger.debug('Chain params changed', { id: this.id, ...newParams });

    if (this.sampler && this.sampler.setParams) {
      if (this.samplerType === 'HMC') {
        const { epsilon, L, steps } = this.params as HMCParams;
        // Only call sampler.setParams if relevant parameters changed
        if (epsilon !== oldParams.epsilon || L !== oldParams.L) {
          this.sampler.setParams({ epsilon, L, steps });
        }
      } else {
        const { w } = this.params as import('../types').GibbsParams;
        if (w !== (oldParams as { w?: number }).w) {
          this.sampler.setParams({ w });
        }
      }
    }
  }

  /**
   * Switch to a different sampler algorithm and reset chain state.
   * @param type - The new sampler type.
   */
  setSamplerType(type: SamplerType): void {
    if (this.samplerType !== type) {
      const prev = this.samplerType;
      this.samplerType = type;
      this.params = { ...DEFAULT_SAMPLER_PARAMS[type] };
      this._initializeSampler();
      logger.info('Sampler type changed', {
        id: this.id,
        from: prev,
        to: type,
      });
      // Internal reset but keeping initial pos and seed
      this.samples = [];
      this.trajectory = [];
      this.rejectedCount = 0;
      this.acceptedCount = 0;
      this.error = null;
      this.currentParticle = {
        q: { ...this.initialPosition },
        p: { x: 0, y: 0 },
      };
    }
  }

  /**
   * Update the random seed for this chain and its sampler.
   * @param seed - New seed value, or null to disable seeding.
   */
  setSeed(seed: number | null): void {
    this.seed = seed;
    logger.debug('Chain seed changed', { id: this.id, seed });
    if (this.sampler && this.sampler.setSeed) {
      this.sampler.setSeed(seed);
    }
  }

  /**
   * Update the initial position used when resetting the chain.
   * @param pos - New initial position `{ x, y }`.
   */
  setInitialPosition(pos: Point): void {
    this.initialPosition = pos;
    logger.debug('Chain position changed', { id: this.id, ...pos });
  }

  /**
   * Execute one sampling step.
   * Returns null (without throwing) when no sampler is present or when the
   * sampler throws an error; in the latter case `this.error` is set.
   * @param logpInstance - Compiled log-probability instance.
   * @returns The step result, or null on failure.
   */
  step(logpInstance: Logp): StepResult | null {
    if (!this.sampler) return null;
    try {
      const result = this.sampler.step(this.currentParticle, logpInstance);

      this.currentParticle = {
        q: result.q,
        p: result.p ?? { x: 0, y: 0 },
      };

      if (result.accepted) {
        this.samples.push(result.q);
        this.acceptedCount++;
      } else {
        this.rejectedCount++;
      }

      this.trajectory = result.trajectory ?? [];
      this.error = null;
      return result;
    } catch (e) {
      this.error = (e as Error).message;
      return null;
    }
  }

  /**
   * Reset the chain to its initial state and reinitialise the sampler.
   */
  reset(): void {
    this._initializeSampler();
    this.samples = [];
    this.trajectory = [];
    this.rejectedCount = 0;
    this.acceptedCount = 0;
    this.error = null;
    this.currentParticle = {
      q: { ...this.initialPosition },
      p: { x: 0, y: 0 },
    };
  }
}
