import './Visualizer.css';
import Plot from 'react-plotly.js';
import PropTypes from 'prop-types';
import {
  BASE_LAYOUT,
  PLOT_CONFIG,
  createTrajectoryTrace,
  createSamplesTrace,
} from '../utils/plotConfig';

function Visualizer({ contourData, trajectory, acceptedSamples }) {
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

  // Add trajectory trace if it exists
  if (trajectory && trajectory.length > 0) {
    const trajectoryTrace = createTrajectoryTrace(trajectory);
    if (trajectoryTrace) {
      traces.push(trajectoryTrace);
    }
  }

  // Render the Plotly plot with multiple traces
  console.log(
    'Visualizer rendering with traces:',
    traces.length,
    'contour:',
    !!contourData,
    'contour:',
    !!contourData,
    'trajectory:',
    trajectory?.length || 0,
    'samples:',
    acceptedSamples?.length || 0
  );

  return (
    <div className="visualizer">
      <Plot
        data={traces}
        layout={{
          ...BASE_LAYOUT,
          title: {
            text: 'Log Probability Density',
            font: { size: 16, color: BASE_LAYOUT.font.color },
          },
        }}
        config={PLOT_CONFIG}
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
};

export default Visualizer;
