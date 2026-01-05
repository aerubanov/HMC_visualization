import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, test, expect } from 'vitest';
import TracePlots from './TracePlots';

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
    expect(xPlotData[0].y).toEqual([0.1]);

    // Valid trace
    expect(xPlotData[1].name).toBe('Chain 1');
    expect(xPlotData[1].y).toEqual([0.3, 0.5]);
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
});
