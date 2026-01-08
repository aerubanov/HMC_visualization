import './HistogramPlots.css';
import Plot from 'react-plotly.js';
import PropTypes from 'prop-types';
import { HISTOGRAM, HMC_SAMPLER } from '../utils/plotConfig.json';
import {
  createHistogram2DTrace,
  createMarginalHistogramTrace,
} from '../utils/plotFunctions';

/**
 * HistogramPlots component displays 2D histogram and marginal distributions
 * Layout: Y marginal (left, vertical) | 2D histogram (center)
 *         Empty (bottom-left)         | X marginal (bottom, horizontal)
 */
function HistogramPlots({ histogramData }) {
  const { chain1, chain2 } = histogramData;
  const useSecondChain = chain2 !== null;

  if (!chain1 || chain1.length === 0) {
    return null;
  }

  // 2D Joint Histogram Traces
  const traces2D = [];
  const h2d1 = createHistogram2DTrace(
    chain1,
    'Blues',
    useSecondChain ? 'Chain 1' : 'Samples'
  );
  if (h2d1) traces2D.push(h2d1);

  if (useSecondChain && chain2 && chain2.length > 0) {
    const h2d2 = createHistogram2DTrace(chain2, 'Reds', 'Chain 2');
    if (h2d2) {
      // Adjust opacity if multiple chains
      h2d2.opacity = 0.6;
      h2d1.opacity = 0.6;
      traces2D.push(h2d2);
    }
  }

  // X Marginal Traces
  const tracesX = [];
  const hx1 = createMarginalHistogramTrace(
    chain1,
    'x',
    HMC_SAMPLER.styles.primaryColor,
    'Chain 1'
  );
  if (hx1) tracesX.push(hx1);

  if (useSecondChain && chain2 && chain2.length > 0) {
    const hx2 = createMarginalHistogramTrace(
      chain2,
      'x',
      HMC_SAMPLER.styles.secondaryColor,
      'Chain 2'
    );
    if (hx2) tracesX.push(hx2);
  }

  // Y Marginal Traces (Vertical/Rotated)
  const tracesY = [];
  const hy1 = createMarginalHistogramTrace(
    chain1,
    'y',
    HMC_SAMPLER.styles.primaryColor,
    'Chain 1',
    'h' // horizontal orientation makes it vertical when y-axis is data
  );
  if (hy1) tracesY.push(hy1);

  if (useSecondChain && chain2 && chain2.length > 0) {
    const hy2 = createMarginalHistogramTrace(
      chain2,
      'y',
      HMC_SAMPLER.styles.secondaryColor,
      'Chain 2',
      'h'
    );
    if (hy2) tracesY.push(hy2);
  }

  const commonLayout = {
    ...HISTOGRAM.layout,
    paper_bgcolor: 'transparent',
    plot_bgcolor: '#ffffff',
  };

  const xConfig = { displayModeBar: false, responsive: true };

  return (
    <div className="histogram-plots-container">
      <h3 className="section-title">Posterior Distributions</h3>
      <div className="histogram-grid">
        {/* Y marginal histogram (vertical) */}
        <div className="histogram-y-marginal">
          <Plot
            data={tracesY}
            layout={{
              ...commonLayout,
              yaxis: { title: 'y', showgrid: true },
              xaxis: { showgrid: false, showticklabels: false },
            }}
            config={xConfig}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
          />
        </div>

        {/* 2D joint histogram */}
        <div className="histogram-2d">
          <Plot
            data={traces2D}
            layout={{
              ...commonLayout,
              xaxis: { title: 'x', showgrid: true },
              yaxis: { title: 'y', showgrid: true },
            }}
            config={xConfig}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
          />
        </div>

        {/* Empty space */}
        <div className="histogram-empty"></div>

        {/* X marginal histogram (horizontal) */}
        <div className="histogram-x-marginal">
          <Plot
            data={tracesX}
            layout={{
              ...commonLayout,
              xaxis: { title: 'x', showgrid: true },
              yaxis: { showgrid: false, showticklabels: false },
            }}
            config={xConfig}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
          />
        </div>
      </div>
    </div>
  );
}

HistogramPlots.propTypes = {
  histogramData: PropTypes.shape({
    chain1: PropTypes.arrayOf(
      PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
      })
    ),
    chain2: PropTypes.arrayOf(
      PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
      })
    ),
  }).isRequired,
};

export default HistogramPlots;
