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

  it('should render without crashing with valid histogramDataByType', () => {
    const histogramDataByType = [
      {
        chainId: 'HMC',
        samplerType: 'HMC',
        label: 'HMC',
        samples: mockSamples,
      },
    ];
    render(<HistogramPlots histogramDataByType={histogramDataByType} />);

    expect(screen.getByText('Posterior Distributions')).toBeInTheDocument();
    const plots = screen.getAllByTestId('plotly-plot');
    expect(plots).toHaveLength(3); // X marginal, Y marginal, 2D joint
  });

  it('should render with combined dual chains merged by type', () => {
    const histogramDataByType = [
      {
        chainId: 'HMC',
        samplerType: 'HMC',
        label: 'HMC',
        samples: [...mockSamples, ...mockSamples2],
      },
    ];
    render(<HistogramPlots histogramDataByType={histogramDataByType} />);

    expect(screen.getByText('Posterior Distributions')).toBeInTheDocument();
    const plots = screen.getAllByTestId('plotly-plot');
    expect(plots).toHaveLength(3);
  });

  it('should handle null/undefined histogramDataByType gracefully', () => {
    const { container } = render(<HistogramPlots />);
    expect(container.firstChild).toBeNull();
  });

  it('should handle empty histogramDataByType array', () => {
    const { container } = render(<HistogramPlots histogramDataByType={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should handle entries with no samples gracefully (returns null)', () => {
    const histogramDataByType = [
      {
        chainId: 'HMC',
        samplerType: 'HMC',
        label: 'HMC',
        samples: [],
      },
    ];
    const { container } = render(
      <HistogramPlots histogramDataByType={histogramDataByType} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render the filtered samples provided in histogramDataByType', () => {
    const filteredSamples = [{ x: 5, y: 6 }];
    const histogramDataByType = [
      {
        chainId: 'HMC',
        samplerType: 'HMC',
        label: 'HMC',
        samples: filteredSamples,
      },
    ];

    render(<HistogramPlots histogramDataByType={histogramDataByType} />);

    const plots = screen.getAllByTestId('plotly-plot');
    // Check X marginal or 2D joint
    const xPlotData = JSON.parse(
      plots[2].querySelector('[data-testid="plot-data"]').textContent
    );
    expect(xPlotData[0].x).toEqual([5]);
  });

  it('should handle missing optional props (no axisLimits)', () => {
    const histogramDataByType = [
      {
        chainId: 'HMC',
        samplerType: 'HMC',
        label: 'HMC',
        samples: mockSamples,
      },
    ];
    render(<HistogramPlots histogramDataByType={histogramDataByType} />);
    expect(screen.getByText('Posterior Distributions')).toBeInTheDocument();
  });

  it('renders two labelled panels when histogramDataByType has two entries', () => {
    const histogramDataByType = [
      {
        chainId: 'HMC',
        samplerType: 'HMC',
        label: 'HMC',
        samples: mockSamples,
      },
      {
        chainId: 'GIBBS',
        samplerType: 'GIBBS',
        label: 'Gibbs',
        samples: mockSamples2,
      },
    ];

    render(<HistogramPlots histogramDataByType={histogramDataByType} />);

    expect(screen.getByText('HMC')).toBeInTheDocument();
    expect(screen.getByText('Gibbs')).toBeInTheDocument();

    // Each type should have 3 plots (2D, X marginal, Y marginal) → 6 total
    const plots = screen.getAllByTestId('plotly-plot');
    expect(plots).toHaveLength(6);
  });

  it('renders single panel when histogramDataByType has one entry', () => {
    const histogramDataByType = [
      {
        chainId: 'HMC',
        samplerType: 'HMC',
        label: 'HMC',
        samples: mockSamples,
      },
    ];

    render(<HistogramPlots histogramDataByType={histogramDataByType} />);

    expect(screen.getByText('Posterior Distributions')).toBeInTheDocument();
    expect(screen.getByText('HMC')).toBeInTheDocument();

    const plots = screen.getAllByTestId('plotly-plot');
    expect(plots).toHaveLength(3);
  });

  it('should respect axisLimits prop', () => {
    const axisLimits = { xMin: -10, xMax: 10, yMin: -20, yMax: 20 };
    const histogramDataByType = [
      {
        chainId: 'HMC',
        samplerType: 'HMC',
        label: 'HMC',
        samples: mockSamples,
      },
    ];
    render(
      <HistogramPlots
        histogramDataByType={histogramDataByType}
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
