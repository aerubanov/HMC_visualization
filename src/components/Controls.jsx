import './Controls.css';
import { useState } from 'react';
import { PREDEFINED_FUNCTIONS } from '../utils/predefinedFunctions';

function Controls({
  logP,
  chains,
  isRunning,
  error,
  setLogP,
  setChainConfig,
  addChain,
  removeChain,
  step,
  sampleSteps,
  reset,
  burnIn,
  setBurnIn,
  axisLimits,
  setAxisLimits,
  useFastMode,
  setUseFastMode,
}) {
  const [nSteps, setNSteps] = useState(10);
  const [draftLogP, setDraftLogP] = useState(logP);
  const [localPositions, setLocalPositions] = useState({});
  const [localSeeds, setLocalSeeds] = useState({});
  const [localBurnIn, setLocalBurnIn] = useState(burnIn);
  const [localAxisLimits, setLocalAxisLimits] = useState(
    axisLimits || { xMin: -5, xMax: 5, yMin: -5, yMax: 5 }
  );
  const [useSeededMode, setUseSeededMode] = useState(false);

  const [prevLogP, setPrevLogP] = useState(logP);
  const [prevBurnIn, setPrevBurnIn] = useState(burnIn);
  const [prevAxisLimits, setPrevAxisLimits] = useState(axisLimits);
  const [prevChains, setPrevChains] = useState(chains);

  if (logP !== prevLogP) {
    setDraftLogP(logP);
    setPrevLogP(logP);
  }
  if (burnIn !== prevBurnIn) {
    setLocalBurnIn(burnIn);
    setPrevBurnIn(burnIn);
  }
  if (axisLimits !== prevAxisLimits) {
    setLocalAxisLimits(axisLimits);
    setPrevAxisLimits(axisLimits);
  }
  if (chains !== prevChains) {
    const lPos = {};
    const lSeed = {};
    let anySeeded = false;
    chains.forEach((c) => {
      lPos[c.id] = c.initialPosition;
      lSeed[c.id] = c.seed !== null ? c.seed : 42 + c.id;
      if (c.seed !== null) anySeeded = true;
    });
    setLocalPositions(lPos);
    setLocalSeeds(lSeed);
    setUseSeededMode(anySeeded);
    setPrevChains(chains);
  }

  const handleApplyLogP = () => setLogP(draftLogP);
  const hasUnsavedChanges = draftLogP !== logP;

  const handleAxisLimitChange = (key, value) =>
    setLocalAxisLimits((prev) => ({ ...prev, [key]: value }));
  const handleAxisLimitBlur = (key) => {
    const val = parseFloat(localAxisLimits[key]);
    if (!isNaN(val)) setAxisLimits({ [key]: val });
    else setLocalAxisLimits((prev) => ({ ...prev, [key]: axisLimits[key] }));
  };

  const handlePosChange = (id, axis, value) => {
    const val = parseFloat(value);
    if (!isNaN(val)) {
      const current = chains.find((c) => c.id === id).initialPosition;
      setChainConfig(id, { initialPosition: { ...current, [axis]: val } });
    }
  };

  return (
    <div className="controls">
      <div className="controls-header">
        <h1 className="controls-title">HMC Sampler</h1>
        <p className="controls-subtitle">Comparison Mode</p>
      </div>

      <div className="controls-content">
        {/* LogP Section */}
        <section className="control-section">
          <label htmlFor="logp-input" className="control-label">
            Probability Function
          </label>
          <div className="textarea-with-button">
            <textarea
              id="logp-input"
              className="control-input"
              style={{ width: '100%', marginBottom: '10px' }}
              placeholder="e.g., exp(-(x^2 + y^2)/2)"
              value={draftLogP}
              onChange={(e) => setDraftLogP(e.target.value)}
              rows={3}
            />
            <label htmlFor="predefined-select" className="control-sublabel">
              Pre-defined:
            </label>
            <select
              id="predefined-select"
              className="control-select"
              style={{ width: '100%', marginBottom: '10px', padding: '6px' }}
              onChange={(e) => e.target.value && setDraftLogP(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>
                Select pre-defined...
              </option>
              {PREDEFINED_FUNCTIONS.map((f) => (
                <option key={f.label} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <button
              className="btn btn-apply"
              onClick={handleApplyLogP}
              disabled={!hasUnsavedChanges || !draftLogP.trim()}
            >
              {hasUnsavedChanges ? '✓ Apply' : 'Applied'}
            </button>
            {error && (
              <div
                className="error-message"
                style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}
              >
                {error}
              </div>
            )}
          </div>
        </section>

        {/* Global Settings */}
        <section className="control-section">
          <h3 className="section-title">Global Settings</h3>
          <div className="control-group">
            <label htmlFor="burn-in-input" className="control-label">
              Burn-in Samples
            </label>
            <input
              id="burn-in-input"
              type="number"
              className="control-input"
              min="0"
              step="1"
              value={localBurnIn}
              onChange={(e) => {
                const b = parseInt(e.target.value);
                setLocalBurnIn(b);
                if (!isNaN(b) && b >= 0) setBurnIn(b);
              }}
            />
          </div>
          <div className="control-group">
            <div
              className="checkbox-group"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <input
                id="fast-mode-toggle"
                type="checkbox"
                checked={useFastMode}
                onChange={(e) => setUseFastMode(e.target.checked)}
              />
              <label htmlFor="fast-mode-toggle">Fast Sampling Mode</label>
            </div>
          </div>
          <div className="control-group">
            <div
              className="checkbox-group"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <input
                type="checkbox"
                id="second-chain-toggle"
                checked={chains.length > 1}
                onChange={(e) => {
                  if (e.target.checked) addChain({ id: 1 });
                  else if (chains.length > 1) removeChain(chains[1].id);
                }}
              />
              <label htmlFor="second-chain-toggle">Enable Second Chain</label>
            </div>
          </div>
          <div className="control-group">
            <div
              className="checkbox-group"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <input
                type="checkbox"
                checked={useSeededMode}
                onChange={(e) => {
                  const en = e.target.checked;
                  chains.forEach((c) =>
                    setChainConfig(c.id, {
                      seed: en ? localSeeds[c.id] || 42 : null,
                    })
                  );
                }}
              />
              <label>Use Random Seed</label>
            </div>
          </div>
        </section>

        {/* Chain Render loops */}
        {chains.map((chain, index) => (
          <section
            key={chain.id}
            className="control-section"
            style={{
              borderLeft: `4px solid ${index === 0 ? '#2c3e50' : '#e74c3c'}`,
              paddingLeft: '8px',
            }}
          >
            <h3 className="section-title">Chain {index + 1} Configuration</h3>

            <div className="control-group">
              <label
                htmlFor={`sampler-type-${chain.id}`}
                className="control-label"
              >
                Sampler Type
              </label>
              <select
                id={`sampler-type-${chain.id}`}
                className="control-select"
                style={{ width: '100%', padding: '6px' }}
                value={chain.samplerType}
                onChange={(e) =>
                  setChainConfig(chain.id, { samplerType: e.target.value })
                }
              >
                <option value="HMC">Hamiltonian Monte Carlo (HMC)</option>
                <option value="GIBBS">Gibbs Sampling</option>
              </select>
            </div>

            {chain.samplerType === 'HMC' && (
              <>
                <div className="control-group">
                  <label
                    htmlFor={`epsilon-${chain.id}`}
                    className="control-label"
                  >
                    Epsilon (ε)
                  </label>
                  <input
                    id={`epsilon-${chain.id}`}
                    type="number"
                    className="control-input"
                    step="0.001"
                    value={chain.params.epsilon}
                    onChange={(e) =>
                      setChainConfig(chain.id, {
                        params: {
                          ...chain.params,
                          epsilon: parseFloat(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="control-group">
                  <label
                    htmlFor={`leapfrog-steps-${chain.id}`}
                    className="control-label"
                  >
                    L (Leapfrog Steps)
                  </label>
                  <input
                    id={`leapfrog-steps-${chain.id}`}
                    type="number"
                    className="control-input"
                    step="1"
                    value={chain.params.L}
                    onChange={(e) =>
                      setChainConfig(chain.id, {
                        params: {
                          ...chain.params,
                          L: parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </>
            )}
            {chain.samplerType === 'GIBBS' && (
              <div className="control-group">
                <label
                  htmlFor={`slice-width-${chain.id}`}
                  className="control-label"
                >
                  Slice Width (w)
                </label>
                <input
                  id={`slice-width-${chain.id}`}
                  type="number"
                  className="control-input"
                  step="0.1"
                  value={chain.params.w}
                  onChange={(e) =>
                    setChainConfig(chain.id, {
                      params: {
                        ...chain.params,
                        w: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>
            )}

            <div
              className="control-row"
              style={{ display: 'flex', gap: '8px' }}
            >
              <div className="control-group" style={{ flex: 1 }}>
                <label
                  htmlFor={`initial-x-${chain.id}`}
                  className="control-label"
                >
                  X
                </label>
                <input
                  id={`initial-x-${chain.id}`}
                  type="text"
                  className="control-input"
                  value={localPositions[chain.id]?.x ?? ''}
                  onChange={(e) => {
                    setLocalPositions((p) => ({
                      ...p,
                      [chain.id]: { ...p[chain.id], x: e.target.value },
                    }));
                    handlePosChange(chain.id, 'x', e.target.value);
                  }}
                />
              </div>
              <div className="control-group" style={{ flex: 1 }}>
                <label
                  htmlFor={`initial-y-${chain.id}`}
                  className="control-label"
                >
                  Y
                </label>
                <input
                  id={`initial-y-${chain.id}`}
                  type="text"
                  className="control-input"
                  value={localPositions[chain.id]?.y ?? ''}
                  onChange={(e) => {
                    setLocalPositions((p) => ({
                      ...p,
                      [chain.id]: { ...p[chain.id], y: e.target.value },
                    }));
                    handlePosChange(chain.id, 'y', e.target.value);
                  }}
                />
              </div>
            </div>

            {useSeededMode && (
              <div className="control-group">
                <label className="control-label">Seed Configuration</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    className="control-input"
                    style={{ flex: 1 }}
                    value={localSeeds[chain.id] || ''}
                    onChange={(e) => {
                      const s = parseInt(e.target.value);
                      setLocalSeeds((prev) => ({ ...prev, [chain.id]: s }));
                      setChainConfig(chain.id, { seed: s });
                    }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      const s = Math.floor(Math.random() * 1000000);
                      setLocalSeeds((prev) => ({ ...prev, [chain.id]: s }));
                      setChainConfig(chain.id, { seed: s });
                    }}
                  >
                    ��
                  </button>
                </div>
              </div>
            )}
          </section>
        ))}

        <section className="control-section">
          <details>
            <summary className="section-title">Plot Layout Limits</summary>
            <div
              style={{
                marginTop: '1rem',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              {['xMin', 'xMax', 'yMin', 'yMax'].map((k) => (
                <div key={k} className="control-group" style={{ width: '45%' }}>
                  <label className="control-label">{k}</label>
                  <input
                    type="number"
                    className="control-input"
                    value={localAxisLimits[k]}
                    onChange={(e) => handleAxisLimitChange(k, e.target.value)}
                    onBlur={() => handleAxisLimitBlur(k)}
                  />
                </div>
              ))}
            </div>
          </details>
        </section>

        {/* Action Buttons */}
        <section className="control-section">
          <h3 className="section-title">Actions</h3>
          <button
            className="btn btn-primary"
            onClick={step}
            disabled={isRunning || !logP || useFastMode}
            style={{ width: '100%', marginBottom: '8px' }}
          >
            Step Once
          </button>
          <div
            className="sample-steps-group"
            style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}
          >
            <input
              type="number"
              className="control-input control-input-inline"
              style={{ flex: 1 }}
              min="1"
              value={nSteps}
              onChange={(e) => setNSteps(parseInt(e.target.value) || 1)}
            />
            <button
              className="btn btn-accent"
              style={{ flex: 2 }}
              onClick={() => sampleSteps(nSteps)}
              disabled={isRunning || !logP}
            >
              Sample N Steps
            </button>
          </div>
          <button
            className="btn btn-secondary"
            onClick={reset}
            disabled={isRunning}
            style={{ width: '100%' }}
          >
            Reset Sampler
          </button>

          {isRunning && useFastMode && (
            <div
              className="running-indicator"
              style={{
                marginTop: '10px',
                textAlign: 'center',
                color: '#e67e22',
                fontWeight: 'bold',
              }}
            >
              Generating samples...
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Controls;
