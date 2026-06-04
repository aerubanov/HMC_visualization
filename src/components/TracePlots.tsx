import './TracePlots.css';
import Plot from 'react-plotly.js';
import type * as Plotly from 'plotly.js';
import { TRACE_PLOT, HMC_SAMPLER } from '../utils/plotConfig.json';
import { createTracePlotTrace } from '../utils/plotFunctions';
import type { ChainState, EssResult, PerChainEss } from '../types';

interface Props {
  chains?: ChainState[];
  burnIn?: number;
  rHat?: EssResult | null;
  ess?: EssResult | null;
  essPerChain?: PerChainEss[] | null;
}

/**
 * @param {Array<{chainId: *, ess: {x: number, y: number}}>|null|undefined} essPerChain
 *   When provided, each chain's ESS is sourced from this array instead of the aggregate `ess` prop.
 */
function TracePlots({ chains = [], burnIn, rHat, ess, essPerChain }: Props) {
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

  const formatRHat = (val: number | null | undefined) =>
    val == null ? '' : !isFinite(val) ? ' (R̂ = ∞)' : ` (R̂ = ${val.toFixed(2)})`;
  const formatESS = (val: number | null | undefined) =>
    val ? ` (ESS = ${Math.round(val)})` : '';
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
                entry.ess && (
                  <span key={String(entry.chainId)} className="stat-label">
                    {label}: ESS={Math.round(entry.ess.x)}
                  </span>
                )
              );
            })}
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
                entry.ess && (
                  <span key={String(entry.chainId)} className="stat-label">
                    {label}: ESS={Math.round(entry.ess.y)}
                  </span>
                )
              );
            })}
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
