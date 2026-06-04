import './TracePlots.css';
import Plot from 'react-plotly.js';
import type * as Plotly from 'plotly.js';
import { TRACE_PLOT } from '../utils/plotConfig.json';
import { createTracePlotTrace, CHAIN_COLORS } from '../utils/plotFunctions';
import type { ChainState, GroupStats } from '../types';

interface Props {
  chains?: ChainState[];
  burnIn?: number;
  groupStats?: GroupStats[];
}

function TracePlots({ chains = [], burnIn, groupStats = [] }: Props) {
  const commonLayout = {
    ...TRACE_PLOT.layout,
    showlegend: true,
    legend: { orientation: 'h' as const, y: -0.2 },
  };
  const xConfig = { displayModeBar: false, responsive: true };

  const xTraces: Partial<Plotly.PlotData>[] = [];
  const yTraces: Partial<Plotly.PlotData>[] = [];

  chains.forEach((chain, index) => {
    if (chain.samples && chain.samples.length > 0) {
      const color = CHAIN_COLORS[chain.colorIndex % CHAIN_COLORS.length];
      const label = `Chain ${index + 1} (${chain.samplerType})`;
      xTraces.push(
        ...createTracePlotTrace(chain.samples, 'x', burnIn, color, label)
      );
      yTraces.push(
        ...createTracePlotTrace(chain.samples, 'y', burnIn, color, label)
      );
    }
  });

  const formatRHat = (val: number | null | undefined) =>
    val == null ? '' : !isFinite(val) ? ' R̂=∞' : ` R̂=${val.toFixed(2)}`;
  const formatESS = (val: number | null | undefined) =>
    val ? ` ESS=${Math.round(val)}` : '';
  const formatRate = (chain: ChainState) => {
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
                color: CHAIN_COLORS[chain.colorIndex % CHAIN_COLORS.length],
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
          {groupStats.map((gs) => (
            <span key={gs.samplerType} className="stat-label">
              {gs.samplerType}:{formatRHat(gs.rHat?.x)}
              {formatESS(gs.ess?.x)}
            </span>
          ))}
        </h4>
        <Plot
          data={xTraces}
          layout={
            { ...commonLayout, title: '' } as unknown as Partial<Plotly.Layout>
          }
          config={xConfig}
          style={{ width: '100%', height: '300px' }}
          useResizeHandler={true}
        />
      </div>
      <div className="trace-plot-wrapper">
        <h4 className="trace-title">
          Y Trace{' '}
          {groupStats.map((gs) => (
            <span key={gs.samplerType} className="stat-label">
              {gs.samplerType}:{formatRHat(gs.rHat?.y)}
              {formatESS(gs.ess?.y)}
            </span>
          ))}
        </h4>
        <Plot
          data={yTraces}
          layout={
            { ...commonLayout, title: '' } as unknown as Partial<Plotly.Layout>
          }
          config={xConfig}
          style={{ width: '100%', height: '300px' }}
          useResizeHandler={true}
        />
      </div>
    </div>
  );
}

export default TracePlots;
