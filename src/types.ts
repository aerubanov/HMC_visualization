/**
 * Shared TypeScript interfaces and type aliases for the HMC Visualization project.
 * Import from this module rather than duplicating type definitions across files.
 */

/** A 2D point in parameter space. */
export interface Point {
  x: number;
  y: number;
}

/** Parameters for the Hamiltonian Monte Carlo sampler. */
export interface HMCParams {
  epsilon: number;
  L: number;
  /** Legacy field kept for backward compatibility; unused in sampler logic. */
  steps?: number;
}

/** Result returned by a single sampler step. */
export interface StepResult {
  /** New position after the step. */
  q: Point;
  /** New momentum after the step (zero vector for Gibbs). */
  p: Point;
  /** Whether the proposal was accepted. */
  accepted: boolean;
  /** Trajectory points visited during the step (leapfrog path for HMC, Manhattan path for Gibbs). */
  trajectory: Point[];
}

/** Parameters for the Gibbs sampler. */
export interface GibbsParams {
  w: number;
}

/** Union of all sampler parameter types. */
export type SamplerParams = HMCParams | GibbsParams;

/** Discriminator string identifying which sampler algorithm a chain uses. */
export type SamplerType = 'HMC' | 'GIBBS';

/**
 * Full chain object shape as stored in React state by useSamplingController.
 * Note: currentParticle may be null in React state (e.g. immediately after a
 * samplerType change or before the first step), even though the SamplingChain
 * class always holds an initialised particle object.
 */
export interface ChainState {
  id: number;
  samplerType: SamplerType;
  params: SamplerParams;
  initialPosition: Point;
  seed: number | null;
  samples: Point[];
  trajectory: Point[];
  rejectedCount: number;
  acceptedCount: number;
  error: string | null;
  currentParticle: { q: Point; p: Point } | null;
}

/** Axis bounds used to constrain the 2D visualisation viewport. */
export interface AxisLimits {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/** Effective Sample Size computed separately for each parameter dimension. */
export interface EssResult {
  x: number;
  y: number;
}

/** ESS result attributed to a single chain; ess is null when there are too few samples. */
export interface PerChainEss {
  chainId: number | string;
  ess: EssResult | null;
}

/** Histogram-ready sample data for a single chain, used by HistogramPlots. */
export interface HistogramDataPerChain {
  chainId: number | string;
  samplerType: string;
  label: string;
  samples: Point[];
}

/** A predefined probability density function entry shown in the UI selector. */
export interface PredefinedFunction {
  label: string;
  value: string;
}
