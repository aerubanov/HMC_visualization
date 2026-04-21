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
/**
 * Renders histogram panels for a single `samples` array.
 * Extracted so that it can be used both in the legacy single-panel path
 * and the new per-chain multi-panel path.
 *
 * @param {{ samples: Array<{x:number,y:number}>, axisLimits: object|undefined }} props
 */
function SingleHistogramPanel({ samples, axisLimits }) {
  if (!samples || samples.length === 0) return null;

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
  );
}

SingleHistogramPanel.propTypes = {
  samples: PropTypes.arrayOf(
    PropTypes.shape({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
    })
  ),
  axisLimits: PropTypes.shape({
    xMin: PropTypes.number,
    xMax: PropTypes.number,
    yMin: PropTypes.number,
    yMax: PropTypes.number,
  }),
};

function HistogramPlots({ histogramData, histogramDataPerChain, axisLimits }) {
  // Per-chain split layout: one panel per chain with its sampler label
  if (histogramDataPerChain && histogramDataPerChain.length > 0) {
    return (
      <div className="histogram-plots-container">
        <h3 className="section-title">Posterior Distributions</h3>
        <div className="histogram-per-chain-row">
          {histogramDataPerChain.map((entry) => (
            <div key={entry.chainId} className="histogram-per-chain-panel">
              <h4 className="histogram-chain-label">{entry.label}</h4>
              <SingleHistogramPanel
                samples={entry.samples}
                axisLimits={axisLimits}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Legacy single-panel path (unchanged)
  const { samples } = histogramData;

  if (!samples || samples.length === 0) {
    return null;
  }

  return (
    <div className="histogram-plots-container">
      <h3 className="section-title">Posterior Distributions</h3>
      <SingleHistogramPanel samples={samples} axisLimits={axisLimits} />
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
  /** Optional: when provided, renders one labelled panel per chain instead of the merged panel */
  histogramDataPerChain: PropTypes.arrayOf(
    PropTypes.shape({
      chainId: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
        .isRequired,
      samplerType: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      samples: PropTypes.arrayOf(
        PropTypes.shape({
          x: PropTypes.number.isRequired,
          y: PropTypes.number.isRequired,
        })
      ).isRequired,
    })
  ),
  axisLimits: PropTypes.shape({
    xMin: PropTypes.number,
    xMax: PropTypes.number,
    yMin: PropTypes.number,
    yMax: PropTypes.number,
  }),
};

export default HistogramPlots;
