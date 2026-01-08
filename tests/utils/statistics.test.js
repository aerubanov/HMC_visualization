import { describe, it, expect } from 'vitest';
import { calculateGelmanRubin, calculateESS } from '../../src/utils/statistics';

describe('calculateGelmanRubin', () => {
  it('returns null for insufficient chains', () => {
    expect(calculateGelmanRubin([])).toBeNull();
    expect(calculateGelmanRubin([[{ x: 1, y: 1 }]])).toBeNull();
  });

  it('returns null for insufficient samples', () => {
    const chains = [[{ x: 1, y: 1 }], [{ x: 2, y: 2 }]];
    expect(calculateGelmanRubin(chains)).toBeNull();
  });

  it('calculates perfect convergence (identical chains)', () => {
    // If chains are identical, means are identical, so B=0.
    // V_hat = ((n-1)/n)*W.
    // R_hat = sqrt(((n-1)/n)*W / W) = sqrt((n-1)/n)

    const chain1 = Array(10)
      .fill(0)
      .map((_, i) => ({ x: i, y: i }));
    const chain2 = Array(10)
      .fill(0)
      .map((_, i) => ({ x: i, y: i })); // Identical

    const result = calculateGelmanRubin([chain1, chain2]);

    const n = 10;
    const expected = Math.sqrt((n - 1) / n);

    // With identical chains, B=0, so R_hat should be < 1
    expect(result.x).toBeCloseTo(expected);
    expect(result.y).toBeCloseTo(expected);
  });

  it('calculates high R-hat for separated chains', () => {
    // Chain 1 centered at 0, Chain 2 centered at 100
    // Small variance within chains, large variance between
    const n = 10;
    // Variance of constant chain is 0. Wait, s_j^2 = 0?
    // If variance is 0, W=0.
    // If W=0, we handle it. B will be huge.

    const result = calculateGelmanRubin([
      Array(n)
        .fill(0)
        .map(() => ({ x: 0, y: 0 })),
      Array(n)
        .fill(0)
        .map(() => ({ x: 100, y: 100 })),
    ]);
    expect(result.x).toBe(Infinity);
  });

  it('calculates value for simple known case', () => {
    // Chain 1: 0, 2 -> mean=1, var=2
    // Chain 2: 2, 4 -> mean=3, var=2
    // n=2, m=2

    // Overall mean = (1+3)/2 = 2
    // B = (2/1) * [ (1-2)^2 + (3-2)^2 ] = 2 * [1 + 1] = 4

    // W = (2 + 2) / 2 = 2

    // V_hat = (1/2)*2 + (1/2)*4 = 1 + 2 = 3

    // R_hat = sqrt(3 / 2) = sqrt(1.5) approx 1.2247

    // Let's use same for x

    const data = [
      [
        { x: 0, y: 10 },
        { x: 2, y: 12 },
      ],
      [
        { x: 2, y: 10 },
        { x: 4, y: 12 },
      ],
    ];

    const result = calculateGelmanRubin(data);
    expect(result.x).toBeCloseTo(Math.sqrt(1.5));
    expect(result.y).toBeCloseTo(Math.sqrt(0.5));
    // Wait for y: 10, 12 -> mean 11, var 2. 10, 12 -> mean 11, var 2.
    // Identical y stats. B_y = 0. W_y = 2.
    // V_hat_y = 0.5 * 2 + 0 = 1.
    // R_hat_y = sqrt(1/2) = 0.707
    expect(result.y).toBeCloseTo(Math.sqrt(0.5));
  });

  it('handles chains of different lengths', () => {
    const n = 10;
    const chain1 = Array(n)
      .fill(0)
      .map((_, i) => ({ x: i, y: i }));
    // Chain 2 is longer (15 items), but identical in the first 10
    const chain2 = Array(n + 5)
      .fill(0)
      .map((_, i) => ({ x: i, y: i }));

    // Function should use min length (10)
    const result = calculateGelmanRubin([chain1, chain2]);

    // Since first 10 match, it should be treated as identical chains of length 10
    const expected = Math.sqrt((n - 1) / n);
    expect(result.x).toBeCloseTo(expected);
    expect(result.y).toBeCloseTo(expected);
  });
});

describe('calculateESS', () => {
  it('returns null for insufficient chains or samples', () => {
    expect(calculateESS(null)).toBeNull();
    expect(calculateESS([])).toBeNull();
    // Single chain is valid if m=1 is supported, but guide says "m = number of chains (here m = 2)".
    // However proper ESS calc handles m>=1.
    expect(calculateESS([[]])).toBeNull();
  });

  it('calculates ESS for IID samples (ESS approx equal to N)', () => {
    // Generate IID samples
    const n = 1000;
    const chain1 = Array(n)
      .fill(0)
      .map(() => ({ x: Math.random(), y: Math.random() }));
    // Ideally ESS should be close to n for IID
    const result = calculateESS([chain1]);

    // We expect result to be close to n
    // Allow some margin of error for random samples (0.7 * n is safer than 0.8)
    expect(result.x).toBeGreaterThan(n * 0.7);
    expect(result.x).toBeLessThan(n * 1.2);
  });

  it('calculates lower ESS for highly correlated samples', () => {
    // Generate AR(1) process: x_t = 0.9 * x_{t-1} + e_t
    const n = 1000;
    const chain = [];
    let x = 0;
    let y = 0;
    for (let i = 0; i < n; i++) {
      x = 0.9 * x + (Math.random() - 0.5);
      y = 0.9 * y + (Math.random() - 0.5);
      chain.push({ x, y });
    }

    const result = calculateESS([chain]);
    // For AR(1) with rho=0.9, ESS should be roughly n * (1-rho)/(1+rho) = 1000 * 0.1/1.9 approx 52
    expect(result.x).toBeLessThan(200);
    expect(result.y).toBeLessThan(200);
  });

  it('handles multiple chains correctly', () => {
    const n = 500;
    // two independent chains
    const chain1 = Array(n)
      .fill(0)
      .map(() => ({ x: Math.random(), y: Math.random() }));
    const chain2 = Array(n)
      .fill(0)
      .map(() => ({ x: Math.random(), y: Math.random() }));

    const result = calculateESS([chain1, chain2]);
    // Total samples = 1000. ESS should be close to 1000 for IID.
    // Randomness can drop it. 0.7 * 1000 = 700.
    expect(result.x).toBeGreaterThan(700);
  });
});
