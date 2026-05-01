import { useState, useCallback, useRef, useEffect } from 'react';
import type * as Plotly from 'plotly.js';
import type React from 'react';
import { Logp } from '../utils/mathEngine';
import { SamplingChain } from '../samplers/SamplingChain';
import { DEFAULT_SAMPLER_PARAMS } from '../samplers/defaultConfigs';
import { generateGrid, createContourTrace } from '../utils/plotFunctions';
import { CONTOUR } from '../utils/plotConfig.json';
import { calculateGelmanRubin, calculateESS } from '../utils/statistics';
import {
  prepareHistogramData,
  prepareHistogramDataPerChain,
} from '../utils/histogramUtils';
import { logger } from '../utils/logger';
import type {
  ChainState,
  ChainConfigUpdate,
  Point,
  AxisLimits,
  EssResult,
  PerChainEss,
  HistogramDataPerChain,
} from '../types';

/**
 * Returns true when all chains share the same samplerType and sampler params
 * (ignoring chain-specific fields: initialPosition and seed), or when there is
 * at most one chain. When this returns false, R-hat is meaningless and ESS
 * should be computed per-chain.
 */
export function allChainsCompatible(chains: ChainState[]): boolean {
  if (chains.length <= 1) return true;
  const ref = chains[0];
  return chains.every((c) => {
    if (c.samplerType !== ref.samplerType) return false;
    const refParams = ref.params || {};
    const cParams = c.params || {};
    const keys = new Set([...Object.keys(refParams), ...Object.keys(cParams)]);
    return [...keys].every(
      (k) =>
        (cParams as Record<string, unknown>)[k] ===
        (refParams as Record<string, unknown>)[k]
    );
  });
}

/**
 * Custom hook to control the HMC sampling process using independent chains.
 *
 * @returns Controller interface and state
 */
