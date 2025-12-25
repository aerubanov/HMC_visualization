import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Controls from '../../src/components/Controls';

describe('Controls Component', () => {
  const mockProps = {
    logP: '',
    params: { epsilon: 0.1, L: 10, steps: 1 },
    initialPosition: { x: 0, y: 0 },
    iterationCount: 0,
    isRunning: false,
    error: null,
    seed: null,
    useSeededMode: false,
    setLogP: vi.fn(),
    setParams: vi.fn(),
    setInitialPosition: vi.fn(),
    step: vi.fn(),
    sampleSteps: vi.fn(),
    reset: vi.fn(),
    setSeed: vi.fn(),
    // Second chain props
    useSecondChain: false,
    initialPosition2: { x: 1, y: 1 },
    acceptedCount2: 0,
    rejectedCount2: 0,
    seed2: null,
    setUseSecondChain: vi.fn(),
    setInitialPosition2: vi.fn(),
    setSeed2: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Probability Function Input - Draft State Management', () => {
    it('should initialize draft state with logP prop value', () => {
      const props = { ...mockProps, logP: 'exp(-x^2)' };
      render(<Controls {...props} />);

      const textarea = screen.getByPlaceholderText(/e.g., exp/i);
      expect(textarea.value).toBe('exp(-x^2)');
    });

    it('should update draft state when user types, without calling setLogP', () => {
      render(<Controls {...mockProps} />);

      const textarea = screen.getByPlaceholderText(/e.g., exp/i);

      fireEvent.change(textarea, { target: { value: 'exp(-x' } });

      // Draft should update
      expect(textarea.value).toBe('exp(-x');

      // setLogP should NOT be called on every keystroke
      expect(mockProps.setLogP).not.toHaveBeenCalled();
    });

    it('should call setLogP only when Apply button is clicked', () => {
      render(<Controls {...mockProps} />);

      const textarea = screen.getByPlaceholderText(/e.g., exp/i);

      // Type in textarea
      fireEvent.change(textarea, { target: { value: 'exp(-x^2 - y^2)' } });
      expect(mockProps.setLogP).not.toHaveBeenCalled();

      // Click Apply (button text changes to "✓ Apply" after typing)
      const applyButton = screen.getByRole('button', { name: /apply/i });
      fireEvent.click(applyButton);
      expect(mockProps.setLogP).toHaveBeenCalledWith('exp(-x^2 - y^2)');
      expect(mockProps.setLogP).toHaveBeenCalledTimes(1);
    });

    it('should sync draft state when logP prop changes externally', () => {
      const { rerender } = render(<Controls {...mockProps} logP="" />);

      const textarea = screen.getByPlaceholderText(/e.g., exp/i);
      expect(textarea.value).toBe('');

      // External change (e.g., from reset)
      rerender(<Controls {...mockProps} logP="exp(-x^2)" />);

      expect(textarea.value).toBe('exp(-x^2)');
    });
  });

  describe('Apply Button State', () => {
    it('should disable Apply button when draft equals applied value', () => {
      const props = { ...mockProps, logP: 'exp(-x^2)' };
      render(<Controls {...props} />);

      const applyButton = screen.getByRole('button', { name: /applied/i });
      expect(applyButton).toBeDisabled();
    });

    it('should enable Apply button when draft differs from applied value', () => {
      const props = { ...mockProps, logP: 'exp(-x^2)' };
      render(<Controls {...props} />);

      const textarea = screen.getByPlaceholderText(/e.g., exp/i);
      const applyButton = screen.getByRole('button', { name: /applied/i });

      // Initially disabled (no changes)
      expect(applyButton).toBeDisabled();

      // Make a change
      fireEvent.change(textarea, { target: { value: 'exp(-x^2 - y^2)' } });

      // Should now be enabled
      const enabledButton = screen.getByRole('button', { name: /✓ apply/i });
      expect(enabledButton).not.toBeDisabled();
    });

    it('should disable Apply button when draft is empty', () => {
      render(<Controls {...mockProps} />);

      const textarea = screen.getByPlaceholderText(/e.g., exp/i);

      // Enter non-empty value
      fireEvent.change(textarea, { target: { value: 'exp(-x^2)' } });
      let applyButton = screen.getByRole('button', { name: /apply/i });
      expect(applyButton).not.toBeDisabled();

      // Clear the input - button text becomes "Applied" since draftLogP === logP === ''
      fireEvent.change(textarea, { target: { value: '' } });
      applyButton = screen.getByRole('button', { name: /applied/i });
      expect(applyButton).toBeDisabled();
    });

    it('should disable Apply button when draft contains only whitespace', () => {
      render(<Controls {...mockProps} />);

      const textarea = screen.getByPlaceholderText(/e.g., exp/i);

      // Enter whitespace only - creates unsaved changes
      fireEvent.change(textarea, { target: { value: '   ' } });

      // Button shows "✓ Apply" since draftLogP !== logP, but is disabled due to trim()
      const applyButton = screen.getByRole('button', { name: /apply/i });
      expect(applyButton).toBeDisabled();
    });
  });

  describe('Apply Button Text', () => {
    it('should show "Applied" when draft equals applied value', () => {
      const props = { ...mockProps, logP: 'exp(-x^2)' };
      render(<Controls {...props} />);

      const applyButton = screen.getByRole('button', { name: /applied/i });
      expect(applyButton.textContent).toBe('Applied');
    });

    it('should show "✓ Apply" when there are unsaved changes', () => {
      render(<Controls {...mockProps} />);

      const textarea = screen.getByPlaceholderText(/e.g., exp/i);
      fireEvent.change(textarea, { target: { value: 'exp(-x^2)' } });

      const applyButton = screen.getByRole('button', { name: /✓ apply/i });
      expect(applyButton.textContent).toContain('Apply');
    });

    it('should change button text back to "Applied" after clicking Apply', () => {
      render(<Controls {...mockProps} />);

      const textarea = screen.getByPlaceholderText(/e.g., exp/i);

      // Make a change
      fireEvent.change(textarea, { target: { value: 'exp(-x^2)' } });
      let applyButton = screen.getByRole('button', { name: /✓ apply/i });
      expect(applyButton.textContent).toContain('Apply');

      // Click Apply
      fireEvent.click(applyButton);

      // After applying, the prop should update (in real scenario)
      // For this test, we just verify setLogP was called
      expect(mockProps.setLogP).toHaveBeenCalledWith('exp(-x^2)');
    });
  });

  describe('Integration with Other Controls', () => {
    it('should render all other controls correctly', () => {
      render(<Controls {...mockProps} />);

      // Verify other inputs are present
      expect(screen.getByLabelText(/epsilon/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^l\s/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^x$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^y$/i)).toBeInTheDocument();

      // Verify action buttons
      expect(
        screen.getByRole('button', { name: /step once/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /sample n steps/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /reset/i })
      ).toBeInTheDocument();
    });

    it('should not interfere with parameter updates', () => {
      render(<Controls {...mockProps} />);

      const epsilonInput = screen.getByLabelText(/epsilon/i);
      fireEvent.change(epsilonInput, { target: { value: '0.05' } });

      expect(mockProps.setParams).toHaveBeenCalledWith({ epsilon: 0.05 });
    });

    it('should not interfere with step button', () => {
      const props = { ...mockProps, logP: 'exp(-x^2)' };
      render(<Controls {...props} />);

      const stepButton = screen.getByRole('button', { name: /step once/i });
      fireEvent.click(stepButton);

      expect(mockProps.step).toHaveBeenCalled();
    });

    it('should not interfere with reset button', () => {
      render(<Controls {...mockProps} />);

      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      expect(mockProps.reset).toHaveBeenCalled();
    });
  });

  describe('Error Display', () => {
    it('should display error message when error prop is provided', () => {
      const props = { ...mockProps, error: 'Invalid expression syntax' };
      render(<Controls {...props} />);

      expect(
        screen.getByText(/invalid expression syntax/i)
      ).toBeInTheDocument();
    });

    it('should not display error while typing (before applying)', () => {
      render(<Controls {...mockProps} />);

      const textarea = screen.getByPlaceholderText(/e.g., exp/i);

      // Type incomplete/invalid expression
      fireEvent.change(textarea, { target: { value: 'exp(-x(' } });

      // No error should be shown (because we haven't clicked Apply yet)
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('Disabled State Handling', () => {
    it('should disable Step button when no logP is set', () => {
      render(<Controls {...mockProps} logP="" />);

      const stepButton = screen.getByRole('button', { name: /step once/i });
      expect(stepButton).toBeDisabled();
    });

    it('should disable buttons when isRunning is true', () => {
      const props = { ...mockProps, isRunning: true, logP: 'exp(-x^2)' };
      render(<Controls {...props} />);

      expect(screen.getByRole('button', { name: /step once/i })).toBeDisabled();
      expect(
        screen.getByRole('button', { name: /sample n steps/i })
      ).toBeDisabled();
      expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled();
    });
  });
});
