import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Visualizer from '../../src/components/Visualizer';

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

describe('Visualizer', () => {
  const mockContour = { type: 'contour', x: [0], y: [0], z: [[0]] };
  const mockTrajectory = [{ x: 0, y: 0 }];
  const mockSamples = [{ x: 0, y: 0 }];

  it('should render placeholder when no contourData', () => {
    render(<Visualizer contourData={null} />);
    expect(
      screen.getByText('Enter a Log Probability Function')
    ).toBeInTheDocument();
  });

  it('should render plot when contourData is provided', () => {
    render(
      <Visualizer
        contourData={mockContour}
        trajectory={mockTrajectory}
        acceptedSamples={mockSamples}
      />
    );

    const plot = screen.getByTestId('plotly-plot');
    expect(plot).toBeInTheDocument();

    // Check initial layout ranges (should be default/undefined if no axisLimits)
    const layout = JSON.parse(
      plot.querySelector('[data-testid="plot-layout"]').textContent
    );
    // When axisLimits is undefined, Visualizer falls back to GENERAL.layout.xaxis.range which is undefined (autoscale)
    expect(layout.xaxis.range).toBeUndefined();
  });

  it('should respect axisLimits prop', () => {
    const axisLimits = { xMin: -10, xMax: 10, yMin: -20, yMax: 20 };
    // console.log('Testing with axisLimits:', axisLimits);
    render(<Visualizer contourData={mockContour} axisLimits={axisLimits} />);

    const plot = screen.getByTestId('plotly-plot');
    const layout = JSON.parse(
      plot.querySelector('[data-testid="plot-layout"]').textContent
    );

    expect(layout.xaxis.range).toEqual([-10, 10]);
    expect(layout.yaxis.range).toEqual([-20, 20]);
  });

  it('should render second chain traces when enabled', () => {
    const mockSamples2 = [{ x: 1, y: 1 }];
    const mockTrajectory2 = [{ x: 1, y: 1 }];

    render(
      <Visualizer
        contourData={mockContour}
        acceptedSamples={mockSamples}
        trajectory={mockTrajectory}
        useSecondChain={true}
        acceptedSamples2={mockSamples2}
        trajectory2={mockTrajectory2}
      />
    );

    const plot = screen.getByTestId('plotly-plot');
    const data = JSON.parse(
      plot.querySelector('[data-testid="plot-data"]').textContent
    );

    // Expect: Contour + Chain1 Samples + Chain1 Trajectory + Chain2 Samples + Chain2 Trajectory = 5 traces
    expect(data).toHaveLength(5);
  });
});
