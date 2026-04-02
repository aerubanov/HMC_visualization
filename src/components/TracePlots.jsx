import './TracePlots.css';
import Plot from 'react-plotly.js';
import PropTypes from 'prop-types';
import { TRACE_PLOT, HMC_SAMPLER } from '../utils/plotConfig.json';
import { createTracePlotTrace } from '../utils/plotFunctions';

function TracePlots({ chains, burnIn, rHat, ess }) {
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
      const color = index === 0 ? HMC_SAMPLER.styles.primaryColor : HMC_SAMPLER.styles.secondaryColor;
      const label = `Chain ${index + 1}`;
      xTraces.push(...createTracePlotTrace(chain.samples, 'x', burnIn, color, label));
      yTraces.push(...createTracePlotTrace(chain.samples, 'y', burnIn, color, label));
    }
  });

  const formatRHat = (val) => (!isFinite(val) ? ' (R̂ = ∞)' : val ? ` (R̂ = ${val.toFixed(2)})` : '');
  const formatESS = (val) => (val ? ` (ESS = ${Math.round(val)})` : '');
  const formatRate = (chain) => {
    const acc = chain.samples.length;
    const total = acc + chain.rejectedCount;
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
                color: index === 0 ? HMC_SAMPLER.styles.primaryColor : HMC_SAMPLER.styles.secondaryColor,
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
          X Trace {rHat && <span className="stat-label">{formatRHat(rHat.x)}</span>}
          {ess && <span className="stat-label">{formatESS(ess.x)}</span>}
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
          Y Trace {rHat && <span className="stat-label">{formatRHat(rHat.y)}</span>}
          {ess && <span className="stat-label">{formatESS(ess.y)}</span>}
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
  chains: PropTypes.array,
  burnIn: PropTypes.number,
  rHat: PropTypes.object,
  ess: PropTypes.object,
};

export default TracePlots;
