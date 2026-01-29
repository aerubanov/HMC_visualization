import './Controls.css';
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { PREDEFINED_FUNCTIONS } from '../utils/predefinedFunctions';

function Controls({
  logP,
  params,
  initialPosition,
  iterationCount,
  // acceptedCount,
  // rejectedCount,
  isRunning,
  error,
  seed,
  useSeededMode,
  useFastMode,
  setLogP,
  setParams,
  setInitialPosition,
  step,
  sampleSteps,
  reset,
  setSeed,
  useSecondChain,
  initialPosition2,
  // acceptedCount2,
  // rejectedCount2,
  seed2,
  setUseSecondChain,
  setInitialPosition2,
  setSeed2,
  burnIn,
  setBurnIn,
  axisLimits,
  setAxisLimits,
  setUseFastMode,
}) {
  const [nSteps, setNSteps] = useState(params.steps || 10);
  const [draftLogP, setDraftLogP] = useState(logP);
  const [localX, setLocalX] = useState(initialPosition.x);
  const [localY, setLocalY] = useState(initialPosition.y);
  const [localSeed, setLocalSeed] = useState(seed || 42);

  const [localAxisLimits, setLocalAxisLimits] = useState(
    axisLimits || { xMin: -5, xMax: 5, yMin: -5, yMax: 5 }
  );

  // Second chain local state
  const [localX2, setLocalX2] = useState(initialPosition2?.x ?? 1);
  const [localY2, setLocalY2] = useState(initialPosition2?.y ?? 1);
  const [localSeed2, setLocalSeed2] = useState(seed2 || 43);

  // Burn-in local state
  const [localBurnIn, setLocalBurnIn] = useState(burnIn);

  // Sync draft with prop when it changes externally (e.g., on reset)
  useEffect(() => {
    setDraftLogP(logP);
  }, [logP]);

  // Sync local position state with props
  useEffect(() => {
    setLocalX(initialPosition.x);
    setLocalY(initialPosition.y);
  }, [initialPosition]);

  // Sync second chain position state with props
  useEffect(() => {
    if (initialPosition2) {
      setLocalX2(initialPosition2.x);
      setLocalY2(initialPosition2.y);
    }
  }, [initialPosition2]);

  // Sync burn-in state with props
  useEffect(() => {
    setLocalBurnIn(burnIn);
  }, [burnIn]);

  // Sync axis limits with props
  useEffect(() => {
    if (axisLimits) {
      setLocalAxisLimits(axisLimits);
    }
  }, [axisLimits]);

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

  // Second chain handlers
  const handleSecondChainToggle = (e) => {
    setUseSecondChain(e.target.checked);
  };

  const handlePosition2Change = (axis, value) => {
    setInitialPosition2({
      ...initialPosition2,
      [axis]: parseFloat(value) || 0,
    });
  };

  const handleSeed2Change = (e) => {
    const value = parseInt(e.target.value, 10);
    setLocalSeed2(value);
    if (useSeededMode) {
      setSeed2(value);
    }
  };

  const handleGenerateRandomSeed2 = () => {
    const newSeed = Math.floor(Math.random() * 1000000);
    setLocalSeed2(newSeed);
    setSeed2(newSeed);
  };

  const handleBurnInChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setLocalBurnIn(value);
    if (!isNaN(value) && value >= 0) {
      setBurnIn(value);
    }
  };

  const handleAxisLimitChange = (key, value) => {
    setLocalAxisLimits((prev) => ({ ...prev, [key]: value }));
  };

  const handleAxisLimitBlur = (key) => {
    const val = parseFloat(localAxisLimits[key]);
    if (!isNaN(val)) {
      setAxisLimits({ [key]: val });
    } else {
      // Revert to valid prop value if invalid
      setLocalAxisLimits((prev) => ({ ...prev, [key]: axisLimits[key] }));
    }
  };

  // const acceptanceRate =
  //   iterationCount > 0
  //     ? ((acceptedCount / iterationCount) * 100).toFixed(1)
  //     : '0.0';

  // const acceptanceRate2 =
  //   useSecondChain && iterationCount > 0
  //     ? ((acceptedCount2 / iterationCount) * 100).toFixed(1)
  //     : '0.0';

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

            <div
              className="predefined-select-container"
              style={{ marginTop: '0.5rem' }}
            >
              <label
                htmlFor="predefined-select"
                className="control-sublabel"
                style={{
                  fontSize: '0.85rem',
                  color: '#666',
                  marginRight: '0.5rem',
                }}
              >
                Pre-defined:
              </label>
              <select
                id="predefined-select"
                className="control-select"
                onChange={(e) => {
                  if (e.target.value) {
                    setDraftLogP(e.target.value);
                  }
                }}
                defaultValue=""
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '0.9rem',
                  maxWidth: '200px',
                }}
              >
                <option value="" disabled>
                  Select a function...
                </option>
                {PREDEFINED_FUNCTIONS.map((func) => (
                  <option key={func.label} value={func.value}>
                    {func.label}
                  </option>
                ))}
              </select>
            </div>

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

          <div className="control-group">
            <label htmlFor="burnin-input" className="control-label">
              Burn-in Samples
            </label>
            <input
              id="burnin-input"
              type="number"
              className="control-input"
              step="1"
              min="0"
              value={localBurnIn}
              onChange={handleBurnInChange}
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

        {/* Second Chain Toggle and Configuration */}
        <section className="control-section">
          <div className="control-group">
            <div className="checkbox-group">
              <input
                id="second-chain-toggle"
                type="checkbox"
                checked={useSecondChain}
                onChange={handleSecondChainToggle}
              />
              <label htmlFor="second-chain-toggle" className="control-label">
                Enable Second Chain (Comparison)
              </label>
            </div>
          </div>
        </section>

        {/* Second Chain Initial Position */}
        {useSecondChain && (
          <section className="control-section">
            <h3 className="section-title">Second Chain Initial Position</h3>

            <div className="control-row">
              <div className="control-group">
                <label htmlFor="x2-input" className="control-label">
                  X
                </label>
                <input
                  id="x2-input"
                  type="text"
                  className="control-input"
                  value={localX2}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalX2(val);
                    if (val !== '' && val !== '-' && !isNaN(val)) {
                      handlePosition2Change('x', val);
                    }
                  }}
                  onBlur={() => {
                    if (localX2 === '' || localX2 === '-' || isNaN(localX2)) {
                      setLocalX2(initialPosition2.x);
                    }
                  }}
                />
              </div>

              <div className="control-group">
                <label htmlFor="y2-input" className="control-label">
                  Y
                </label>
                <input
                  id="y2-input"
                  type="text"
                  className="control-input"
                  value={localY2}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalY2(val);
                    if (val !== '' && val !== '-' && !isNaN(val)) {
                      handlePosition2Change('y', val);
                    }
                  }}
                  onBlur={() => {
                    if (localY2 === '' || localY2 === '-' || isNaN(localY2)) {
                      setLocalY2(initialPosition2.y);
                    }
                  }}
                />
              </div>
            </div>

            {/* Second chain seed controls (if seeded mode is enabled) */}
            {useSeededMode && (
              <>
                <div className="control-group">
                  <label htmlFor="seed2-input" className="control-label">
                    Seed Value (Chain 2)
                  </label>
                  <input
                    id="seed2-input"
                    type="number"
                    className="control-input"
                    step="1"
                    value={localSeed2}
                    onChange={handleSeed2Change}
                  />
                </div>

                <div className="control-group">
                  <button
                    className="btn btn-secondary"
                    onClick={handleGenerateRandomSeed2}
                    disabled={isRunning}
                  >
                    🎲 Generate Random Seed (Chain 2)
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* Plot Configuration */}
        <section className="control-section">
          <details style={{ width: '100%' }}>
            <summary
              className="section-title"
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              Plot Configuration
            </summary>
            <div style={{ marginTop: '1rem' }}>
              <h4
                style={{
                  marginBottom: '0.5rem',
                  fontSize: '0.9em',
                  color: '#666',
                }}
              >
                Axis Limits
              </h4>
              <div className="control-row">
                <div className="control-group">
                  <label htmlFor="xmin-input" className="control-label">
                    X Min
                  </label>
                  <input
                    id="xmin-input"
                    type="number"
                    className="control-input"
                    value={localAxisLimits.xMin}
                    onChange={(e) =>
                      handleAxisLimitChange('xMin', e.target.value)
                    }
                    onBlur={() => handleAxisLimitBlur('xMin')}
                  />
                </div>
                <div className="control-group">
                  <label htmlFor="xmax-input" className="control-label">
                    X Max
                  </label>
                  <input
                    id="xmax-input"
                    type="number"
                    className="control-input"
                    value={localAxisLimits.xMax}
                    onChange={(e) =>
                      handleAxisLimitChange('xMax', e.target.value)
                    }
                    onBlur={() => handleAxisLimitBlur('xMax')}
                  />
                </div>
              </div>
              <div className="control-row">
                <div className="control-group">
                  <label htmlFor="ymin-input" className="control-label">
                    Y Min
                  </label>
                  <input
                    id="ymin-input"
                    type="number"
                    className="control-input"
                    value={localAxisLimits.yMin}
                    onChange={(e) =>
                      handleAxisLimitChange('yMin', e.target.value)
                    }
                    onBlur={() => handleAxisLimitBlur('yMin')}
                  />
                </div>
                <div className="control-group">
                  <label htmlFor="ymax-input" className="control-label">
                    Y Max
                  </label>
                  <input
                    id="ymax-input"
                    type="number"
                    className="control-input"
                    value={localAxisLimits.yMax}
                    onChange={(e) =>
                      handleAxisLimitChange('yMax', e.target.value)
                    }
                    onBlur={() => handleAxisLimitBlur('yMax')}
                  />
                </div>
              </div>
            </div>
          </details>
        </section>

        {/* Control Buttons */}
        <section className="control-section">
          <h3 className="section-title">Actions</h3>

          <button
            className="btn btn-primary"
            onClick={step}
            disabled={isRunning || !logP || useFastMode}
          >
            Step Once
          </button>

          <div className="control-group" style={{ marginBottom: '0.5rem' }}>
            <div className="checkbox-group">
              <input
                id="fast-mode-toggle-action"
                type="checkbox"
                checked={useFastMode || false}
                onChange={(e) =>
                  setUseFastMode && setUseFastMode(e.target.checked)
                }
              />
              <label
                htmlFor="fast-mode-toggle-action"
                className="control-label"
                style={{
                  fontWeight: 'bold',
                  color: useFastMode ? 'var(--color-primary)' : 'inherit',
                }}
              >
                🚀 Fast Sampling Mode
              </label>
            </div>
          </div>

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
          {!useSecondChain ? (
            // Single chain display
            <>
              <div className="status-grid">
                <div className="status-item">
                  <span className="status-label">Iterations</span>
                  <span className="status-value">{iterationCount}</span>
                </div>
              </div>
            </>
          ) : (
            // Dual chain display with separate stats
            <>
              <h3 className="section-title">Chain Statistics</h3>
              <div className="status-grid">
                <div className="status-item">
                  <span className="status-label">Iterations</span>
                  <span className="status-value">{iterationCount}</span>
                </div>
              </div>
            </>
          )}

          {isRunning && (
            <div className="status-running">
              <span className="status-indicator running"></span>
              <span className="status-text">
                {useFastMode
                  ? 'Generating samples in fast mode...'
                  : 'Running...'}
              </span>
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
  // acceptedCount: PropTypes.number,
  // rejectedCount: PropTypes.number,
  isRunning: PropTypes.bool.isRequired,
  error: PropTypes.string,
  seed: PropTypes.number,
  useSeededMode: PropTypes.bool.isRequired,
  useFastMode: PropTypes.bool,
  setUseFastMode: PropTypes.func,
  setLogP: PropTypes.func.isRequired,
  setParams: PropTypes.func.isRequired,
  setInitialPosition: PropTypes.func.isRequired,
  step: PropTypes.func.isRequired,
  sampleSteps: PropTypes.func.isRequired,
  reset: PropTypes.func.isRequired,
  setSeed: PropTypes.func.isRequired,
  // Second chain props
  useSecondChain: PropTypes.bool.isRequired,
  initialPosition2: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }),
  // acceptedCount2: PropTypes.number,
  // rejectedCount2: PropTypes.number,
  seed2: PropTypes.number,
  setUseSecondChain: PropTypes.func.isRequired,
  setInitialPosition2: PropTypes.func.isRequired,
  setSeed2: PropTypes.func.isRequired,
  burnIn: PropTypes.number.isRequired,
  setBurnIn: PropTypes.func.isRequired,
  axisLimits: PropTypes.shape({
    xMin: PropTypes.number,
    xMax: PropTypes.number,
    yMin: PropTypes.number,
    yMax: PropTypes.number,
  }),
  setAxisLimits: PropTypes.func,
};

export default Controls;
