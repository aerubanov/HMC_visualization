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
    render(
      <HistogramPlots
        samples={mockSamples}
        samples2={null}
        burnIn={0}
        useSecondChain={false}
      />
    );

    expect(screen.getByText('Posterior Distributions')).toBeInTheDocument();
    const plots = screen.getAllByTestId('plotly-plot');
    expect(plots).toHaveLength(3); // X marginal, Y marginal, 2D joint
  });

  it('should render with dual chains', () => {
    render(
      <HistogramPlots
        samples={mockSamples}
        samples2={mockSamples2}
        burnIn={0}
        useSecondChain={true}
      />
    );

    expect(screen.getByText('Posterior Distributions')).toBeInTheDocument();
    const plots = screen.getAllByTestId('plotly-plot');
    expect(plots).toHaveLength(3);
  });

  it('should handle null samples gracefully', () => {
    const { container } = render(
      <HistogramPlots
        samples={null}
        samples2={null}
        burnIn={0}
        useSecondChain={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should handle empty samples array', () => {
    const { container } = render(
      <HistogramPlots
        samples={[]}
        samples2={[]}
        burnIn={0}
        useSecondChain={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should apply burn-in filtering', () => {
    render(
      <HistogramPlots
        samples={mockSamples}
        samples2={null}
        burnIn={2} // Only 1 sample left (5, 6)
        useSecondChain={false}
      />
    );

    const plots = screen.getAllByTestId('plotly-plot');
    const xPlotData = JSON.parse(
      plots[2].querySelector('[data-testid="plot-data"]').textContent
    );
    // Since X is horizontal, it uses 'x' property in my implementation (wait, let me check)
    // Actually in my implementation for orientation='v', it uses 'x'
    expect(xPlotData[0].x).toEqual([5]);
  });

  it('should handle missing optional props', () => {
    render(<HistogramPlots samples={mockSamples} />);

    expect(screen.getByText('Posterior Distributions')).toBeInTheDocument();
  });
});
