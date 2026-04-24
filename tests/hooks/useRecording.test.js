import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock Plotly
vi.mock('plotly.js/dist/plotly', () => ({
  default: {
    toImage: vi.fn(),
  },
}));

// Mock gifshot
vi.mock('gifshot', () => ({
  default: {
    createGIF: vi.fn(),
  },
}));

vi.mock('../../src/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import useRecording from '../../src/hooks/useRecording';
import Plotly from 'plotly.js/dist/plotly';
import gifshot from 'gifshot';
import { logger } from '../../src/utils/logger';

describe('useRecording hook', () => {
  let originalCreateElement;
  let mockAnchor;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock anchor element for download trigger checks
    mockAnchor = { href: '', download: '', click: vi.fn(), style: {} };
    originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return mockAnchor;
      return originalCreateElement(tag);
    });

    // Default Plotly.toImage mock returns a dataURL
    Plotly.toImage.mockResolvedValue('data:image/png;base64,abc');

    // Default gifshot.createGIF mock calls callback with success
    gifshot.createGIF.mockImplementation((_opts, cb) => {
      cb({ error: false, image: 'data:image/gif;base64,gifdata' });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test 1: startRecording sets isRecording to true
  it('startRecording sets isRecording to true', () => {
    const { result } = renderHook(() => useRecording());

    expect(result.current.isRecording).toBe(false);

    act(() => {
      result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
  });

  // Test 2: startRecording clears previous frames
  it('startRecording clears previous frames', async () => {
    const { result } = renderHook(() => useRecording());

    // Start recording first to capture a frame
    act(() => {
      result.current.startRecording();
    });

    const mockDiv = document.createElement('div');
    await act(async () => {
      await result.current.captureFrame(mockDiv);
    });

    // frames should have 1 entry now
    expect(Plotly.toImage).toHaveBeenCalledTimes(1);

    // Start recording again — should clear frames
    act(() => {
      result.current.startRecording();
    });

    // Verify by stopping and checking gifshot is called with empty frames
    act(() => {
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(gifshot.createGIF).toHaveBeenCalledWith(
        expect.objectContaining({ images: [] }),
        expect.any(Function)
      );
    });
  });

  // Test 3: captureFrame is a no-op when not recording
  it('captureFrame is a no-op when not recording', async () => {
    const { result } = renderHook(() => useRecording());

    expect(result.current.isRecording).toBe(false);

    const mockDiv = document.createElement('div');
    await act(async () => {
      await result.current.captureFrame(mockDiv);
    });

    expect(Plotly.toImage).not.toHaveBeenCalled();
  });

  // Test 4: captureFrame appends dataURL when recording
  it('captureFrame appends dataURL when recording', async () => {
    const { result } = renderHook(() => useRecording());

    act(() => {
      result.current.startRecording();
    });

    const mockDiv = document.createElement('div');
    await act(async () => {
      await result.current.captureFrame(mockDiv);
    });

    expect(Plotly.toImage).toHaveBeenCalledTimes(1);
    expect(Plotly.toImage).toHaveBeenCalledWith(mockDiv, {
      format: 'png',
      width: 800,
      height: 600,
    });

    // Stop and verify the frame was included
    act(() => {
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(gifshot.createGIF).toHaveBeenCalledWith(
        expect.objectContaining({ images: ['data:image/png;base64,abc'] }),
        expect.any(Function)
      );
    });
  });

  // Test 5: stopRecording sets isRecording to false
  it('stopRecording sets isRecording to false', async () => {
    const { result } = renderHook(() => useRecording());

    act(() => {
      result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);

    act(() => {
      result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
  });

  // Test 6: stopRecording calls gifshot.createGIF with collected frames
  it('stopRecording calls gifshot.createGIF with collected frames', async () => {
    const { result } = renderHook(() => useRecording());

    act(() => {
      result.current.startRecording();
    });

    const mockDiv = document.createElement('div');
    Plotly.toImage
      .mockResolvedValueOnce('data:image/png;base64,frame1')
      .mockResolvedValueOnce('data:image/png;base64,frame2');

    await act(async () => {
      await result.current.captureFrame(mockDiv);
      await result.current.captureFrame(mockDiv);
    });

    act(() => {
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(gifshot.createGIF).toHaveBeenCalledWith(
        expect.objectContaining({
          images: [
            'data:image/png;base64,frame1',
            'data:image/png;base64,frame2',
          ],
        }),
        expect.any(Function)
      );
    });
  });

  // Test 7: stopRecording triggers download
  it('stopRecording triggers browser download', async () => {
    const { result } = renderHook(() => useRecording());

    act(() => {
      result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    expect(mockAnchor.href).toBe('data:image/gif;base64,gifdata');
    expect(mockAnchor.download).toBe('sampling-recording.gif');
  });

  // Test 8: stopRecording clears frames after encoding
  it('stopRecording clears frames after encoding', async () => {
    const { result } = renderHook(() => useRecording());

    act(() => {
      result.current.startRecording();
    });

    const mockDiv = document.createElement('div');
    await act(async () => {
      await result.current.captureFrame(mockDiv);
    });

    act(() => {
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(gifshot.createGIF).toHaveBeenCalled();
    });

    // After encoding, starting a new recording sees empty frames
    act(() => {
      result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(gifshot.createGIF).toHaveBeenCalledTimes(2);
      const secondCall = gifshot.createGIF.mock.calls[1];
      expect(secondCall[0].images).toEqual([]);
    });
  });

  // Logger tests
  it('startRecording calls logger.info', () => {
    const { result } = renderHook(() => useRecording());

    act(() => {
      result.current.startRecording();
    });

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Recording started')
    );
  });

  it('stopRecording calls logger.info for encoding start', () => {
    const { result } = renderHook(() => useRecording());

    act(() => {
      result.current.startRecording();
    });

    vi.clearAllMocks();

    act(() => {
      result.current.stopRecording();
    });

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('encoding GIF')
    );
  });

  it('gifshot error branch calls logger.error', async () => {
    gifshot.createGIF.mockImplementation((_opts, cb) => {
      cb({ error: true, errorMsg: 'encoding failed' });
    });

    const { result } = renderHook(() => useRecording());

    act(() => {
      result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith(
        'GIF encoding failed',
        expect.objectContaining({ message: 'encoding failed' })
      );
    });
  });

  // Additional: isEncoding is true during encoding, false after
  it('isEncoding transitions correctly during stopRecording', async () => {
    // Make gifshot async — callback fires after a tick
    gifshot.createGIF.mockImplementation((_opts, cb) => {
      setTimeout(
        () => cb({ error: false, image: 'data:image/gif;base64,x' }),
        0
      );
    });

    const { result } = renderHook(() => useRecording());

    act(() => {
      result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    // isEncoding should be true immediately after stopRecording
    expect(result.current.isEncoding).toBe(true);

    // Wait for callback to fire
    await waitFor(() => {
      expect(result.current.isEncoding).toBe(false);
    });
  });
});
