import { useState, useCallback, useRef, useEffect } from 'react';
import { Logp } from '../utils/mathEngine';
import { HMCSampler } from '../samplers/HMCSampler';
import { generateGrid, createContourTrace } from '../utils/plotFunctions';

/**
 * Custom hook to control the HMC sampling process
 * Manages state for parameters, sampling results, and visualization data
 * @returns {Object} Controller interface and state
 */
export default function useHMCController() {
  const [logP, setLogPString] = useState('');
  const [params, setParamsState] = useState({ epsilon: 0.1, L: 10, steps: 1 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [samples, setSamples] = useState([]);
  const [trajectory, setTrajectory] = useState([]);
  const [currentParticle, setCurrentParticle] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [iterationCount, setIterationCount] = useState(0);
  const [error, setError] = useState(null);
  const [contourData, setContourData] = useState(null);

  const [rejectedCount, setRejectedCount] = useState(0);

  // Seeded random state
  const [seed, setSeedState] = useState(null);
  const [useSeededMode, setUseSeededMode] = useState(false);

  // Refs to hold instances/values that don't trigger re-renders or need to be accessed in loops
  const logpInstanceRef = useRef(null);
  const currentParticleRef = useRef(null); // { q, p }

  // Sampler instance
  const samplerRef = useRef(new HMCSampler({ epsilon: 0.1, L: 10 }));

  // Update sampler params when state changes (or initializes)
  useEffect(() => {
    samplerRef.current.setParams({ epsilon: params.epsilon, L: params.L });
  }, [params.epsilon, params.L]);

  /**
   * Computes contour data for the current logp function
   */
  const computeContour = useCallback(() => {
    if (!logpInstanceRef.current) {
      setContourData(null);
      return;
    }

    try {
      const { x, y } = generateGrid();
      console.log('Grid generated:', { xLen: x.length, yLen: y.length });

      // Compute z values (log probability) for each grid point
      const z = y.map((yVal) =>
        x.map((xVal) => {
          try {
            return logpInstanceRef.current.getLogProbability(xVal, yVal);
          } catch {
            // Return NaN for points where evaluation fails
            return NaN;
          }
        })
      );

      console.log('Z values computed:', {
        zRows: z.length,
        zCols: z[0]?.length,
        sampleValues: [z[0]?.[0], z[25]?.[25], z[49]?.[49]],
        minZ: Math.min(...z.flat()),
        maxZ: Math.max(...z.flat()),
        hasNaN: z.flat().some((v) => isNaN(v)),
      });

      // Create the contour trace
      const trace = createContourTrace(x, y, z);
      console.log('Contour trace created:', {
        type: trace.type,
        xLength: trace.x.length,
        yLength: trace.y.length,
        zShape: [trace.z.length, trace.z[0]?.length],
        trace: trace,
      });
      setContourData(trace);
    } catch (e) {
      console.error('Error computing contour:', e);
      setContourData(null);
    }
  }, []);

  /**
   * Reset the sampler state (samples, trajectory, iteration count)
   * Keeps the current parameters and logP function
   * Also resets the RNG to the initial seed if seeded mode is enabled
   */
  const reset = useCallback(() => {
    setSamples([]);
    setTrajectory([]);
    setIterationCount(0);
    setRejectedCount(0);

    const startState = {
      q: { ...initialPosition },
      p: { x: 0, y: 0 },
    };

    setCurrentParticle(startState);
    currentParticleRef.current = startState;
    setIsRunning(false);

    // Reset RNG to initial seed if seeded mode is enabled
    if (useSeededMode && seed !== null) {
      samplerRef.current.setSeed(seed);
    }
  }, [initialPosition, useSeededMode, seed]);

  /**
   * Set the log probability function from a string expression
   * Parses the string and updates the contour plot
   * @param {string} str - Mathematical expression for log P(x, y)
   */
  const setLogP = useCallback(
    (str) => {
      setLogPString(str);
      setError(null);
      try {
        if (str) {
          logpInstanceRef.current = new Logp(str);
          // Compute contour data when function changes
          computeContour();
        } else {
          logpInstanceRef.current = null;
          setContourData(null);
        }
        // Reset state when function changes
        reset();
      } catch (e) {
        setError(e.message);
        logpInstanceRef.current = null;
        setContourData(null);
      }
    },
    [reset, computeContour]
  );

  /**
   * Update HMC parameters
   * @param {Object} newParams - Partial parameters object { epsilon, L, steps }
   */
  const setParams = useCallback((newParams) => {
    setParamsState((prev) => ({ ...prev, ...newParams }));
    // useEffect will handle updating samplerRef because it depends on params state
  }, []);

  /**
   * Run the sampler for N steps
   * Uses requestAnimationFrame for non-blocking execution
   * @param {number} n - Number of steps to run
   */
  const sampleSteps = useCallback(
    (n) => {
      setIsRunning(true);

      if (!logpInstanceRef.current) {
        setIsRunning(false);
        return;
      }

      if (!currentParticleRef.current) {
        currentParticleRef.current = {
          q: { ...initialPosition },
          p: { x: 0, y: 0 },
        };
      }

      let stepsCompleted = 0;

      const executeStep = () => {
        try {
          // Perform step using HMCSampler
          const result = samplerRef.current.step(
            currentParticleRef.current,
            logpInstanceRef.current
          );

          currentParticleRef.current = {
            q: result.q,
            p: result.p || { x: 0, y: 0 },
          };

          // Update state after each step - UI will render between steps
          // Only save accepted samples
          if (result.accepted) {
            setSamples((prev) => [...prev, result.q]);
          } else {
            setRejectedCount((prev) => prev + 1);
          }

          // Always show trajectory (even for rejected steps for visualization)
          setTrajectory(result.trajectory || []);

          setCurrentParticle(currentParticleRef.current);
          setIterationCount((prev) => prev + 1);

          stepsCompleted++;

          if (stepsCompleted < n) {
            // Schedule next step on next animation frame
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
    [initialPosition] // Removed useSeededMode dependency as rng is in sampler
  );

  // Expose single step for manual stepping
  /**
   * Perform a single HMC step
   * Wrapper around sampleSteps(1)
   */
  const stepAction = useCallback(() => {
    sampleSteps(1);
  }, [sampleSteps]);

  /**
   * Set the random seed for reproducible sampling
   * @param {number|null} newSeed - Seed value, or null to disable seeded mode
   */
  const setSeed = useCallback((newSeed) => {
    setSeedState(newSeed);
    samplerRef.current.setSeed(newSeed);
    setUseSeededMode(newSeed !== null);
  }, []);

  return {
    logP,
    params,
    initialPosition,
    samples,
    trajectory,
    currentParticle,
    isRunning,
    iterationCount,
    acceptedCount: samples.length,
    rejectedCount,
    error,
    contourData,
    seed,
    useSeededMode,
    setLogP,
    setParams,
    setInitialPosition,
    sampleSteps,
    step: stepAction,
    reset,
    setSeed,
    setUseSeededMode, // Actually setSeed handles both now, but keeping for compatibility if UI uses it directly?
    // UI likely uses useSeededMode to toggle UI state, so we just return the state.
    // setUseSeededMode might not be exposed or only used internally.
    // Original code exposed it. I'll expose it but wrapping it might be safer if we want to enforce logic.
    // simpler: user likely only calls setSeed.
  };
}
