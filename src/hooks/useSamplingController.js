import { useState, useCallback, useRef, useEffect } from 'react';
import { Logp } from '../utils/mathEngine';
import { HMCSampler } from '../samplers/HMCSampler';
import { generateGrid, createContourTrace } from '../utils/plotFunctions';
import { calculateGelmanRubin } from '../utils/statistics';

/**
 * Custom hook to control the HMC sampling process
 * Manages state for parameters, sampling results, and visualization data
 * @returns {Object} Controller interface and state
 */
export default function useSamplingController() {
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

  // Second chain state
  const [useSecondChain, setUseSecondChain] = useState(false);
  const [initialPosition2, setInitialPosition2] = useState({ x: 1, y: 1 });
  const [samples2, setSamples2] = useState([]);
  const [trajectory2, setTrajectory2] = useState([]);
  const [currentParticle2, setCurrentParticle2] = useState(null);
  const [rejectedCount2, setRejectedCount2] = useState(0);
  const [seed2, setSeed2State] = useState(null);

  // Statistics
  const [rHat, setRHat] = useState(null);

  // Visualization params
  const [burnIn] = useState(10);

  // Refs to hold instances/values that don't trigger re-renders or need to be accessed in loops
  const logpInstanceRef = useRef(null);
  const currentParticleRef = useRef(null); // { q, p }

  // Sampler instances
  const samplerRef = useRef(new HMCSampler({ epsilon: 0.1, L: 10 }));
  const samplerRef2 = useRef(new HMCSampler({ epsilon: 0.1, L: 10 }));
  const currentParticleRef2 = useRef(null); // Second chain particle state

  // Update sampler params when state changes (or initializes)
  useEffect(() => {
    samplerRef.current.setParams({ epsilon: params.epsilon, L: params.L });
    samplerRef2.current.setParams({ epsilon: params.epsilon, L: params.L });
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

      // Create the contour trace
      const trace = createContourTrace(x, y, z);
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

    setRHat(null);

    // Reset second chain if enabled
    if (useSecondChain) {
      setSamples2([]);
      setTrajectory2([]);
      setRejectedCount2(0);

      const startState2 = {
        q: { ...initialPosition2 },
        p: { x: 0, y: 0 },
      };

      setCurrentParticle2(startState2);
      currentParticleRef2.current = startState2;

      // Reset second chain RNG if seeded mode is enabled
      if (useSeededMode && seed2 !== null) {
        samplerRef2.current.setSeed(seed2);
      }
    }
  }, [
    initialPosition,
    initialPosition2,
    useSeededMode,
    seed,
    seed2,
    useSecondChain,
  ]);

  // Calculate R-hat when sampling finishes
  useEffect(() => {
    // Only calculate if not running, using second chain, and we have samples
    if (
      !isRunning &&
      useSecondChain &&
      samples.length > burnIn &&
      samples2.length > burnIn
    ) {
      const validSamples = samples.slice(burnIn);
      const validSamples2 = samples2.slice(burnIn);

      // Ensure we still have enough samples after burn-in
      if (validSamples.length > 1 && validSamples2.length > 1) {
        const rHatValue = calculateGelmanRubin([validSamples, validSamples2]);
        setRHat(rHatValue);
      } else {
        setRHat(null);
      }
    } else if (!isRunning) {
      // If stopped but conditions not met, ensure reset?
      // No, keep previous if just paused? Or reset if conditions invalid?
      // The prompt implies we calculate IT when complete.
      // If we don't have enough samples, we should probably set to null or keep null.
      // Let's assume strict update: if conditions met calc, else null?
      // But if I just completed a short run, I don't want to show old result.
      // Wait, if I paused, I might want to see result so far?
      // User said "completed".
      // Let's stick to: if we have enough samples, show it.
    }
  }, [isRunning, useSecondChain, samples, samples2, burnIn]);

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

      // Initialize second chain particle if enabled and not initialized
      if (useSecondChain && !currentParticleRef2.current) {
        currentParticleRef2.current = {
          q: { ...initialPosition2 },
          p: { x: 0, y: 0 },
        };
      }

      let stepsCompleted = 0;

      const executeStep = () => {
        try {
          // Perform step using HMCSampler for chain 1
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

          // Run second chain if enabled
          if (useSecondChain) {
            const result2 = samplerRef2.current.step(
              currentParticleRef2.current,
              logpInstanceRef.current
            );

            currentParticleRef2.current = {
              q: result2.q,
              p: result2.p || { x: 0, y: 0 },
            };

            // Update second chain state
            if (result2.accepted) {
              setSamples2((prev) => [...prev, result2.q]);
            } else {
              setRejectedCount2((prev) => prev + 1);
            }

            setTrajectory2(result2.trajectory || []);
            setCurrentParticle2(currentParticleRef2.current);
          }

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
    [initialPosition, initialPosition2, useSecondChain]
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

  /**
   * Set the random seed for second chain
   * @param {number|null} newSeed - Seed value, or null to disable seeded mode for chain 2
   */
  const setSeed2 = useCallback((newSeed) => {
    setSeed2State(newSeed);
    samplerRef2.current.setSeed(newSeed);
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
    // Second chain data and controls
    useSecondChain,
    initialPosition2,
    samples2,
    trajectory2,
    currentParticle2,
    acceptedCount2: samples2.length,
    rejectedCount2,
    seed2,
    setUseSecondChain,
    setInitialPosition2,
    setSeed2,
    burnIn,
    rHat,
  };
}
