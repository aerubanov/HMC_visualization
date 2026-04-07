import './Visualizer.css';
import { useRef } from 'react';
import Plot from 'react-plotly.js';
import PropTypes from 'prop-types';
import { GENERAL, HMC_SAMPLER } from '../utils/plotConfig.json';
import {
  createTrajectoryTrace,
  createSamplesTrace,
} from '../utils/plotFunctions';

function Visualizer({
  contourData,
  chains,
  axisLimits,
  isRecording = false,
  captureFrame = () => {},
}) {
  const graphDivRef = useRef(null);
  if (!contourData) {
    return (
      <div className="visualizer">
        <div className="visualizer-placeholder">
          <div className="placeholder-content">
            <svg
              className="placeholder-icon"
              width="120"
              height="120"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M3 3v18h18"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7 16c1.5-4 3-6 5-6s3.5 2 5 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="10" r="2" />
            </svg>
            <h2 className="placeholder-title">
              Enter a Log Probability Function
            </h2>
            <p className="placeholder-description">
              The contour plot will appear here once you define a valid function
            </p>
          </div>
        </div>
      </div>
    );
  }

  const traces = [contourData];

  chains.forEach((chain, index) => {
    const isPrimary = index === 0;
    const color = isPrimary
      ? HMC_SAMPLER.styles.primaryColor
      : HMC_SAMPLER.styles.secondaryColor;
    const label = `Chain ${index + 1} (${chain.samplerType})`;

    if (chain.samples && chain.samples.length > 0) {
      traces.push(
        createSamplesTrace(chain.samples, color, `Samples (${label})`)
      );
    }

    if (chain.trajectory && chain.trajectory.length > 0) {
      traces.push(
        createTrajectoryTrace(chain.trajectory, color, `Trajectory (${label})`)
      );
    }
  });

  return (
    <div className="visualizer">
      <Plot
        data={traces}
        layout={{
          ...GENERAL.layout,
          title: {
            text: 'Log Probability Density',
            font: { size: 16, color: GENERAL.layout.font.color },
          },
          xaxis: {
            ...GENERAL.layout.xaxis,
            range: axisLimits
              ? [axisLimits.xMin, axisLimits.xMax]
              : GENERAL.layout.xaxis.range,
          },
          yaxis: {
            ...GENERAL.layout.yaxis,
            range: axisLimits
              ? [axisLimits.yMin, axisLimits.yMax]
              : GENERAL.layout.yaxis.range,
          },
        }}
        config={GENERAL.config}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
        onInitialized={(_, graphDiv) => {
          graphDivRef.current = graphDiv;
        }}
        onUpdate={() => {
          if (isRecording) captureFrame(graphDivRef.current);
        }}
      />
    </div>
  );
}

Visualizer.propTypes = {
  contourData: PropTypes.object,
  chains: PropTypes.array,
  axisLimits: PropTypes.object,
  isRecording: PropTypes.bool,
  captureFrame: PropTypes.func,
};

export default Visualizer;
