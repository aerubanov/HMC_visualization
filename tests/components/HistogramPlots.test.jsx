import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HistogramPlots from '../../src/components/HistogramPlots';

// Mock Plot component
vi.mock('react-plotly.js', () => ({
  __esModule: true,
  default: ({ data, layout }) => (
    <div data-testid="plotly-plot">
      <div data-testid="plot-data">{JSON.stringify(data)}</div>
      <div data-testid="plot-layout">{JSON.stringify(layout)}</div>
    </div>
  ),
}));

describe('HistogramPlots', () => {
  const mockSamples = [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
    { x: 5, y: 6 },
  ];

  const mockSamples2 = [
    { x: 10, y: 20 },
    { x: 30, y: 40 },
    { x: 50, y: 60 },
  ];

  it('should render without crashing with valid data', () => {
    const histogramData = {
      chain1: mockSamples,
      chain2: null,
    };
    render(<HistogramPlots histogramData={histogramData} />);

    expect(screen.getByText('Posterior Distributions')).toBeInTheDocument();
    const plots = screen.getAllByTestId('plotly-plot');
    expect(plots).toHaveLength(3); // X marginal, Y marginal, 2D joint
  });

  it('should render with dual chains', () => {
    const histogramData = {
      chain1: mockSamples,
      chain2: mockSamples2,
    };
    render(<HistogramPlots histogramData={histogramData} />);

    expect(screen.getByText('Posterior Distributions')).toBeInTheDocument();
    const plots = screen.getAllByTestId('plotly-plot');
    expect(plots).toHaveLength(3);
  });

  it('should handle null samples gracefully', () => {
    const { container } = render(
      <HistogramPlots
        histogramData={{
          chain1: null,
          chain2: null,
        }}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should handle empty samples array', () => {
    const { container } = render(
      <HistogramPlots
        histogramData={{
          chain1: [],
          chain2: [],
        }}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render the filtered samples provided in histogramData', () => {
    // In the new flow, filtering happens before passing to HistogramPlots
    const filteredSamples = [mockSamples[2]]; // { x: 5, y: 6 }
    const histogramData = {
      chain1: filteredSamples,
      chain2: null,
    };

    render(<HistogramPlots histogramData={histogramData} />);

    const plots = screen.getAllByTestId('plotly-plot');
    const xPlotData = JSON.parse(
      plots[2].querySelector('[data-testid="plot-data"]').textContent
    );
    expect(xPlotData[0].x).toEqual([5]);
  });

  it('should handle missing optional props', () => {
    render(
      <HistogramPlots histogramData={{ chain1: mockSamples, chain2: null }} />
    );

    expect(screen.getByText('Posterior Distributions')).toBeInTheDocument();
  });
});
