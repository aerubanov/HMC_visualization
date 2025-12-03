import './Controls.css';
import PropTypes from 'prop-types';
import { useState } from 'react';

function Controls({
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
}) {
  const [nSteps, setNSteps] = useState(params.steps || 10);

  const handleLogPChange = (e) => {
    setLogP(e.target.value);
  };

  const handleParamChange = (key, value) => {
    setParams({ [key]: parseFloat(value) });
  };

  const handlePositionChange = (axis, value) => {
    setInitialPosition({ ...initialPosition, [axis]: parseFloat(value) || 0 });
  };

  const handleSampleSteps = () => {
    sampleSteps(nSteps);
  };

  return (
    <div className="controls">
      <div className="controls-header">
        <h1 className="controls-title">HMC Sampler</h1>
        <p className="controls-subtitle">
          Hamiltonian Monte Carlo Visualization
        </p>
      </div>

      <div className="controls-content">
        {/* Log Probability Function */}
        <section className="control-section">
          <label htmlFor="logp-input" className="control-label">
            Log Probability Function
          </label>
          <textarea
            id="logp-input"
            className="control-textarea"
            placeholder="e.g., -(x^2 + y^2)/2"
            value={logP}
            onChange={handleLogPChange}
            rows={3}
          />
          <p className="control-hint">
            Enter a mathematical expression in terms of x and y
          </p>
        </section>

        {/* Sampler Parameters */}
        <section className="control-section">
          <h3 className="section-title">Sampler Parameters</h3>

          <div className="control-group">
            <label htmlFor="epsilon-input" className="control-label">
              Epsilon (ε) - Step Size
            </label>
            <input
              id="epsilon-input"
              type="number"
              className="control-input"
              step="0.001"
              min="0.001"
              value={params.epsilon}
              onChange={(e) => handleParamChange('epsilon', e.target.value)}
            />
          </div>

          <div className="control-group">
            <label htmlFor="l-input" className="control-label">
              L - Leapfrog Steps
            </label>
            <input
              id="l-input"
              type="number"
              className="control-input"
              step="1"
              min="1"
              value={params.L}
              onChange={(e) => handleParamChange('L', e.target.value)}
            />
          </div>
        </section>

        {/* Initial Position */}
        <section className="control-section">
          <h3 className="section-title">Initial Position</h3>

          <div className="control-row">
            <div className="control-group">
              <label htmlFor="x-input" className="control-label">
                X
              </label>
              <input
                id="x-input"
                type="number"
                className="control-input"
                step="0.1"
                value={initialPosition.x}
                onChange={(e) => handlePositionChange('x', e.target.value)}
              />
            </div>

            <div className="control-group">
              <label htmlFor="y-input" className="control-label">
                Y
              </label>
              <input
                id="y-input"
                type="number"
                className="control-input"
                step="0.1"
                value={initialPosition.y}
                onChange={(e) => handlePositionChange('y', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Control Buttons */}
        <section className="control-section">
          <h3 className="section-title">Actions</h3>

          <button
            className="btn btn-primary"
            onClick={step}
            disabled={isRunning || !logP}
          >
            Step Once
          </button>

          <div className="sample-steps-group">
            <input
              type="number"
              className="control-input control-input-inline"
              step="1"
              min="1"
              value={nSteps}
              onChange={(e) => setNSteps(parseInt(e.target.value) || 1)}
            />
            <button
              className="btn btn-accent"
              onClick={handleSampleSteps}
              disabled={isRunning || !logP}
            >
              Sample N Steps
            </button>
          </div>

          <button
            className="btn btn-secondary"
            onClick={reset}
            disabled={isRunning}
          >
            Reset
          </button>
        </section>

        {/* Status Display */}
        <section className="control-section status-section">
          <div className="status-item">
            <span className="status-label">Iterations:</span>
            <span className="status-value">{iterationCount}</span>
          </div>

          {isRunning && (
            <div className="status-item">
              <span className="status-indicator running"></span>
              <span className="status-text">Running...</span>
            </div>
          )}
        </section>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

Controls.propTypes = {
  logP: PropTypes.string.isRequired,
  params: PropTypes.shape({
    epsilon: PropTypes.number.isRequired,
    L: PropTypes.number.isRequired,
    steps: PropTypes.number,
  }).isRequired,
  initialPosition: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
  iterationCount: PropTypes.number.isRequired,
  isRunning: PropTypes.bool.isRequired,
  error: PropTypes.string,
  setLogP: PropTypes.func.isRequired,
  setParams: PropTypes.func.isRequired,
  setInitialPosition: PropTypes.func.isRequired,
  step: PropTypes.func.isRequired,
  sampleSteps: PropTypes.func.isRequired,
  reset: PropTypes.func.isRequired,
};

export default Controls;
