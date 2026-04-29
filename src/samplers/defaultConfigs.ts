import type { HMCParams, GibbsParams } from '../types';

/**
 * Default parameter objects for each sampler type.
 * Keyed by sampler type discriminator string.
 */
export const DEFAULT_SAMPLER_PARAMS: {
  HMC: HMCParams;
  GIBBS: GibbsParams;
} = {
  HMC: { epsilon: 0.1, L: 10, steps: 1 },
  GIBBS: { w: 1.0 },
};
