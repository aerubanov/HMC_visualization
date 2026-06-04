/**
 * Minimal type declarations for the `gifshot` package.
 * Only the API surface used by `useRecording.js` is declared here.
 */
declare module 'gifshot' {
  /** Options accepted by {@link createGIF}. */
  interface GIFOptions {
    /** Array of image data-URLs (PNG) to encode as GIF frames. */
    images: string[];
    /** Width of the output GIF in pixels. */
    gifWidth?: number;
    /** Height of the output GIF in pixels. */
    gifHeight?: number;
    /**
     * Duration of each frame in seconds.
     * e.g. `1 / fps`.
     */
    frameDuration?: number;
    /** Number of web workers to use during encoding. */
    numWorkers?: number;
  }

  /** Result object passed to the {@link createGIF} callback. */
  interface GIFResult {
    /** True when encoding encountered an error. */
    error: boolean;
    /** Data-URL of the encoded GIF (present when `error` is false). */
    image: string;
    /** Human-readable error message (present when `error` is true). */
    errorMsg?: string;
  }

  /**
   * Encode a sequence of images into an animated GIF.
   * @param options - Encoding options including the image array and dimensions.
   * @param callback - Called with a {@link GIFResult} when encoding completes.
   */
  function createGIF(
    options: GIFOptions,
    callback: (result: GIFResult) => void
  ): void;
}
