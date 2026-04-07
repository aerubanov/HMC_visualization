import './App.css';
import Controls from './components/Controls';
import Visualizer from './components/Visualizer';
import TracePlots from './components/TracePlots';
import HistogramPlots from './components/HistogramPlots';
import useSamplingController from './hooks/useSamplingController';
import useRecording from './hooks/useRecording';

function App() {
  const {
    logP,
    chains,
    iterationCount,
    isRunning,
    error,
    contourData,
    setLogP,
    setChainConfig,
    addChain,
    removeChain,
    step,
    sampleSteps,
    reset,
    burnIn,
    setBurnIn,
    rHat,
    ess,
    histogramData,
    axisLimits,
    setAxisLimits,
    useFastMode,
    setUseFastMode,
  } = useSamplingController();

  const {
    isRecording,
    isEncoding,
    startRecording,
    stopRecording,
    captureFrame,
  } = useRecording();

  return (
    <div className="App">
      <div className="App-sidebar">
        <Controls
          logP={logP}
          chains={chains}
          iterationCount={iterationCount}
          isRunning={isRunning}
          error={error}
          setLogP={setLogP}
          setChainConfig={setChainConfig}
          addChain={addChain}
          removeChain={removeChain}
          step={step}
          sampleSteps={sampleSteps}
          reset={reset}
          burnIn={burnIn}
          setBurnIn={setBurnIn}
          axisLimits={axisLimits}
          setAxisLimits={setAxisLimits}
          useFastMode={useFastMode}
          setUseFastMode={setUseFastMode}
          isRecording={isRecording}
          isEncoding={isEncoding}
          startRecording={startRecording}
          stopRecording={stopRecording}
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
          chains={chains}
          axisLimits={axisLimits}
          isRecording={isRecording}
          captureFrame={captureFrame}
        />
        <div className="trace-plots-section">
          {contourData && (
            <>
              <TracePlots
                chains={chains}
                burnIn={burnIn}
                rHat={rHat}
                ess={ess}
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
