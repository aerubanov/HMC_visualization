import './Visualizer.css';
import Plot from 'react-plotly.js';
import PropTypes from 'prop-types';
import { GENERAL, HMC_SAMPLER } from '../utils/plotConfig.json';
import {
  createTrajectoryTrace,
  createSamplesTrace,
} from '../utils/plotFunctions';

function Visualizer({
  contourData,
  trajectory,
  acceptedSamples,
  trajectory2,
  acceptedSamples2,
  useSecondChain,
  axisLimits,
}) {
  // Show placeholder if no contour data is available
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
            <div className="placeholder-features">
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span className="feature-text">Contour Plot</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔴</span>
                <span className="feature-text">Sample Points</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📈</span>
                <span className="feature-text">Trajectory Lines</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Build traces array for multi-trace rendering
  const traces = [];

  // Add contour trace (always first for z-ordering)
  if (contourData) {
    traces.push(contourData);
  }

  // Add samples trace if it exists
  if (acceptedSamples && acceptedSamples.length > 0) {
    const samplesTrace = createSamplesTrace(acceptedSamples);
    if (samplesTrace) {
      traces.push(samplesTrace);
    }
  }

  // Add second chain samples trace if enabled and exists
  if (useSecondChain && acceptedSamples2 && acceptedSamples2.length > 0) {
    const samplesTrace2 = createSamplesTrace(
      acceptedSamples2,
      HMC_SAMPLER.styles.secondaryColor,
      'Samples (Chain 2)'
    );
    if (samplesTrace2) {
      traces.push(samplesTrace2);
    }
  }

  // Add trajectory trace if it exists
  if (trajectory && trajectory.length > 0) {
    const trajectoryTrace = createTrajectoryTrace(trajectory);
    if (trajectoryTrace) {
      traces.push(trajectoryTrace);
    }
  }

  // Add second chain trajectory trace if enabled and exists
  if (useSecondChain && trajectory2 && trajectory2.length > 0) {
    const trajectoryTrace2 = createTrajectoryTrace(
      trajectory2,
      HMC_SAMPLER.styles.secondaryColor,
      'Trajectory (Chain 2)'
    );
    if (trajectoryTrace2) {
      traces.push(trajectoryTrace2);
    }
  }

  // Render the Plotly plot with multiple traces
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
      />
    </div>
  );
}

Visualizer.propTypes = {
  contourData: PropTypes.shape({
    type: PropTypes.string,
    x: PropTypes.array,
    y: PropTypes.array,
    z: PropTypes.array,
  }),
  trajectory: PropTypes.arrayOf(
    PropTypes.shape({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
    })
  ),
  acceptedSamples: PropTypes.arrayOf(
    PropTypes.shape({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
    })
  ),
  trajectory2: PropTypes.arrayOf(
    PropTypes.shape({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
    })
  ),
  acceptedSamples2: PropTypes.arrayOf(
    PropTypes.shape({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
    })
  ),
  useSecondChain: PropTypes.bool,
  axisLimits: PropTypes.shape({
    xMin: PropTypes.number,
    xMax: PropTypes.number,
    yMin: PropTypes.number,
    yMax: PropTypes.number,
  }),
};

export default Visualizer;
