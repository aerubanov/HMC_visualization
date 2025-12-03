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

    const setLogP = useCallback((str) => {
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
    }, []);

    const setParams = useCallback((newParams) => {
        setParamsState((prev) => ({ ...prev, ...newParams }));
    }, []);

    const stepSampler = useCallback(() => {
        if (!logpInstanceRef.current) return;

        // Initialize particle if not exists
        if (!currentParticleRef.current) {
            currentParticleRef.current = {
                q: { ...initialPosition },
                p: { x: 0, y: 0 }, // Momentum is sampled in step() usually, but here we just need q
            };
        }

        const U = (x, y) => -logpInstanceRef.current.getLogProbability(x, y);
        const gradU = (x, y) => {
            const [dx, dy] = logpInstanceRef.current.getLogProbabilityGradient(x, y);
            return { x: -dx, y: -dy };
        };

        try {
            const result = step(
                currentParticleRef.current.q,
                params.epsilon,
                params.L,
                U,
                gradU
            );

            // Update current particle
            currentParticleRef.current = {
                q: result.q,
                p: result.p || { x: 0, y: 0 }, // step might return p, or we resample
            };

            // Update state
            setSamples((prev) => [...prev, result.q]);

            // Update trajectory history
            // result.trajectory is the path of the leapfrog
            if (result.trajectory) {
                setTrajectory((prev) => [...prev, result.trajectory]);
            }

            setCurrentParticle(currentParticleRef.current);
            setIterationCount((prev) => prev + 1);
        } catch (e) {
            console.error('Sampler step error:', e);
            setError(e.message);
        }
    }, [params, initialPosition]);

    const sampleSteps = useCallback(
        (n) => {
            setIsRunning(true);
            // In a real app, we might want to do this async or with requestAnimationFrame
            // For now, we do it synchronously in a loop as requested by the test logic
            // but in React state updates are batched.

            // If we call stepSampler() n times in a loop, React might batch updates.
            // However, since we rely on refs for currentParticle, the logic should be correct.
            // But setSamples will batch.

            // To support "sample N steps", we should probably do the loop here and then update state once?
            // Or update state N times?
            // If we update state N times in a loop, React 18 will batch them.
            // So we might only see the last update.

            // Better approach for React: calculate N steps and update state once.

            if (!logpInstanceRef.current) return;

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

            const newSamples = [];
            const newTrajectories = [];
            let currentQ = currentParticleRef.current.q;

            try {
                for (let i = 0; i < n; i++) {
                    const result = step(currentQ, params.epsilon, params.L, U, gradU);

                    currentQ = result.q;
                    newSamples.push(result.q);
                    if (result.trajectory) {
                        newTrajectories.push(result.trajectory);
                    }
                }

                currentParticleRef.current = { q: currentQ, p: { x: 0, y: 0 } }; // Update ref

                setSamples((prev) => [...prev, ...newSamples]);
                setTrajectory((prev) => [...prev, ...newTrajectories]);
                setCurrentParticle(currentParticleRef.current);
                setIterationCount((prev) => prev + n);
            } catch (e) {
                setError(e.message);
            }

            setIsRunning(false);
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
