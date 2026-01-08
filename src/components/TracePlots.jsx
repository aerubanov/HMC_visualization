import './TracePlots.css';
import Plot from 'react-plotly.js';
import PropTypes from 'prop-types';
import { TRACE_PLOT, HMC_SAMPLER } from '../utils/plotConfig.json';
import { createTracePlotTrace } from '../utils/plotFunctions';

function TracePlots({ samples, samples2, burnIn, useSecondChain, rHat, ess }) {
  const commonLayout = {
    ...TRACE_PLOT.layout,
    showlegend: true,
    legend: {
      orientation: 'h',
      y: -0.2, // Move legend below plot
    },
  };

  const xConfig = {
    displayModeBar: false,
    responsive: true,
  };

  // Generate traces for X
  const xTraces = [];
  if (samples && samples.length > 0) {
    xTraces.push(
      ...createTracePlotTrace(
        samples,
        'x',
        burnIn,
        HMC_SAMPLER.styles.primaryColor,
        'Chain 1'
      )
    );
  }

  if (useSecondChain && samples2 && samples2.length > 0) {
    xTraces.push(
      ...createTracePlotTrace(
        samples2,
        'x',
        burnIn,
        HMC_SAMPLER.styles.secondaryColor,
        'Chain 2'
      )
    );
  }

  // Generate traces for Y
  const yTraces = [];
  if (samples && samples.length > 0) {
    yTraces.push(
      ...createTracePlotTrace(
        samples,
        'y',
        burnIn,
        HMC_SAMPLER.styles.primaryColor,
        'Chain 1'
      )
    );
  }

  if (useSecondChain && samples2 && samples2.length > 0) {
    yTraces.push(
      ...createTracePlotTrace(
        samples2,
        'y',
        burnIn,
        HMC_SAMPLER.styles.secondaryColor,
        'Chain 2'
      )
    );
  }

  const formatRHat = (val) => {
    if (val === undefined || val === null) return '';
    // If val is Infinity, show symbol
    if (!isFinite(val)) return ' (R̂ = ∞)';
    return ` (R̂ = ${val.toFixed(2)})`;
  };

  const formatESS = (val) => {
    if (val === undefined || val === null) return '';
    return ` (ESS = ${Math.round(val)})`;
  };

  return (
    <div className="trace-plots-container">
      <div className="trace-plot-wrapper">
        <h4 className="trace-title">
          X Trace
          {rHat && <span className="stat-label">{formatRHat(rHat.x)}</span>}
          {ess && <span className="stat-label">{formatESS(ess.x)}</span>}
        </h4>
        <Plot
          data={xTraces}
          layout={{ ...commonLayout, title: '' }} // Remove title from Plotly, use HTML headers
          config={xConfig}
          style={{ width: '100%', height: '300px' }}
          useResizeHandler={true}
        />
      </div>
      <div className="trace-plot-wrapper">
        <h4 className="trace-title">
          Y Trace
          {rHat && <span className="stat-label">{formatRHat(rHat.y)}</span>}
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
  samples: PropTypes.arrayOf(
    PropTypes.shape({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
    })
  ),
  samples2: PropTypes.arrayOf(
    PropTypes.shape({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
    })
  ),
  burnIn: PropTypes.number,
  useSecondChain: PropTypes.bool,
  rHat: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
  ess: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
};

export default TracePlots;
