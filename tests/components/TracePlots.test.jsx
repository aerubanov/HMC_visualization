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
  const mockChainsSingle = [
    {
      id: 0,
      samplerType: 'HMC',
      samples: [
        { x: 0.1, y: 0.2 },
        { x: 0.3, y: 0.4 },
        { x: 0.5, y: 0.6 },
      ],
      acceptedCount: 100,
      rejectedCount: 50,
    },
  ];

  const mockChainsDual = [
    {
      id: 0,
      samplerType: 'HMC',
      samples: [
        { x: 0.1, y: 0.2 },
        { x: 0.3, y: 0.4 },
        { x: 0.5, y: 0.6 },
      ],
      acceptedCount: 100,
      rejectedCount: 50,
    },
    {
      id: 1,
      samplerType: 'GIBBS',
      samples: [
        { x: 1.1, y: 1.2 },
        { x: 1.3, y: 1.4 },
      ],
      acceptedCount: 80,
      rejectedCount: 70,
    },
  ];

  test('renders without crashing', () => {
    render(<TracePlots chains={mockChainsSingle} iterationCount={150} />);
    expect(screen.getByText('X Trace')).toBeInTheDocument();
    expect(screen.getByText('Y Trace')).toBeInTheDocument();
  });

  test('renders two Plotly plots', () => {
    render(<TracePlots chains={mockChainsSingle} iterationCount={150} />);
    const plots = screen.getAllByTestId('plotly-plot');
    expect(plots).toHaveLength(2);
  });

  test('passes correct data to Plotly for simple case', () => {
    render(<TracePlots chains={mockChainsSingle} iterationCount={150} />);
    const plots = screen.getAllByTestId('plotly-plot');

    const xPlotData = JSON.parse(
      plots[0].querySelector('[data-testid="plot-data"]').textContent
    );
    expect(xPlotData).toHaveLength(1);
    expect(xPlotData[0].y).toEqual([0.1, 0.3, 0.5]);
    expect(xPlotData[0].name).toBe('Chain 1 (HMC)');

    const yPlotData = JSON.parse(
      plots[1].querySelector('[data-testid="plot-data"]').textContent
    );
    expect(yPlotData).toHaveLength(1);
    expect(yPlotData[0].y).toEqual([0.2, 0.4, 0.6]);
    expect(yPlotData[0].name).toBe('Chain 1 (HMC)');
  });

  test('handles burn-in correctly', () => {
    const burnIn = 1;

    render(
      <TracePlots
        chains={mockChainsSingle}
        burnIn={burnIn}
        iterationCount={150}
      />
    );
    const plots = screen.getAllByTestId('plotly-plot');

    const xPlotData = JSON.parse(
      plots[0].querySelector('[data-testid="plot-data"]').textContent
    );

    expect(xPlotData).toHaveLength(2);

    expect(xPlotData[0].name).toBe('Chain 1 (HMC) (Burn-in)');
    expect(xPlotData[0].y).toEqual([0.1, 0.3]);
    expect(xPlotData[0].line.color).toMatch(/^rgba\(\d+, \d+, \d+, 0\.3\)$/);

    expect(xPlotData[1].name).toBe('Chain 1 (HMC)');
    expect(xPlotData[1].y).toEqual([0.3, 0.5]);
    expect(xPlotData[1].line.color).toBe('#d73a49');
  });

  test('handles second chain correctly', () => {
    render(<TracePlots chains={mockChainsDual} iterationCount={150} />);
    const plots = screen.getAllByTestId('plotly-plot');

    const xPlotData = JSON.parse(
      plots[0].querySelector('[data-testid="plot-data"]').textContent
    );

    expect(xPlotData).toHaveLength(2);
    expect(xPlotData[0].name).toBe('Chain 1 (HMC)');
    expect(xPlotData[1].name).toBe('Chain 2 (GIBBS)');
    expect(xPlotData[1].y).toEqual([1.1, 1.3]);
  });

  test('handles chains of different lengths correctly', () => {
    const chainsDiffLen = [
      {
        id: 0,
        samplerType: 'HMC',
        samples: [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
          { x: 3, y: 3 },
          { x: 4, y: 4 },
        ],
        acceptedCount: 4,
        rejectedCount: 0,
      },
      {
        id: 1,
        samplerType: 'GIBBS',
        samples: [
          { x: 10, y: 10 },
          { x: 20, y: 20 },
        ],
        acceptedCount: 2,
        rejectedCount: 0,
      },
    ];

    render(<TracePlots chains={chainsDiffLen} burnIn={0} iterationCount={4} />);
    const plots = screen.getAllByTestId('plotly-plot');
    const xPlotData = JSON.parse(
      plots[0].querySelector('[data-testid="plot-data"]').textContent
    );

    expect(xPlotData).toHaveLength(2);
    expect(xPlotData[0].name).toBe('Chain 1 (HMC)');
    expect(xPlotData[0].x).toEqual([0, 1, 2, 3]);
    expect(xPlotData[0].y).toEqual([1, 2, 3, 4]);

    expect(xPlotData[1].name).toBe('Chain 2 (GIBBS)');
    expect(xPlotData[1].x).toEqual([0, 1]);
    expect(xPlotData[1].y).toEqual([10, 20]);
  });

  test('displays R-hat values when provided', () => {
    const rHat = { x: 1.05, y: 1.1 };

    render(
      <TracePlots chains={mockChainsDual} rHat={rHat} iterationCount={150} />
    );

    expect(screen.getByText('(R̂ = 1.05)')).toBeInTheDocument();
    expect(screen.getByText('(R̂ = 1.10)')).toBeInTheDocument();
  });

  test('displays infinity symbol for infinite R-hat', () => {
    const rHat = { x: Infinity, y: Infinity };

    render(
      <TracePlots chains={mockChainsDual} rHat={rHat} iterationCount={150} />
    );

    expect(screen.getAllByText('(R̂ = ∞)')).toHaveLength(2);
  });

  test('does not display R-hat values when null', () => {
    render(
      <TracePlots chains={mockChainsSingle} rHat={null} iterationCount={150} />
    );

    expect(screen.getByText('X Trace')).toBeInTheDocument();
    expect(screen.queryByText(/R̂/)).not.toBeInTheDocument();
  });

  test('displays ESS values when provided', () => {
    const rHat = { x: 1.1, y: 1.1 };
    const ess = { x: 100, y: 200 };

    render(
      <TracePlots
        chains={mockChainsDual}
        rHat={rHat}
        ess={ess}
        iterationCount={150}
      />
    );

    expect(screen.getByText('(ESS = 100)')).toBeInTheDocument();
    expect(screen.getByText('(ESS = 200)')).toBeInTheDocument();
  });

  test('displays acceptance and rejection counts for single chain', () => {
    render(<TracePlots chains={mockChainsSingle} iterationCount={150} />);

    expect(screen.getByText(/Acc: 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Rej: 50/i)).toBeInTheDocument();
  });

  test('displays acceptance and rejection counts for second chain', () => {
    render(<TracePlots chains={mockChainsDual} iterationCount={150} />);

    expect(screen.getByText(/Acc: 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Acc: 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Rej: 70/i)).toBeInTheDocument();
  });

  // Test case 9: Trace label includes sampler type
  test('trace label includes sampler type for each chain', () => {
    render(<TracePlots chains={mockChainsDual} iterationCount={150} />);
    const plots = screen.getAllByTestId('plotly-plot');

    const xPlotData = JSON.parse(
      plots[0].querySelector('[data-testid="plot-data"]').textContent
    );

    expect(xPlotData[0].name).toContain('HMC');
    expect(xPlotData[1].name).toContain('GIBBS');
  });

  // Test case 19: Fix mock chain shape — acceptedCount field used for rate
  test('mock chain shape uses acceptedCount and rejectedCount fields', () => {
    const chains = [
      {
        id: 0,
        samples: [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
          { x: 3, y: 3 },
        ],
        acceptedCount: 8,
        rejectedCount: 2,
      },
    ];

    render(<TracePlots chains={chains} />);
    // Acc displays samples.length (3), Rej from rejectedCount (2)
    expect(screen.getByText(/Acc: 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Rej: 2/i)).toBeInTheDocument();
  });

  // Test case 20: Acceptance rate uses acceptedCount
  test('acceptance rate uses acceptedCount field — 8 accepted / 10 total = 80.0%', () => {
    const chains = [
      {
        id: 0,
        samples: [],
        acceptedCount: 8,
        rejectedCount: 2,
      },
    ];

    render(<TracePlots chains={chains} />);
    expect(screen.getByText(/Rate: 80\.0%/i)).toBeInTheDocument();
  });

  test('displays per-chain ESS from essPerChain when provided', () => {
    const essPerChain = [
      { chainId: 0, ess: { x: 42, y: 37 } },
      { chainId: 1, ess: { x: 55, y: 61 } },
    ];

    render(
      <TracePlots
        chains={mockChainsDual}
        burnIn={0}
        essPerChain={essPerChain}
      />
    );

    // Per-chain ESS should appear in X Trace and Y Trace headers
    expect(screen.getAllByText(/ESS=42/)).toHaveLength(1);
    expect(screen.getAllByText(/ESS=37/)).toHaveLength(1);
    expect(screen.getAllByText(/ESS=55/)).toHaveLength(1);
    expect(screen.getAllByText(/ESS=61/)).toHaveLength(1);
  });

  test('shows aggregate ESS from ess prop when essPerChain is absent', () => {
    const ess = { x: 150, y: 175 };

    render(<TracePlots chains={mockChainsSingle} burnIn={0} ess={ess} />);

    expect(screen.getByText('(ESS = 150)')).toBeInTheDocument();
    expect(screen.getByText('(ESS = 175)')).toBeInTheDocument();
    // No per-chain ESS format
    expect(screen.queryByText(/ESS=/)).not.toBeInTheDocument();
  });

  test('renders fallback "Chain <id>" label when essPerChain chainId is not in chains', () => {
    // chains has id 0 only; essPerChain references id 99 which does not exist
    const essPerChain = [{ chainId: 99, ess: { x: 50, y: 45 } }];

    render(
      <TracePlots
        chains={mockChainsSingle}
        burnIn={0}
        essPerChain={essPerChain}
      />
    );

    // Fallback label "Chain 99" should appear (no samplerType lookup possible)
    expect(screen.getAllByText(/Chain 99/)).toHaveLength(2); // once in X Trace, once in Y Trace
  });

  // Test case 21: Zero-division guard
  test('acceptance rate shows 0.0% when both acceptedCount and rejectedCount are 0', () => {
    const chains = [
      {
        id: 0,
        samples: [],
        acceptedCount: 0,
        rejectedCount: 0,
      },
    ];

    render(<TracePlots chains={chains} />);
    expect(screen.getByText(/Rate: 0\.0%/i)).toBeInTheDocument();
  });
});
