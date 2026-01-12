/**
 * Collection of pre-defined probability density functions (unnormalized)
 * for demonstration and testing purposes.
 */
export const PREDEFINED_FUNCTIONS = [
  {
    label: 'Gaussian',
    value: 'exp(-(x^2 + y^2)/2)',
  },
  {
    label: 'Bimodal (Asymmetric)',
    value: '0.2 * exp(-((x-2)^2 + y^2)/2) + exp(-((x+2)^2 + y^2)/2)',
  },
  {
    label: 'Multi-modal (5 peaks)',
    value:
      '2*exp(-((x)^2 + (y)^2)) + 2*exp(-((x-4)^2 + (y)^2)) + 2*exp(-((x+4)^2 + (y)^2)) + 2*exp(-((x)^2 + (y-4)^2)) + 2*exp(-((x)^2 + (y+4)^2))',
  },
  {
    label: 'Rosenbrock-ish',
    value: 'exp(-(1-x)^2 - 100*(y-x^2)^2)',
  },
  {
    label: 'Donut',
    value: 'exp(-(sqrt(x^2 + y^2) - 3)^2)/2',
  },
];
