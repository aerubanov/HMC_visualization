import './Visualizer.css';

function Visualizer() {
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
            <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M7 16c1.5-4 3-6 5-6s3.5 2 5 6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="10" r="2" />
          </svg>
          <h2 className="placeholder-title">Visualization Coming Soon</h2>
          <p className="placeholder-description">
            The interactive HMC sampling visualization will appear here
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

export default Visualizer;
