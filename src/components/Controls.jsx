import './Controls.css';
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

function Controls({
  logP,
  params,
  initialPosition,
  iterationCount,
  acceptedCount,
  rejectedCount,
  isRunning,
  error,
  seed,
  useSeededMode,
  setLogP,
  setParams,
  setInitialPosition,
  step,
  sampleSteps,
  reset,
  setSeed,
}) {
  const [nSteps, setNSteps] = useState(params.steps || 10);
  const [draftLogP, setDraftLogP] = useState(logP);
  const [localX, setLocalX] = useState(initialPosition.x);
  const [localY, setLocalY] = useState(initialPosition.y);
  const [localSeed, setLocalSeed] = useState(seed || 42);

  // Sync draft with prop when it changes externally (e.g., on reset)
  useEffect(() => {
    setDraftLogP(logP);
  }, [logP]);

  // Sync local position state with props
  useEffect(() => {
    setLocalX(initialPosition.x);
    setLocalY(initialPosition.y);
  }, [initialPosition]);

  const handleLogPChange = (e) => {
    setDraftLogP(e.target.value);
  };

  const handleApplyLogP = () => {
    setLogP(draftLogP);
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = draftLogP !== logP;

  const handleParamChange = (key, value) => {
    setParams({ [key]: parseFloat(value) });
  };

  const handlePositionChange = (axis, value) => {
    setInitialPosition({ ...initialPosition, [axis]: parseFloat(value) || 0 });
  };

  const handleSampleSteps = () => {
    sampleSteps(nSteps);
  };

  const handleSeedToggle = (e) => {
    const enabled = e.target.checked;

    if (enabled) {
      // If enabling, set the seed (if not already set, use localSeed)
      if (seed === null) {
        setSeed(localSeed);
      }
      // If seed is already set, no need to do anything, seeded mode is implied by seed != null
    } else {
      // If disabling, set seed to null
      setSeed(null);
    }
  };

  const handleSeedChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setLocalSeed(value);
    if (useSeededMode) {
      setSeed(value);
    }
  };

  const handleGenerateRandomSeed = () => {
    const newSeed = Math.floor(Math.random() * 1000000);
    setLocalSeed(newSeed);
    setSeed(newSeed);
  };

  const acceptanceRate =
    iterationCount > 0
      ? ((acceptedCount / iterationCount) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="controls">
      <div className="controls-header">
        <h1 className="controls-title">HMC Sampler</h1>
        <p className="controls-subtitle">
          Hamiltonian Monte Carlo Visualization
        </p>
      </div>

      <div className="controls-content">
        {/* Probability Function */}
        <section className="control-section">
          <label htmlFor="logp-input" className="control-label">
            Probability Function (unnormalized)
          </label>
          <div className="textarea-with-button">
            <textarea
              id="logp-input"
              className="control-textarea"
              placeholder="e.g., exp(-(x^2 + y^2)/2)"
              value={draftLogP}
              onChange={handleLogPChange}
              rows={3}
            />
            <button
              className="btn btn-apply"
              onClick={handleApplyLogP}
              disabled={!hasUnsavedChanges || !draftLogP.trim()}
              title="Apply the expression"
            >
              {hasUnsavedChanges ? '✓ Apply' : 'Applied'}
            </button>
          </div>
          <p className="control-hint">
            Enter an unnormalized probability expression in terms of x and y.
            Click &apos;Apply&apos; to update the visualization.
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

          {/* Random Seed */}
          <div className="control-group">
            <div className="checkbox-group">
              <input
                id="seed-toggle"
                type="checkbox"
                checked={useSeededMode}
                onChange={handleSeedToggle}
              />
              <label htmlFor="seed-toggle" className="control-label">
                Use Random Seed (Reproducible)
              </label>
            </div>
          </div>

          {useSeededMode && (
            <>
              <div className="control-group">
                <label htmlFor="seed-input" className="control-label">
                  Seed Value
                </label>
                <input
                  id="seed-input"
                  type="number"
                  className="control-input"
                  step="1"
                  value={localSeed}
                  onChange={handleSeedChange}
                />
              </div>

              <div className="control-group">
                <button
                  className="btn btn-secondary"
                  onClick={handleGenerateRandomSeed}
                  disabled={isRunning}
                >
                  🎲 Generate Random Seed
                </button>
              </div>
            </>
          )}
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
                type="text"
                className="control-input"
                value={localX}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalX(val);
                  if (val !== '' && val !== '-' && !isNaN(val)) {
                    handlePositionChange('x', val);
                  }
                }}
                onBlur={() => {
                  if (localX === '' || localX === '-' || isNaN(localX)) {
                    setLocalX(initialPosition.x);
                  }
                }}
              />
            </div>

            <div className="control-group">
              <label htmlFor="y-input" className="control-label">
                Y
              </label>
              <input
                id="y-input"
                type="text"
                className="control-input"
                value={localY}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalY(val);
                  if (val !== '' && val !== '-' && !isNaN(val)) {
                    handlePositionChange('y', val);
                  }
                }}
                onBlur={() => {
                  if (localY === '' || localY === '-' || isNaN(localY)) {
                    setLocalY(initialPosition.y);
                  }
                }}
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
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Iterations</span>
              <span className="status-value">{iterationCount}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Accepted</span>
              <span className="status-value text-success">{acceptedCount}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Rejected</span>
              <span className="status-value text-error">{rejectedCount}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Rate</span>
              <span className="status-value">{acceptanceRate}%</span>
            </div>
          </div>

          {isRunning && (
            <div className="status-running">
              <span className="status-indicator running"></span>
              <span className="status-text">Running...</span>
            </div>
          )}
        </section>

        {/* Resources */}
        <section className="control-section">
          <h3 className="section-title">References</h3>
          <ul className="resources-list">
            <li>
              <a
                href="https://arxiv.org/abs/1701.02434"
                target="_blank"
                rel="noopener noreferrer"
                className="resource-link"
              >
                A Conceptual Introduction to HMC (Betancourt, 2017)
              </a>
            </li>
            <li>
              <a
                href="https://arxiv.org/abs/1111.4246"
                target="_blank"
                rel="noopener noreferrer"
                className="resource-link"
              >
                MCMC using Hamiltonian dynamics (Neal, 2011)
              </a>
            </li>
            <li>
              <a
                href="https://arxiv.org/abs/1206.1901"
                target="_blank"
                rel="noopener noreferrer"
                className="resource-link"
              >
                NUTS: The No-U-Turn Sampler (Hoffman & Gelman, 2014)
              </a>
            </li>
          </ul>
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
  acceptedCount: PropTypes.number,
  rejectedCount: PropTypes.number,
  isRunning: PropTypes.bool.isRequired,
  error: PropTypes.string,
  seed: PropTypes.number,
  useSeededMode: PropTypes.bool.isRequired,
  setLogP: PropTypes.func.isRequired,
  setParams: PropTypes.func.isRequired,
  setInitialPosition: PropTypes.func.isRequired,
  step: PropTypes.func.isRequired,
  sampleSteps: PropTypes.func.isRequired,
  reset: PropTypes.func.isRequired,
  setSeed: PropTypes.func.isRequired,
};

export default Controls;