export default function useSamplingController() {
  const [logP, setLogPString] = useState('');

  // Now tracks an array of chain states instead of duplicated specific keys
  const [chains, setChains] = useState<ChainState[]>([
    {
      id: 0,
      samplerType: 'HMC',
      params: { ...DEFAULT_SAMPLER_PARAMS['HMC'] },
      initialPosition: { x: 0, y: 0 },
      seed: null,
      samples: [],
      trajectory: [],
      rejectedCount: 0,
      acceptedCount: 0,
      error: null,
      currentParticle: null,
    },
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [iterationCount, setIterationCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Per-chain error object: id → message
  const [chainErrors, setChainErrors] = useState<Record<number, string>>({});
  const [contourData, setContourData] =
    useState<Partial<Plotly.PlotData> | null>(null);

  // Fast sampling mode
  const [useFastMode, setUseFastMode] = useState(false);

  // Statistics
  const [rHat, setRHat] = useState<EssResult | null>(null);
  const [ess, setEss] = useState<EssResult | null>(null);
  const [histogramData, setHistogramData] = useState<{ samples: Point[] }>({
    samples: [],
  });
  // Per-chain stats — populated only when chains have different sampler types
  const [histogramDataPerChain, setHistogramDataPerChain] = useState<
    HistogramDataPerChain[] | null
  >(null);
  const [essPerChain, setEssPerChain] = useState<PerChainEss[] | null>(null);

  // Visualization params
  const [burnIn, setBurnIn] = useState(10);
  const [axisLimits, setAxisLimitsState] = useState<AxisLimits>({
    xMin: CONTOUR.grid.xRange[0],
    xMax: CONTOUR.grid.xRange[1],
    yMin: CONTOUR.grid.yRange[0],
    yMax: CONTOUR.grid.yRange[1],
  });

  const logpInstanceRef = useRef<Logp | null>(
    null
  ) as React.MutableRefObject<Logp | null>;

  // Cancellation flag for non-fast sampling loop
  const cancelRef = useRef<boolean>(false) as React.MutableRefObject<boolean>;

  // Real OOP sampling chains held in refs
  const samplingChainsRef = useRef<Map<number, SamplingChain>>(
    new Map()
  ) as React.MutableRefObject<Map<number, SamplingChain>>;

  // Ensure refs match state size (initialize chains).
  // Depend only on chain IDs so this does not fire on every syncChainsState call.
  const chainIdsKey = chains.map((c) => c.id).join(',');
  useEffect(() => {
    chains.forEach((c) => {
      if (!samplingChainsRef.current.has(c.id)) {
        samplingChainsRef.current.set(c.id, new SamplingChain(c));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainIdsKey]);

  const computeContour = useCallback(() => {
    if (!logpInstanceRef.current) {
      setContourData(null);
      return;
    }

    try {
      const { x, y, xGrid, yGrid } = generateGrid(
        [axisLimits.xMin, axisLimits.xMax],
        [axisLimits.yMin, axisLimits.yMax]
      );
      const z = y.map((yVal) =>
        x.map((xVal) => {
          try {
            return (logpInstanceRef.current as Logp).getLogProbability(
              xVal,
              yVal
            );
          } catch {
            return NaN;
          }
        })
      );
      setContourData(createContourTrace(xGrid, yGrid, z));
    } catch (e) {
      console.error('Error computing contour:', e);
      setContourData(null);
    }
  }, [axisLimits]);

  useEffect(() => computeContour(), [computeContour]);

  // Sync back visual info from SamplingChains to React State.
  // Only copies trajectory (small, bounded) and the latest sample / counters.
  const syncChainsState = useCallback(() => {
    setChains((prev) =>
      prev.map((c) => {
        const impl = samplingChainsRef.current.get(c.id);
        if (!impl) return c;
        return {
          ...c,
          samples: [...impl.samples],
          trajectory: impl.trajectory.map((p) => ({ ...p })),
          rejectedCount: impl.rejectedCount,
          acceptedCount: impl.acceptedCount,
          error: impl.error,
          currentParticle: impl.currentParticle,
        };
      })
    );
  }, []);

  const reset = useCallback(() => {
    samplingChainsRef.current.forEach((chain) => chain.reset());
    setIterationCount(0);
    setIsRunning(false);
    setRHat(null);
    setEss(null);
    setHistogramData({ samples: [] });
    setHistogramDataPerChain(null);
    setEssPerChain(null);
    setChainErrors({});
    syncChainsState();
  }, [syncChainsState]);

  // Sync stats when chains change OR iteration stops
  useEffect(() => {
    if (isRunning) return;

    if (allChainsCompatible(chains)) {
      // --- Same sampler type: existing merged behaviour ---
      const samples1 = chains[0]?.samples || [];
      const samples2 = chains[1]?.samples || [];
      const hasSecondChain = chains.length > 1;

      const hData = prepareHistogramData(
        samples1,
        samples2,
        burnIn,
        hasSecondChain
      );
      setHistogramData(hData);
      setHistogramDataPerChain(null);
      setEssPerChain(null);

      const validSamples1 = samples1.slice(burnIn);
      const validSamples2 = samples2.slice(burnIn);

      if (
        hasSecondChain &&
        validSamples1.length > 1 &&
        validSamples2.length > 1
      ) {
        setRHat(calculateGelmanRubin([validSamples1, validSamples2]));
        setEss(calculateESS([validSamples1, validSamples2]));
      } else if (!hasSecondChain && validSamples1.length > 1) {
        setRHat(null);
        setEss(calculateESS([validSamples1]));
      } else {
        setRHat(null);
        setEss(null);
      }
    } else {
      // --- Different sampler types: per-chain stats ---
      setHistogramData({ samples: [] });
      setRHat(null);
      setEss(null);

      setHistogramDataPerChain(prepareHistogramDataPerChain(chains, burnIn));

      const perChainEss: PerChainEss[] = chains.map((c) => {
        const postBurnin = (c.samples || []).slice(burnIn);
        if (postBurnin.length <= 1) {
          logger.warn('ESS skipped — insufficient samples', {
            chainId: c.id,
            count: postBurnin.length,
          });
        }
        return {
          chainId: c.id,
          ess: postBurnin.length > 1 ? calculateESS([postBurnin]) : null,
        };
      });
      setEssPerChain(perChainEss);
    }
  }, [isRunning, chains, burnIn]);

  const setLogP = useCallback(
    (str: string) => {
      setLogPString(str);
      setError(null);
      try {
        if (str) {
          logpInstanceRef.current = new Logp(str);
          computeContour();
          logger.info('logP set', { expr: str.slice(0, 60) });
        } else {
          logpInstanceRef.current = null;
          setContourData(null);
          logger.info('logP cleared');
        }
        reset();
      } catch (e) {
        setError((e as Error).message);
        logpInstanceRef.current = null;
        setContourData(null);
        logger.error('logP parse error', { message: (e as Error).message });
      }
    },
    [reset, computeContour]
  );

  const setAxisLimits = useCallback((newLimits: Partial<AxisLimits>) => {
    setAxisLimitsState((prev) => ({ ...prev, ...newLimits }));
  }, []);

  /** Update configuration for a specific chain. */
  const setChainConfig = useCallback(
    (id: number, configUpdates: ChainConfigUpdate): void => {
      setChains((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            const result = { ...c };
            // Merge params if provided (not replace)
            if (configUpdates.params !== undefined) {
              result.params = { ...c.params, ...configUpdates.params };
            }
            // Apply remaining non-params updates
            const { params: _params, ...otherUpdates } = configUpdates;
            Object.assign(result, otherUpdates);

            const impl = samplingChainsRef.current.get(id);
            if (impl) {
              // Sync samplerType on the ref BEFORE updating React state to keep them consistent
              if (configUpdates.samplerType !== undefined)
                impl.setSamplerType(configUpdates.samplerType);
              if (configUpdates.params !== undefined)
                impl.setParams(configUpdates.params);
              if (configUpdates.initialPosition !== undefined)
                impl.setInitialPosition(configUpdates.initialPosition);
              if (configUpdates.seed !== undefined)
                impl.setSeed(configUpdates.seed);
            }

            // If samplerType changed, ensure params map default properly into react state
            if (
              configUpdates.samplerType !== undefined &&
              configUpdates.samplerType !== c.samplerType
            ) {
              result.params = {
                ...DEFAULT_SAMPLER_PARAMS[configUpdates.samplerType],
              };
              // Implicit reset inside sampling chain needs a sync or manual reset:
              result.samples = [];
              result.trajectory = [];
              result.rejectedCount = 0;
              result.acceptedCount = 0;
              result.error = null;
              result.currentParticle = null;
            }

            return result;
          }
          return c;
        })
      );
    },
    []
  );

  /** Add a new chain, optionally pre-seeded with partial config. */
  const addChain = useCallback((config: Partial<ChainState> = {}): void => {
    const id = config.id || Date.now();
    const samplerType = config.samplerType || 'HMC';
    const newConfig: ChainState = {
      id,
      samplerType,
      params: { ...DEFAULT_SAMPLER_PARAMS[samplerType] },
      initialPosition: { x: 1, y: 1 },
      seed: null,
      samples: [],
      trajectory: [],
      rejectedCount: 0,
      acceptedCount: 0,
      error: null,
      currentParticle: null,
      ...config,
    };
    // Create the ref instance here; the useEffect will skip it since the id is already present
    samplingChainsRef.current.set(id, new SamplingChain(newConfig));
    setChains((prev) => [...prev, newConfig]);
    logger.info('Chain added', { id, sampler: samplerType });
  }, []);

  /** Remove a chain by id. No-op while sampling is running. */
  const removeChain = useCallback(
    (id: number): void => {
      // Guard: do not remove while sampling is in progress
      if (isRunning) return;
      samplingChainsRef.current.delete(id);
      setChains((prev) => prev.filter((c) => c.id !== id));
      logger.info('Chain removed', { id });
    },
    [isRunning]
  );

  /**
   * Reset a single chain by id without affecting other chains.
   */
  const resetChain = useCallback((id: number): void => {
    const impl = samplingChainsRef.current.get(id);
    if (impl) {
      impl.reset();
    }
    setChains((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          samples: [],
          trajectory: [],
          rejectedCount: 0,
          acceptedCount: 0,
          error: null,
          currentParticle: impl ? impl.currentParticle : null,
        };
      })
    );
    setChainErrors((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const sampleSteps = useCallback(
    (n: number): void => {
      cancelRef.current = false;
      logger.debug('Sampling started', {
        steps: n,
        mode: useFastMode ? 'fast' : 'standard',
      });
      setIsRunning(true);
      if (!logpInstanceRef.current) {
        console.warn('No logP function set');
        setIsRunning(false);
        return;
      }

      if (useFastMode) {
        setTimeout(() => {
          try {
            // Process all iteration batch before returning to main thread loop
            for (let i = 0; i < n; i++) {
              samplingChainsRef.current.forEach((chain) =>
                chain.step(logpInstanceRef.current as Logp)
              );
            }
            // Collect per-chain errors after batch
            const newErrors: Record<number, string> = {};
            samplingChainsRef.current.forEach((chain, id) => {
              if (chain.error) newErrors[id] = chain.error;
            });
            setChainErrors(newErrors);
            syncChainsState();
            setIterationCount((prev) => prev + n);
            setIsRunning(false);
          } catch (e) {
            setError((e as Error).message);
            setIsRunning(false);
          }
        }, 0);
        return;
      }

      let stepsCompleted = 0;
      const executeStep = () => {
        try {
          samplingChainsRef.current.forEach((chain) =>
            chain.step(logpInstanceRef.current as Logp)
          );
          // Collect per-chain errors
          const newErrors: Record<number, string> = {};
          samplingChainsRef.current.forEach((chain, id) => {
            if (chain.error) newErrors[id] = chain.error;
          });
          setChainErrors(newErrors);
          Object.entries(newErrors).forEach(([id, msg]) =>
            logger.warn('Chain error', { id, error: msg })
          );
          syncChainsState();
          setIterationCount((prev) => prev + 1);
          stepsCompleted++;

          if (cancelRef.current) {
            setIsRunning(false);
            logger.info('Sampling cancelled', { completed: stepsCompleted });
            return;
          }

          if (stepsCompleted < n) {
            requestAnimationFrame(executeStep);
          } else {
            setIsRunning(false);
            logger.info('Sampling completed', { steps: stepsCompleted });
          }
        } catch (e) {
          setError((e as Error).message);
          setIsRunning(false);
          logger.error('Sampling error', { message: (e as Error).message });
        }
      };
      executeStep();
    },
    [useFastMode, syncChainsState]
  );

  const stepAction = useCallback(() => sampleSteps(1), [sampleSteps]);

  const stopSampling = useCallback(() => {
    cancelRef.current = true;
  }, []);

  // Derived properties for UI backwards compatibility (mostly handling fast mode rendering and general stats)
  return {
    logP,
    chains,
    isRunning,
    iterationCount,
    error,
    chainErrors,
    contourData,

    setLogP,
    sampleSteps,
    step: stepAction,
    reset,
    stopSampling,

    // Fast mode
    useFastMode,
    setUseFastMode,

    // Chain Management
    setChainConfig,
    addChain,
    removeChain,
    resetChain,

    // Plot props
    burnIn,
    setBurnIn,
    axisLimits,
    setAxisLimits,
    rHat,
    ess,
    histogramData,
    // Per-chain stats (non-null only when chains have different sampler types)
    essPerChain,
    histogramDataPerChain,
  };
}
