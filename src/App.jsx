import './App.css';
import Controls from './components/Controls';
import Visualizer from './components/Visualizer';
import useHMCController from './hooks/useHMCController';

function App() {
  const {
    logP,
    params,
    initialPosition,
    iterationCount,
    isRunning,
    error,
    setLogP,
    setParams,
    setInitialPosition,
    step,
    sampleSteps,
    reset,
  } = useHMCController();

  return (
    <div className="App">
      <div className="App-sidebar">
        <Controls
          logP={logP}
          params={params}
          initialPosition={initialPosition}
          iterationCount={iterationCount}
          isRunning={isRunning}
          error={error}
          setLogP={setLogP}
          setParams={setParams}
          setInitialPosition={setInitialPosition}
          step={step}
          sampleSteps={sampleSteps}
          reset={reset}
        />
      </div>
      <div className="App-main">
        <Visualizer />
      </div>
    </div>
  );
}

export default App;
