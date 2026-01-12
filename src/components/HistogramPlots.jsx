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
/**
 * HistogramPlots component displays 2D histogram and marginal distributions
 * Layout: Y marginal (left, vertical) | 2D histogram (center)
 *         Empty (bottom-left)         | X marginal (bottom, horizontal)
 */
function HistogramPlots({ histogramData, axisLimits }) {
  const { samples } = histogramData;

  if (!samples || samples.length === 0) {
    return null;
  }

  // 2D Joint Histogram Trace
  const traces2D = [];
  const h2d = createHistogram2DTrace(samples, 'Blues', 'Posterior');
  if (h2d) traces2D.push(h2d);

  // X Marginal Trace
  const tracesX = [];
  const hx = createMarginalHistogramTrace(
    samples,
    'x',
    HMC_SAMPLER.styles.primaryColor,
    'X Distribution'
  );
  if (hx) tracesX.push(hx);

  // Y Marginal Trace (Vertical/Rotated)
  const tracesY = [];
  const hy = createMarginalHistogramTrace(
    samples,
    'y',
    HMC_SAMPLER.styles.primaryColor,
    'Y Distribution',
    'h' // horizontal orientation makes it vertical when y-axis is data
  );
  if (hy) tracesY.push(hy);

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
              yaxis: {
                title: 'y',
                showgrid: true,
                range: axisLimits
                  ? [axisLimits.yMin, axisLimits.yMax]
                  : undefined,
              },
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
              xaxis: {
                title: 'x',
                showgrid: true,
                range: axisLimits
                  ? [axisLimits.xMin, axisLimits.xMax]
                  : undefined,
              },
              yaxis: {
                title: 'y',
                showgrid: true,
                range: axisLimits
                  ? [axisLimits.yMin, axisLimits.yMax]
                  : undefined,
              },
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
              xaxis: {
                title: 'x',
                showgrid: true,
                range: axisLimits
                  ? [axisLimits.xMin, axisLimits.xMax]
                  : undefined,
              },
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
    samples: PropTypes.arrayOf(
      PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
      })
    ),
  }).isRequired,
  axisLimits: PropTypes.shape({
    xMin: PropTypes.number,
    xMax: PropTypes.number,
    yMin: PropTypes.number,
    yMax: PropTypes.number,
  }),
};

export default HistogramPlots;
