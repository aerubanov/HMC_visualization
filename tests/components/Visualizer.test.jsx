import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
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
  
  const mockChainsSingle = [
    { id: 0, samples: [{ x: 0, y: 0 }], trajectory: [{ x: 0, y: 0 }] }
  ];

  const mockChainsDual = [
    { id: 0, samples: [{ x: 0, y: 0 }], trajectory: [{ x: 0, y: 0 }] },
    { id: 1, samples: [{ x: 1, y: 1 }], trajectory: [{ x: 1, y: 1 }] }
  ];

  it('should render placeholder when no contourData', () => {
    // eslint-disable-next-line react/prop-types
    render(<Visualizer contourData={null} chains={[]} />);
    expect(
      screen.getByText('Enter a Log Probability Function')
    ).toBeInTheDocument();
  });

  it('should render plot when contourData is provided', () => {
    // eslint-disable-next-line react/prop-types
    render(
      <Visualizer
        contourData={mockContour}
        chains={mockChainsSingle}
      />
    );

    const plot = screen.getByTestId('plotly-plot');
    expect(plot).toBeInTheDocument();

    const layout = JSON.parse(
      plot.querySelector('[data-testid="plot-layout"]').textContent
    );
    expect(layout.xaxis.range).toBeUndefined();
  });

  it('should respect axisLimits prop', () => {
    const axisLimits = { xMin: -10, xMax: 10, yMin: -20, yMax: 20 };
    // eslint-disable-next-line react/prop-types
    render(<Visualizer contourData={mockContour} chains={mockChainsSingle} axisLimits={axisLimits} />);

    const plot = screen.getByTestId('plotly-plot');
    const layout = JSON.parse(
      plot.querySelector('[data-testid="plot-layout"]').textContent
    );

    expect(layout.xaxis.range).toEqual([-10, 10]);
    expect(layout.yaxis.range).toEqual([-20, 20]);
  });

  it('should render multiple chain traces when provided', () => {
    // eslint-disable-next-line react/prop-types
    render(
      <Visualizer
        contourData={mockContour}
        chains={mockChainsDual}
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
