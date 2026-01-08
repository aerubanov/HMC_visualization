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
  const mockSamples = [
    { x: 0.1, y: 0.2 },
    { x: 0.3, y: 0.4 },
    { x: 0.5, y: 0.6 },
  ];

  const mockSamples2 = [
    { x: 1.1, y: 1.2 },
    { x: 1.3, y: 1.4 },
  ];

  test('renders without crashing', () => {
    render(<TracePlots samples={mockSamples} />);
    expect(screen.getByText('X Trace')).toBeInTheDocument();
    expect(screen.getByText('Y Trace')).toBeInTheDocument();
  });

  test('renders two Plotly plots', () => {
    render(<TracePlots samples={mockSamples} />);
    const plots = screen.getAllByTestId('plotly-plot');
    expect(plots).toHaveLength(2);
  });

  test('passes correct data to Plotly for simple case', () => {
    render(<TracePlots samples={mockSamples} />);
    const plots = screen.getAllByTestId('plotly-plot');

    // Check first plot (X trace)
    const xPlotData = JSON.parse(
      plots[0].querySelector('[data-testid="plot-data"]').textContent
    );
    expect(xPlotData).toHaveLength(1);
    expect(xPlotData[0].y).toEqual([0.1, 0.3, 0.5]); // X values
    expect(xPlotData[0].name).toBe('Chain 1');

    // Check second plot (Y trace)
    const yPlotData = JSON.parse(
      plots[1].querySelector('[data-testid="plot-data"]').textContent
    );
    expect(yPlotData).toHaveLength(1);
    expect(yPlotData[0].y).toEqual([0.2, 0.4, 0.6]); // Y values
    expect(yPlotData[0].name).toBe('Chain 1');
  });

  test('handles burn-in correctly', () => {
    const burnIn = 1;
    render(<TracePlots samples={mockSamples} burnIn={burnIn} />);
    const plots = screen.getAllByTestId('plotly-plot');

    // Check first plot (X trace)
    const xPlotData = JSON.parse(
      plots[0].querySelector('[data-testid="plot-data"]').textContent
    );

    // Should have 2 traces: burn-in and valid
    expect(xPlotData).toHaveLength(2);

    // Burn-in trace
    expect(xPlotData[0].name).toBe('Chain 1 (Burn-in)');
    expect(xPlotData[0].y).toEqual([0.1, 0.3]);
    // Opacity should be handled via rgba color now
    expect(xPlotData[0].line.color).toMatch(/^rgba\(\d+, \d+, \d+, 0\.3\)$/);

    // Valid trace
    expect(xPlotData[1].name).toBe('Chain 1');
    expect(xPlotData[1].y).toEqual([0.3, 0.5]);
    expect(xPlotData[1].line.color).toBe('#d73a49');
  });

  test('handles second chain correctly', () => {
    render(
      <TracePlots
        samples={mockSamples}
        samples2={mockSamples2}
        useSecondChain={true}
      />
    );
    const plots = screen.getAllByTestId('plotly-plot');

    // Check first plot (X trace)
    const xPlotData = JSON.parse(
      plots[0].querySelector('[data-testid="plot-data"]').textContent
    );

    // Should have 2 traces: Chain 1 and Chain 2 (no burn-in)
    expect(xPlotData).toHaveLength(2);
    expect(xPlotData[0].name).toBe('Chain 1');
    expect(xPlotData[1].name).toBe('Chain 2');

    expect(xPlotData[1].y).toEqual([1.1, 1.3]);
  });

  test('handles chains of different lengths correctly', () => {
    const longSamples = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
    ];
    const shortSamples = [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ];

    render(
      <TracePlots
        samples={longSamples}
        samples2={shortSamples}
        useSecondChain={true}
        burnIn={0}
      />
    );
    const plots = screen.getAllByTestId('plotly-plot');

    // Check X trace plot
    const xPlotData = JSON.parse(
      plots[0].querySelector('[data-testid="plot-data"]').textContent
    );

    expect(xPlotData).toHaveLength(2);

    // Chain 1 (Long)
    expect(xPlotData[0].name).toBe('Chain 1');
    expect(xPlotData[0].x).toEqual([0, 1, 2, 3]);
    expect(xPlotData[0].y).toEqual([1, 2, 3, 4]);

    // Chain 2 (Short)
    expect(xPlotData[1].name).toBe('Chain 2');
    expect(xPlotData[1].x).toEqual([0, 1]);
    expect(xPlotData[1].y).toEqual([10, 20]);
  });

  test('displays R-hat values when provided', () => {
    const rHat = { x: 1.05, y: 1.1 };
    render(<TracePlots samples={mockSamples} rHat={rHat} />);

    // Since text is split into spans, we check for presence of the formatted value
    expect(screen.getByText('(R̂ = 1.05)')).toBeInTheDocument();
    expect(screen.getByText('(R̂ = 1.10)')).toBeInTheDocument();
  });

  test('does not display R-hat values when null', () => {
    render(<TracePlots samples={mockSamples} rHat={null} />);

    expect(screen.getByText('X Trace')).toBeInTheDocument();
    expect(screen.queryByText(/R̂/)).not.toBeInTheDocument();
  });

  test('displays infinity symbol for infinite R-hat', () => {
    const rHat = { x: Infinity, y: Infinity };
    render(<TracePlots samples={mockSamples} rHat={rHat} />);

    expect(screen.getAllByText('(R̂ = ∞)')).toHaveLength(2);
  });

  test('displays ESS values when provided', () => {
    const rHat = { x: 1.1, y: 1.1 };
    const ess = { x: 100, y: 200 };
    render(<TracePlots samples={mockSamples} rHat={rHat} ess={ess} />);

    expect(screen.getByText('(ESS = 100)')).toBeInTheDocument();
    expect(screen.getByText('(ESS = 200)')).toBeInTheDocument();
  });
});
