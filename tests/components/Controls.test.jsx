import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Controls from '../../src/components/Controls';

describe('Controls Component', () => {
  const mockProps = {
    logP: '',
    chains: [
      {
        id: 0,
        samplerType: 'HMC',
        params: { epsilon: 0.1, L: 10, steps: 1 },
        initialPosition: { x: 0, y: 0 },
        seed: null,
      },
    ],
    iterationCount: 0,
    isRunning: false,
    error: null,
    setLogP: vi.fn(),
    setChainConfig: vi.fn(),
    addChain: vi.fn(),
    removeChain: vi.fn(),
    step: vi.fn(),
    sampleSteps: vi.fn(),
    reset: vi.fn(),
    burnIn: 10,
    setBurnIn: vi.fn(),
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

  describe('Pre-defined Functions Selection', () => {
    it('should update draft state when a pre-defined function is selected', () => {
      render(<Controls {...mockProps} />);

      // Find by combobox role or label
      const select = screen.getByLabelText(/pre-defined/i);

      // Select Gaussian
      fireEvent.change(select, { target: { value: 'exp(-(x^2 + y^2)/2)' } });

      const textarea = screen.getByPlaceholderText(/e.g., exp/i);
      expect(textarea.value).toBe('exp(-(x^2 + y^2)/2)');
    });

    it('should enable Apply button after selecting a pre-defined function', () => {
      render(<Controls {...mockProps} />);

      const select = screen.getByLabelText(/pre-defined/i);
      fireEvent.change(select, { target: { value: 'exp(-(x^2 + y^2)/2)' } });

      const applyButton = screen.getByRole('button', { name: /✓ apply/i });
      expect(applyButton).not.toBeDisabled();
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

      expect(mockProps.setChainConfig).toHaveBeenCalledWith(0, {
        params: { ...mockProps.chains[0].params, epsilon: 0.05 },
      });
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

  describe('Burn-in Parameter Input', () => {
    it('should render burn-in input with correct initial value', () => {
      const props = { ...mockProps, burnIn: 10, setBurnIn: vi.fn() };
      render(<Controls {...props} />);

      const burnInInput = screen.getByLabelText(/burn-in samples/i);
      expect(burnInInput).toBeInTheDocument();
      expect(burnInInput.value).toBe('10');
    });

    it('should call setBurnIn when burn-in value changes', () => {
      const setBurnIn = vi.fn();
      const props = { ...mockProps, burnIn: 10, setBurnIn };
      render(<Controls {...props} />);

      const burnInInput = screen.getByLabelText(/burn-in samples/i);
      fireEvent.change(burnInInput, { target: { value: '15' } });

      expect(setBurnIn).toHaveBeenCalledWith(15);
    });

    it('should have correct input attributes for validation', () => {
      const props = { ...mockProps, burnIn: 10, setBurnIn: vi.fn() };
      render(<Controls {...props} />);

      const burnInInput = screen.getByLabelText(/burn-in samples/i);
      expect(burnInInput).toHaveAttribute('type', 'number');
      expect(burnInInput).toHaveAttribute('min', '0');
      expect(burnInInput).toHaveAttribute('step', '1');
    });

    it('should sync local state when burnIn prop changes', () => {
      const props = { ...mockProps, burnIn: 10, setBurnIn: vi.fn() };
      const { rerender } = render(<Controls {...props} />);

      const burnInInput = screen.getByLabelText(/burn-in samples/i);
      expect(burnInInput.value).toBe('10');

      // External change (e.g., from hook state update)
      rerender(<Controls {...props} burnIn={20} />);

      expect(burnInInput.value).toBe('20');
    });

    it('should not call setBurnIn with invalid values', () => {
      const setBurnIn = vi.fn();
      const props = { ...mockProps, burnIn: 10, setBurnIn };
      render(<Controls {...props} />);

      const burnInInput = screen.getByLabelText(/burn-in samples/i);

      // Try to set non-numeric value
      fireEvent.change(burnInInput, { target: { value: 'abc' } });

      // setBurnIn should not be called with NaN
      expect(setBurnIn).not.toHaveBeenCalled();
    });
  });
  describe('Fast Sampling Mode Controls', () => {
    it('should render fast mode checkbox', () => {
      render(<Controls {...mockProps} />);
      const fastModeCheckbox = screen.getByLabelText(/fast sampling mode/i);
      expect(fastModeCheckbox).toBeInTheDocument();
      expect(fastModeCheckbox).not.toBeChecked();
    });

    it('should call setUseFastMode when toggled', () => {
      const setUseFastMode = vi.fn();
      const props = { ...mockProps, setUseFastMode };
      render(<Controls {...props} />);

      const fastModeCheckbox = screen.getByLabelText(/fast sampling mode/i);
      fireEvent.click(fastModeCheckbox);

      expect(setUseFastMode).toHaveBeenCalledWith(true);
    });

    it('should disable "Step Once" button when fast mode is enabled', () => {
      const props = { ...mockProps, useFastMode: true, logP: 'exp(-x^2)' };
      render(<Controls {...props} />);

      const stepButton = screen.getByRole('button', { name: /step once/i });
      expect(stepButton).toBeDisabled();
    });

    it('should show running indicator with fast mode message', () => {
      const props = { ...mockProps, isRunning: true, useFastMode: true };
      render(<Controls {...props} />);

      expect(screen.getByText(/generating samples/i)).toBeInTheDocument();
    });
  });

  describe('Chain Management UI', () => {
    it('should not render "Enable Second Chain" checkbox', () => {
      render(<Controls {...mockProps} />);
      expect(
        screen.queryByLabelText(/enable second chain/i)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/enable second chain/i)
      ).not.toBeInTheDocument();
    });

    it('should render "Add another chain" button', () => {
      render(<Controls {...mockProps} />);
      expect(
        screen.getByRole('button', { name: /add another chain/i })
      ).toBeInTheDocument();
    });

    it('clicking "Add another chain" calls addChain', () => {
      render(<Controls {...mockProps} />);
      const addBtn = screen.getByRole('button', { name: /add another chain/i });
      fireEvent.click(addBtn);
      expect(mockProps.addChain).toHaveBeenCalledTimes(1);
    });

    it('should not render a Remove button when only one chain is present', () => {
      render(<Controls {...mockProps} />);
      expect(
        screen.queryByRole('button', { name: /^remove$/i })
      ).not.toBeInTheDocument();
    });

    it('should render a Remove button on the second chain but not the first', () => {
      const twoChains = [
        {
          id: 0,
          samplerType: 'HMC',
          params: { epsilon: 0.1, L: 10, steps: 1 },
          initialPosition: { x: 0, y: 0 },
          seed: null,
        },
        {
          id: 1,
          samplerType: 'HMC',
          params: { epsilon: 0.1, L: 10, steps: 1 },
          initialPosition: { x: 1, y: 1 },
          seed: null,
        },
      ];
      render(<Controls {...mockProps} chains={twoChains} />);
      const removeButtons = screen.getAllByRole('button', {
        name: /^remove$/i,
      });
      expect(removeButtons).toHaveLength(1);
    });

    it('clicking Remove calls removeChain with the correct chain id', () => {
      const twoChains = [
        {
          id: 0,
          samplerType: 'HMC',
          params: { epsilon: 0.1, L: 10, steps: 1 },
          initialPosition: { x: 0, y: 0 },
          seed: null,
        },
        {
          id: 1,
          samplerType: 'HMC',
          params: { epsilon: 0.1, L: 10, steps: 1 },
          initialPosition: { x: 1, y: 1 },
          seed: null,
        },
      ];
      render(<Controls {...mockProps} chains={twoChains} />);
      const removeBtn = screen.getByRole('button', { name: /^remove$/i });
      fireEvent.click(removeBtn);
      expect(mockProps.removeChain).toHaveBeenCalledWith(1);
    });
  });

  describe('Sampler Selection', () => {
    it('should show correct parameters for HMC', () => {
      render(<Controls {...mockProps} samplerType="HMC" />);
      expect(screen.getByLabelText(/epsilon/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^l\s/i)).toBeInTheDocument();
    });

    it('should show Slice Width for Gibbs sampler', () => {
      const gibbsChains = [
        {
          ...mockProps.chains[0],
          samplerType: 'GIBBS',
          params: { w: 1.0 },
        },
      ];
      render(<Controls {...mockProps} chains={gibbsChains} />);
      expect(screen.queryByLabelText(/epsilon/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/^l\s/i)).not.toBeInTheDocument();

      const widthInput = screen.getByLabelText(/slice width/i);
      expect(widthInput).toBeInTheDocument();
      expect(widthInput.value).toBe('1');

      fireEvent.change(widthInput, { target: { value: '2.5' } });
      expect(mockProps.setChainConfig).toHaveBeenCalledWith(0, {
        params: { ...gibbsChains[0].params, w: 2.5 },
      });
    });

    it('should call setSamplerType when selection changes', () => {
      render(<Controls {...mockProps} />);
      const select = screen.getByLabelText(/sampler type/i);
      fireEvent.change(select, { target: { value: 'GIBBS' } });
      expect(mockProps.setChainConfig).toHaveBeenCalledWith(0, {
        samplerType: 'GIBBS',
      });
    });
  });

  describe('Recording Controls', () => {
    const recordingProps = {
      ...mockProps,
      isRecording: false,
      isEncoding: false,
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
    };

    // Test 11: Record button renders "Start Recording" when not recording
    it('should render "Start Recording" button when not recording', () => {
      render(<Controls {...recordingProps} isRecording={false} />);
      expect(
        screen.getByRole('button', { name: /start recording/i })
      ).toBeInTheDocument();
    });

    // Test 12: Record button renders "Stop Recording" when recording
    it('should render "Stop Recording" button when recording', () => {
      render(<Controls {...recordingProps} isRecording={true} />);
      expect(
        screen.getByRole('button', { name: /stop recording/i })
      ).toBeInTheDocument();
    });

    // Test 13: Clicking record button calls startRecording
    it('clicking record button calls startRecording when not recording', () => {
      const startRecording = vi.fn();
      render(
        <Controls
          {...recordingProps}
          isRecording={false}
          startRecording={startRecording}
        />
      );
      const btn = screen.getByRole('button', { name: /start recording/i });
      fireEvent.click(btn);
      expect(startRecording).toHaveBeenCalledTimes(1);
    });

    // Test 14: Clicking record button calls stopRecording
    it('clicking record button calls stopRecording when recording', () => {
      const stopRecording = vi.fn();
      render(
        <Controls
          {...recordingProps}
          isRecording={true}
          stopRecording={stopRecording}
        />
      );
      const btn = screen.getByRole('button', { name: /stop recording/i });
      fireEvent.click(btn);
      expect(stopRecording).toHaveBeenCalledTimes(1);
    });

    // Test 15: Record button is disabled in fast mode
    it('record button is disabled when useFastMode is true', () => {
      render(
        <Controls {...recordingProps} useFastMode={true} isRecording={false} />
      );
      const btn = screen.getByRole('button', { name: /start recording/i });
      expect(btn).toBeDisabled();
    });

    it('record button shows "Encoding..." when isEncoding is true', () => {
      render(<Controls {...recordingProps} isEncoding={true} />);
      expect(
        screen.getByRole('button', { name: /encoding/i })
      ).toBeInTheDocument();
    });

    it('shows "Recording..." indicator text when isRecording is true', () => {
      render(<Controls {...recordingProps} isRecording={true} />);
      expect(screen.getByText(/recording\.\.\./i)).toBeInTheDocument();
    });
  });

  describe('Stop Sampling Button', () => {
    const stopSamplingProps = {
      ...mockProps,
      stopSampling: vi.fn(),
      isRecording: false,
      isEncoding: false,
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
    };

    it('should render "Stop Sampling" button when isRunning=true and useFastMode=false', () => {
      render(
        <Controls
          {...stopSamplingProps}
          isRunning={true}
          useFastMode={false}
          logP="exp(-x^2)"
        />
      );
      expect(
        screen.getByRole('button', { name: /stop sampling/i })
      ).toBeInTheDocument();
    });

    it('should NOT render "Stop Sampling" button when isRunning=false', () => {
      render(
        <Controls
          {...stopSamplingProps}
          isRunning={false}
          useFastMode={false}
        />
      );
      expect(
        screen.queryByRole('button', { name: /stop sampling/i })
      ).not.toBeInTheDocument();
    });

    it('should NOT render "Stop Sampling" button when isRunning=true and useFastMode=true', () => {
      render(
        <Controls
          {...stopSamplingProps}
          isRunning={true}
          useFastMode={true}
          logP="exp(-x^2)"
        />
      );
      expect(
        screen.queryByRole('button', { name: /stop sampling/i })
      ).not.toBeInTheDocument();
    });

    it('clicking "Stop Sampling" button calls stopSampling prop', () => {
      const stopSampling = vi.fn();
      render(
        <Controls
          {...stopSamplingProps}
          isRunning={true}
          useFastMode={false}
          logP="exp(-x^2)"
          stopSampling={stopSampling}
        />
      );
      const btn = screen.getByRole('button', { name: /stop sampling/i });
      fireEvent.click(btn);
      expect(stopSampling).toHaveBeenCalledTimes(1);
    });
  });
});
