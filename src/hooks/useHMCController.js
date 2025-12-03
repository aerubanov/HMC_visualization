import { useState, useCallback, useRef } from 'react';
import { Logp } from '../utils/mathEngine';
import { step } from '../utils/hmcSampler';

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

  // Refs to hold instances/values that don't trigger re-renders or need to be accessed in loops
  const logpInstanceRef = useRef(null);
  const currentParticleRef = useRef(null); // { q, p }

  const reset = useCallback(() => {
    setSamples([]);
    setTrajectory([]);
    setIterationCount(0);

    const startState = {
      q: { ...initialPosition },
      p: { x: 0, y: 0 },
    };

    setCurrentParticle(startState);
    currentParticleRef.current = startState;
    setIsRunning(false);
  }, [initialPosition]);

  const setLogP = useCallback(
    (str) => {
      setLogPString(str);
      setError(null);
      try {
        if (str) {
          logpInstanceRef.current = new Logp(str);
        } else {
          logpInstanceRef.current = null;
        }
        // Reset state when function changes
        reset();
      } catch (e) {
        setError(e.message);
        logpInstanceRef.current = null;
      }
    },
    [reset]
  );

  const setParams = useCallback((newParams) => {
    setParamsState((prev) => ({ ...prev, ...newParams }));
  }, []);

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

      const U = (x, y) => -logpInstanceRef.current.getLogProbability(x, y);
      const gradU = (x, y) => {
        const [dx, dy] = logpInstanceRef.current.getLogProbabilityGradient(
          x,
          y
        );
        return { x: -dx, y: -dy };
      };

      let stepsCompleted = 0;

      const executeStep = () => {
        try {
          const result = step(
            currentParticleRef.current.q,
            params.epsilon,
            params.L,
            U,
            gradU
          );

          currentParticleRef.current = {
            q: result.q,
            p: result.p || { x: 0, y: 0 },
          };

          // Update state after each step - UI will render between steps
          setSamples((prev) => [...prev, result.q]);
          if (result.trajectory) {
            setTrajectory((prev) => [...prev, result.trajectory]);
          }
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
    [params, initialPosition]
  );

  // Expose single step for manual stepping
  const stepAction = useCallback(() => {
    sampleSteps(1);
  }, [sampleSteps]);

  return {
    logP,
    params,
    initialPosition,
    samples,
    trajectory,
    currentParticle,
    isRunning,
    iterationCount,
    error,
    setLogP,
    setParams,
    setInitialPosition,
    sampleSteps,
    step: stepAction,
    reset,
  };
}
