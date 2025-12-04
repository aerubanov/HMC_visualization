import './Visualizer.css';
import Plot from 'react-plotly.js';
import PropTypes from 'prop-types';
import { BASE_LAYOUT, PLOT_CONFIG } from '../utils/plotConfig';

function Visualizer({ contourData }) {
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

  // Render the Plotly contour plot
  console.log(
    'Visualizer rendering with contourData:',
    contourData ? 'present' : 'null'
  );

  return (
    <div className="visualizer">
      <Plot
        data={[contourData]}
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
};

export default Visualizer;
