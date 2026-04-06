import { useState, useCallback, useRef, useEffect } from 'react';
import { Logp } from '../utils/mathEngine';
import { SamplingChain } from '../samplers/SamplingChain';
import { DEFAULT_SAMPLER_PARAMS } from '../samplers/defaultConfigs';
import { generateGrid, createContourTrace } from '../utils/plotFunctions';
import { CONTOUR } from '../utils/plotConfig.json';
import { calculateGelmanRubin, calculateESS } from '../utils/statistics';
import { prepareHistogramData } from '../utils/histogramUtils';

/**
 * Custom hook to control the HMC sampling process using independent chains
 * @returns {Object} Controller interface and state
 */
export default function useSamplingController() {
  const [logP, setLogPString] = useState('');

  // Now tracks an array of chain states instead of duplicated specific keys
  const [chains, setChains] = useState([
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
  const [error, setError] = useState(null);
  // Per-chain error map: id → message
  const [chainErrors, setChainErrors] = useState(new Map());
  const [contourData, setContourData] = useState(null);

  // Fast sampling mode
  const [useFastMode, setUseFastMode] = useState(false);

  // Statistics
  const [rHat, setRHat] = useState(null);
  const [ess, setEss] = useState(null);
  const [histogramData, setHistogramData] = useState({ samples: [] });

  // Visualization params
  const [burnIn, setBurnIn] = useState(10);
  const [axisLimits, setAxisLimitsState] = useState({
    xMin: CONTOUR.grid.xRange[0],
    xMax: CONTOUR.grid.xRange[1],
    yMin: CONTOUR.grid.yRange[0],
    yMax: CONTOUR.grid.yRange[1],
  });

  const logpInstanceRef = useRef(null);

  // Real OOP sampling chains held in refs
  const samplingChainsRef = useRef(new Map());

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
      const { x, y } = generateGrid(
        [axisLimits.xMin, axisLimits.xMax],
        [axisLimits.yMin, axisLimits.yMax]
      );
      const z = y.map((yVal) =>
        x.map((xVal) => {
          try {
            return logpInstanceRef.current.getLogProbability(xVal, yVal);
          } catch {
            return NaN;
          }
        })
      );
      setContourData(createContourTrace(x, y, z));
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
          trajectory: [...impl.trajectory],
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
    setChainErrors(new Map());
    syncChainsState();
  }, [syncChainsState]);

  // Sync stats when chains change OR iteration stops
  useEffect(() => {
    if (isRunning) return;

    // We expect chains[0] samples, and potentially chains[1]
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
  }, [isRunning, chains, burnIn]);

  const setLogP = useCallback(
    (str) => {
      setLogPString(str);
      setError(null);
      try {
        if (str) {
          logpInstanceRef.current = new Logp(str);
          computeContour();
        } else {
          logpInstanceRef.current = null;
          setContourData(null);
        }
        reset();
      } catch (e) {
        setError(e.message);
        logpInstanceRef.current = null;
        setContourData(null);
      }
    },
    [reset, computeContour]
  );

  const setAxisLimits = useCallback((newLimits) => {
    setAxisLimitsState((prev) => ({ ...prev, ...newLimits }));
  }, []);

  // Update configuration for a specific chain
  const setChainConfig = useCallback((id, configUpdates) => {
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
              impl.initialPosition = configUpdates.initialPosition;
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
  }, []);

  const addChain = useCallback((config = {}) => {
    const id = config.id || Date.now();
    const samplerType = config.samplerType || 'HMC';
    const newConfig = {
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
  }, []);

  const removeChain = useCallback(
    (id) => {
      // Guard: do not remove while sampling is in progress
      if (isRunning) return;
      samplingChainsRef.current.delete(id);
      setChains((prev) => prev.filter((c) => c.id !== id));
    },
    [isRunning]
  );

  /**
   * Reset a single chain by id without affecting other chains.
   */
  const resetChain = useCallback((id) => {
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
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const sampleSteps = useCallback(
    (n) => {
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
                chain.step(logpInstanceRef.current)
              );
            }
            // Collect per-chain errors after batch
            const newErrors = new Map();
            samplingChainsRef.current.forEach((chain, id) => {
              if (chain.error) newErrors.set(id, chain.error);
            });
            if (newErrors.size > 0) setChainErrors(newErrors);
            syncChainsState();
            setIterationCount((prev) => prev + n);
            setIsRunning(false);
          } catch (e) {
            setError(e.message);
            setIsRunning(false);
          }
        }, 0);
        return;
      }

      let stepsCompleted = 0;
      const executeStep = () => {
        try {
          samplingChainsRef.current.forEach((chain) =>
            chain.step(logpInstanceRef.current)
          );
          // Collect per-chain errors
          const newErrors = new Map();
          samplingChainsRef.current.forEach((chain, id) => {
            if (chain.error) newErrors.set(id, chain.error);
          });
          if (newErrors.size > 0) setChainErrors(newErrors);
          syncChainsState();
          setIterationCount((prev) => prev + 1);
          stepsCompleted++;

          if (stepsCompleted < n) {
            requestAnimationFrame(executeStep);
          } else {
            setIsRunning(false);
          }
        } catch (e) {
          setError(e.message);
          setIsRunning(false);
        }
      };
      executeStep();
    },
    [useFastMode, syncChainsState]
  );

  const stepAction = useCallback(() => sampleSteps(1), [sampleSteps]);

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
  };
}
