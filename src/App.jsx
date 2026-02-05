import './App.css';
import Controls from './components/Controls';
import Visualizer from './components/Visualizer';
import TracePlots from './components/TracePlots';
import HistogramPlots from './components/HistogramPlots';
import useSamplingController from './hooks/useSamplingController';

function App() {
  const {
    logP,
    params,
    initialPosition,
    iterationCount,
    acceptedCount,
    rejectedCount,
    isRunning,
    error,
    contourData,
    trajectory,
    samples,
    seed,
    useSeededMode,
    setLogP,
    setParams,
    setInitialPosition,
    step,
    sampleSteps,
    reset,
    setSeed,
    // Second chain
    useSecondChain,
    initialPosition2,
    samples2,
    trajectory2,
    acceptedCount2,
    rejectedCount2,
    seed2,
    setUseSecondChain,
    setInitialPosition2,
    setSeed2,
    burnIn,
    setBurnIn,
    rHat,
    ess,
    histogramData,
    axisLimits,
    setAxisLimits,
    useFastMode,
    setUseFastMode,
    samplerType,
    setSamplerType,
  } = useSamplingController();

  return (
    <div className="App">
      <div className="App-sidebar">
        <Controls
          logP={logP}
          params={params}
          initialPosition={initialPosition}
          iterationCount={iterationCount}
          // acceptedCount={acceptedCount}
          // rejectedCount={rejectedCount}
          isRunning={isRunning}
          error={error}
          seed={seed}
          useSeededMode={useSeededMode}
          setLogP={setLogP}
          setParams={setParams}
          setInitialPosition={setInitialPosition}
          step={step}
          sampleSteps={sampleSteps}
          reset={reset}
          setSeed={setSeed}
          useSecondChain={useSecondChain}
          initialPosition2={initialPosition2}
          // acceptedCount2={acceptedCount2}
          // rejectedCount2={rejectedCount2}
          seed2={seed2}
          setUseSecondChain={setUseSecondChain}
          setInitialPosition2={setInitialPosition2}
          setSeed2={setSeed2}
          burnIn={burnIn}
          setBurnIn={setBurnIn}
          axisLimits={axisLimits}
          setAxisLimits={setAxisLimits}
          useFastMode={useFastMode}
          setUseFastMode={setUseFastMode}
          samplerType={samplerType}
          setSamplerType={setSamplerType}
        />
      </div>
      <div className="App-main">
        <div className="social-overlay">
          <a
            href="https://github.com/aerubanov/HMC_visualization"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
          >
            <svg
              height="32"
              aria-hidden="true"
              viewBox="0 0 16 16"
              version="1.1"
              width="32"
              data-view-component="true"
              className="github-icon"
            >
              <path
                fill="currentColor"
                d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"
              ></path>
            </svg>
          </a>
          <a
            className="libutton"
            href="https://www.linkedin.com/comm/mynetwork/discovery-see-all?usecase=PEOPLE_FOLLOWS&followMember=aerubanov"
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow on LinkedIn
          </a>
        </div>
        <Visualizer
          contourData={contourData}
          trajectory={trajectory}
          acceptedSamples={samples}
          trajectory2={trajectory2}
          acceptedSamples2={samples2}
          useSecondChain={useSecondChain}
          axisLimits={axisLimits}
        />
        <div className="trace-plots-section">
          {contourData && (
            <>
              <TracePlots
                samples={samples}
                samples2={samples2}
                burnIn={burnIn}
                useSecondChain={useSecondChain}
                rHat={rHat}
                ess={ess}
                acceptedCount={acceptedCount}
                rejectedCount={rejectedCount}
                acceptedCount2={acceptedCount2}
                rejectedCount2={rejectedCount2}
              />
              <HistogramPlots
                histogramData={histogramData}
                axisLimits={axisLimits}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
