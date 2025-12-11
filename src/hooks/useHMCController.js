import { useState, useCallback, useRef } from 'react';
import { Logp } from '../utils/mathEngine';
import { step } from '../utils/hmcSampler';
import { generateGrid, createContourTrace } from '../utils/plotConfig';

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

  // Refs to hold instances/values that don't trigger re-renders or need to be accessed in loops
  const logpInstanceRef = useRef(null);
  const currentParticleRef = useRef(null); // { q, p }

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
  }, [initialPosition]);

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
    acceptedCount: samples.length,
    rejectedCount,
    error,
    contourData,
    setLogP,
    setParams,
    setInitialPosition,
    sampleSteps,
    step: stepAction,
    reset,
  };
}
