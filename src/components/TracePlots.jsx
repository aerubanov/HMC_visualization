import './TracePlots.css';
import Plot from 'react-plotly.js';
import PropTypes from 'prop-types';
import { TRACE_PLOT, HMC_SAMPLER } from '../utils/plotConfig.json';
import { createTracePlotTrace } from '../utils/plotFunctions';

/**
 * @param {Array<{chainId: *, ess: {x: number, y: number}}>|null|undefined} essPerChain
 *   When provided, each chain's ESS is sourced from this array instead of the aggregate `ess` prop.
 */
function TracePlots({ chains, burnIn, rHat, ess, essPerChain }) {
  const commonLayout = {
    ...TRACE_PLOT.layout,
    showlegend: true,
    legend: { orientation: 'h', y: -0.2 },
  };
  const xConfig = { displayModeBar: false, responsive: true };

  const xTraces = [];
  const yTraces = [];

  chains.forEach((chain, index) => {
    if (chain.samples && chain.samples.length > 0) {
      const color =
        index === 0
          ? HMC_SAMPLER.styles.primaryColor
          : HMC_SAMPLER.styles.secondaryColor;
      const label = `Chain ${index + 1} (${chain.samplerType})`;
      xTraces.push(
        ...createTracePlotTrace(chain.samples, 'x', burnIn, color, label)
      );
      yTraces.push(
        ...createTracePlotTrace(chain.samples, 'y', burnIn, color, label)
      );
    }
  });

  const formatRHat = (val) =>
    !isFinite(val) ? ' (R̂ = ∞)' : val ? ` (R̂ = ${val.toFixed(2)})` : '';
  const formatESS = (val) => (val ? ` (ESS = ${Math.round(val)})` : '');
  const formatRate = (chain) => {
    const acc = chain.acceptedCount ?? chain.samples.length;
    const total = acc + (chain.rejectedCount ?? 0);
    return total === 0 ? '0.0%' : `${((acc / total) * 100).toFixed(1)}%`;
  };

  return (
    <div className="trace-plots-container">
      <div className="trace-stats-header">
        {chains.map((chain, index) => (
          <div className="chain-stat" key={chain.id}>
            <span
              className="chain-label"
              style={{
                color:
                  index === 0
                    ? HMC_SAMPLER.styles.primaryColor
                    : HMC_SAMPLER.styles.secondaryColor,
                fontWeight: 'bold',
              }}
            >
              Chain {index + 1}:
            </span>
            <span className="stat-item">Acc: {chain.samples.length}</span>
            <span className="stat-item">Rej: {chain.rejectedCount}</span>
            <span className="stat-item">Rate: {formatRate(chain)}</span>
          </div>
        ))}
      </div>

      <div className="trace-plot-wrapper">
        <h4 className="trace-title">
          X Trace{' '}
          {rHat && <span className="stat-label">{formatRHat(rHat.x)}</span>}
          {!essPerChain && ess && (
            <span className="stat-label">{formatESS(ess.x)}</span>
          )}
          {essPerChain &&
            essPerChain.map((entry) => {
              const chainIndex = chains.findIndex(
                (c) => c.id === entry.chainId
              );
              const label =
                chainIndex >= 0
                  ? `Chain ${chainIndex + 1} (${chains[chainIndex].samplerType})`
                  : `Chain ${entry.chainId}`;
              return (
                <span key={entry.chainId} className="stat-label">
                  {label}: ESS={Math.round(entry.ess.x)}
                </span>
              );
            })}
        </h4>
        <Plot
          data={xTraces}
          layout={{ ...commonLayout, title: '' }}
          config={xConfig}
          style={{ width: '100%', height: '300px' }}
          useResizeHandler={true}
        />
      </div>
      <div className="trace-plot-wrapper">
        <h4 className="trace-title">
          Y Trace{' '}
          {rHat && <span className="stat-label">{formatRHat(rHat.y)}</span>}
          {!essPerChain && ess && (
            <span className="stat-label">{formatESS(ess.y)}</span>
          )}
          {essPerChain &&
            essPerChain.map((entry) => {
              const chainIndex = chains.findIndex(
                (c) => c.id === entry.chainId
              );
              const label =
                chainIndex >= 0
                  ? `Chain ${chainIndex + 1} (${chains[chainIndex].samplerType})`
                  : `Chain ${entry.chainId}`;
              return (
                <span key={entry.chainId} className="stat-label">
                  {label}: ESS={Math.round(entry.ess.y)}
                </span>
              );
            })}
        </h4>
        <Plot
          data={yTraces}
          layout={{ ...commonLayout, title: '' }}
          config={xConfig}
          style={{ width: '100%', height: '300px' }}
          useResizeHandler={true}
        />
      </div>
    </div>
  );
}

TracePlots.propTypes = {
  chains: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      samplerType: PropTypes.string,
      params: PropTypes.object,
      initialPosition: PropTypes.shape({
        x: PropTypes.number,
        y: PropTypes.number,
      }),
      seed: PropTypes.number,
      samples: PropTypes.array,
      trajectory: PropTypes.array,
      rejectedCount: PropTypes.number,
      acceptedCount: PropTypes.number,
      error: PropTypes.string,
    })
  ),
  burnIn: PropTypes.number,
  rHat: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
  ess: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
  /** Optional: when provided, per-chain ESS is shown instead of aggregate ESS */
  essPerChain: PropTypes.arrayOf(
    PropTypes.shape({
      chainId: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
        .isRequired,
      ess: PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
      }).isRequired,
    })
  ),
};

export default TracePlots;
