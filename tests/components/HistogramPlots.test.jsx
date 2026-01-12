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
      samples: mockSamples,
    };
    render(<HistogramPlots histogramData={histogramData} />);

    expect(screen.getByText('Posterior Distributions')).toBeInTheDocument();
    const plots = screen.getAllByTestId('plotly-plot');
    expect(plots).toHaveLength(3); // X marginal, Y marginal, 2D joint
  });

  it('should render with combined dual chains', () => {
    // In actual app, these would be combined by the controller
    const histogramData = {
      samples: [...mockSamples, ...mockSamples2],
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
          samples: null,
        }}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should handle empty samples array', () => {
    const { container } = render(
      <HistogramPlots
        histogramData={{
          samples: [],
        }}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render the filtered samples provided in histogramData', () => {
    const filteredSamples = [{ x: 5, y: 6 }];
    const histogramData = {
      samples: filteredSamples,
    };

    render(<HistogramPlots histogramData={histogramData} />);

    const plots = screen.getAllByTestId('plotly-plot');
    // Check X marginal or 2D joint
    const xPlotData = JSON.parse(
      plots[2].querySelector('[data-testid="plot-data"]').textContent
    );
    expect(xPlotData[0].x).toEqual([5]);
  });

  it('should handle missing optional props', () => {
    render(<HistogramPlots histogramData={{ samples: mockSamples }} />);

    expect(screen.getByText('Posterior Distributions')).toBeInTheDocument();
  });
  it('should respect axisLimits prop', () => {
    const axisLimits = { xMin: -10, xMax: 10, yMin: -20, yMax: 20 };
    render(
      <HistogramPlots
        histogramData={{ samples: mockSamples }}
        axisLimits={axisLimits}
      />
    );

    const plots = screen.getAllByTestId('plotly-plot');
    const yLayout = JSON.parse(
      plots[0].querySelector('[data-testid="plot-layout"]').textContent
    );
    // Y Marginal (first plot) -> yaxis.range
    expect(yLayout.yaxis.range).toEqual([-20, 20]);

    const jointLayout = JSON.parse(
      plots[1].querySelector('[data-testid="plot-layout"]').textContent
    );
    // 2D Joint (second plot) -> xaxis.range, yaxis.range
    expect(jointLayout.xaxis.range).toEqual([-10, 10]);
    expect(jointLayout.yaxis.range).toEqual([-20, 20]);

    const xLayout = JSON.parse(
      plots[2].querySelector('[data-testid="plot-layout"]').textContent
    );
    // X Marginal (third plot) -> xaxis.range
    expect(xLayout.xaxis.range).toEqual([-10, 10]);
  });
});
