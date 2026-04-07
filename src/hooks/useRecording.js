import { useState, useRef } from 'react';
import Plotly from 'plotly.js';
import gifshot from 'gifshot';

/** Frames-per-second for the exported GIF. */
const GIF_FPS = 10;

/** Dimensions for captured frames. */
const CAPTURE_WIDTH = 800;
const CAPTURE_HEIGHT = 600;

/** Filename for the downloaded GIF. */
const GIF_FILENAME = 'sampling-recording.gif';

/**
 * Custom hook that owns all recording state and logic.
 *
 * @returns {{
 *   isRecording: boolean,
 *   isEncoding: boolean,
 *   startRecording: () => void,
 *   stopRecording: () => void,
 *   captureFrame: (graphDiv: HTMLElement) => Promise<void>
 * }}
 */
function useRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isEncoding, setIsEncoding] = useState(false);
  const framesRef = useRef([]);

  /** Clears accumulated frames and begins recording. */
  const startRecording = () => {
    framesRef.current = [];
    setIsRecording(true);
  };

  /**
   * Captures a single frame from the Plotly graph DOM node.
   * No-op when not recording.
   * @param {HTMLElement} graphDiv - The Plotly graph DOM node.
   */
  const captureFrame = async (graphDiv) => {
    if (!isRecording) return;
    const dataUrl = await Plotly.toImage(graphDiv, {
      format: 'png',
      width: CAPTURE_WIDTH,
      height: CAPTURE_HEIGHT,
    });
    framesRef.current.push(dataUrl);
  };

  /**
   * Stops recording, encodes collected frames as a GIF, and triggers download.
   */
  const stopRecording = () => {
    setIsRecording(false);
    setIsEncoding(true);
    const frames = framesRef.current.slice();

    gifshot.createGIF(
      {
        images: frames,
        gifWidth: CAPTURE_WIDTH,
        gifHeight: CAPTURE_HEIGHT,
        frameDuration: 1 / GIF_FPS,
        numWorkers: 2,
      },
      (obj) => {
        if (!obj.error) {
          const a = document.createElement('a');
          a.href = obj.image;
          a.download = GIF_FILENAME;
          a.click();
        }
        framesRef.current = [];
        setIsEncoding(false);
      }
    );
  };

  return {
    isRecording,
    isEncoding,
    startRecording,
    stopRecording,
    captureFrame,
  };
}

export default useRecording;
