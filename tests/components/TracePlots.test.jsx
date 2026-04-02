import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, test, expect } from 'vitest';
import TracePlots from '../../src/components/TracePlots';

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

describe('TracePlots', () => {
  const mockChainsSingle = [{
    id: 0,
    samples: [
      { x: 0.1, y: 0.2 },
      { x: 0.3, y: 0.4 },
      { x: 0.5, y: 0.6 },
    ],
    acceptedCount: 100,
    rejectedCount: 50
  }];

  const mockChainsDual = [{
    id: 0,
    samples: [
      { x: 0.1, y: 0.2 },
      { x: 0.3, y: 0.4 },
      { x: 0.5, y: 0.6 },
    ],
    acceptedCount: 100,
    rejectedCount: 50
  }, {
    id: 1,
    samples: [
      { x: 1.1, y: 1.2 },
      { x: 1.3, y: 1.4 },
    ],
    acceptedCount: 80,
    rejectedCount: 70
  }];

  test('renders without crashing', () => {
    // eslint-disable-next-line react/prop-types
    render(<TracePlots chains={mockChainsSingle} iterationCount={150} />);
    expect(screen.getByText('X Trace')).toBeInTheDocument();
    expect(screen.getByText('Y Trace')).toBeInTheDocument();
  });

  test('renders two Plotly plots', () => {
    // eslint-disable-next-line react/prop-types
    render(<TracePlots chains={mockChainsSingle} iterationCount={150} />);
    const plots = screen.getAllByTestId('plotly-plot');
    expect(plots).toHaveLength(2);
  });

  test('passes correct data to Plotly for simple case', () => {
    // eslint-disable-next-line react/prop-types
    render(<TracePlots chains={mockChainsSingle} iterationCount={150} />);
    const plots = screen.getAllByTestId('plotly-plot');

    const xPlotData = JSON.parse(
      plots[0].querySelector('[data-testid="plot-data"]').textContent
    );
    expect(xPlotData).toHaveLength(1);
    expect(xPlotData[0].y).toEqual([0.1, 0.3, 0.5]);
    expect(xPlotData[0].name).toBe('Chain 1');

    const yPlotData = JSON.parse(
      plots[1].querySelector('[data-testid="plot-data"]').textContent
    );
    expect(yPlotData).toHaveLength(1);
    expect(yPlotData[0].y).toEqual([0.2, 0.4, 0.6]);
    expect(yPlotData[0].name).toBe('Chain 1');
  });

  test('handles burn-in correctly', () => {
    const burnIn = 1;
    // eslint-disable-next-line react/prop-types
    render(<TracePlots chains={mockChainsSingle} burnIn={burnIn} iterationCount={150} />);
    const plots = screen.getAllByTestId('plotly-plot');

    const xPlotData = JSON.parse(
      plots[0].querySelector('[data-testid="plot-data"]').textContent
    );

    expect(xPlotData).toHaveLength(2);

    expect(xPlotData[0].name).toBe('Chain 1 (Burn-in)');
    expect(xPlotData[0].y).toEqual([0.1, 0.3]);
    expect(xPlotData[0].line.color).toMatch(/^rgba\(\d+, \d+, \d+, 0\.3\)$/);

    expect(xPlotData[1].name).toBe('Chain 1');
    expect(xPlotData[1].y).toEqual([0.3, 0.5]);
    expect(xPlotData[1].line.color).toBe('#d73a49');
  });

  test('handles second chain correctly', () => {
    // eslint-disable-next-line react/prop-types
    render(<TracePlots chains={mockChainsDual} iterationCount={150} />);
    const plots = screen.getAllByTestId('plotly-plot');

    const xPlotData = JSON.parse(
      plots[0].querySelector('[data-testid="plot-data"]').textContent
    );

    expect(xPlotData).toHaveLength(2);
    expect(xPlotData[0].name).toBe('Chain 1');
    expect(xPlotData[1].name).toBe('Chain 2');
    expect(xPlotData[1].y).toEqual([1.1, 1.3]);
  });

  test('handles chains of different lengths correctly', () => {
    const chainsDiffLen = [{
      id: 0,
      samples: [{x: 1, y: 1}, {x: 2, y: 2}, {x: 3, y: 3}, {x: 4, y: 4}],
      acceptedCount: 4, rejectedCount: 0
    }, {
      id: 1,
      samples: [{x: 10, y: 10}, {x: 20, y: 20}],
      acceptedCount: 2, rejectedCount: 0
    }];

    // eslint-disable-next-line react/prop-types
    render(<TracePlots chains={chainsDiffLen} burnIn={0} iterationCount={4} />);
    const plots = screen.getAllByTestId('plotly-plot');
    const xPlotData = JSON.parse(plots[0].querySelector('[data-testid="plot-data"]').textContent);

    expect(xPlotData).toHaveLength(2);
    expect(xPlotData[0].name).toBe('Chain 1');
    expect(xPlotData[0].x).toEqual([0, 1, 2, 3]);
    expect(xPlotData[0].y).toEqual([1, 2, 3, 4]);

    expect(xPlotData[1].name).toBe('Chain 2');
    expect(xPlotData[1].x).toEqual([0, 1]);
    expect(xPlotData[1].y).toEqual([10, 20]);
  });

  test('displays R-hat values when provided', () => {
    const rHat = { x: 1.05, y: 1.1 };
    // eslint-disable-next-line react/prop-types
    render(<TracePlots chains={mockChainsDual} rHat={rHat} iterationCount={150} />);

    expect(screen.getByText('(R̂ = 1.05)')).toBeInTheDocument();
    expect(screen.getByText('(R̂ = 1.10)')).toBeInTheDocument();
  });

  test('displays infinity symbol for infinite R-hat', () => {
    const rHat = { x: Infinity, y: Infinity };
    // eslint-disable-next-line react/prop-types
    render(<TracePlots chains={mockChainsDual} rHat={rHat} iterationCount={150} />);

    expect(screen.getAllByText('(R̂ = ∞)')).toHaveLength(2);
  });

  test('does not display R-hat values when null', () => {
    // eslint-disable-next-line react/prop-types
    render(<TracePlots chains={mockChainsSingle} rHat={null} iterationCount={150} />);

    expect(screen.getByText('X Trace')).toBeInTheDocument();
    expect(screen.queryByText(/R̂/)).not.toBeInTheDocument();
  });

  test('displays ESS values when provided', () => {
    const rHat = { x: 1.1, y: 1.1 };
    const ess = { x: 100, y: 200 };
    // eslint-disable-next-line react/prop-types
    render(<TracePlots chains={mockChainsDual} rHat={rHat} ess={ess} iterationCount={150} />);

    expect(screen.getByText('(ESS = 100)')).toBeInTheDocument();
    expect(screen.getByText('(ESS = 200)')).toBeInTheDocument();
  });

  test('displays acceptance and rejection counts for single chain', () => {
    // eslint-disable-next-line react/prop-types
    render(<TracePlots chains={mockChainsSingle} iterationCount={150} />);

    expect(screen.getByText(/Acc: 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Rej: 50/i)).toBeInTheDocument();
  });

  test('displays acceptance and rejection counts for second chain', () => {
    // eslint-disable-next-line react/prop-types
    render(<TracePlots chains={mockChainsDual} iterationCount={150} />);

    expect(screen.getByText(/Acc: 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Acc: 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Rej: 70/i)).toBeInTheDocument();
  });
});
