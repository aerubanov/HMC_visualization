import { useState, useRef } from 'react';
import Plotly from 'plotly.js/dist/plotly';
import gifshot from 'gifshot';
import { logger } from '../utils/logger';

/** Frames-per-second for the exported GIF. */
const GIF_FPS = 5;

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
    logger.info('Recording started');
  };

  /**
   * Captures a single frame from the Plotly graph DOM node.
   * No-op when not recording.
   * @param {HTMLElement} graphDiv - The Plotly graph DOM node.
   */
  const captureFrame = async (graphDiv) => {
    if (!isRecording) return;
    try {
      const dataUrl = await Plotly.toImage(graphDiv, {
        format: 'png',
        width: CAPTURE_WIDTH,
        height: CAPTURE_HEIGHT,
      });
      framesRef.current.push(dataUrl);
    } catch (e) {
      logger.warn('Frame capture failed', { message: e.message });
    }
  };

  /**
   * Stops recording, encodes collected frames as a GIF, and triggers download.
   */
  const stopRecording = () => {
    setIsRecording(false);
    setIsEncoding(true);
    logger.info('Recording stopped — encoding GIF');
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
        } else {
          logger.error('GIF encoding failed', { message: obj.errorMsg });
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
