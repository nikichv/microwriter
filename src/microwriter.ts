interface MicrowriterOptions {
  /** An HTML element to write into */
  target: HTMLElement;

  /** An array of strings to type */
  lines: string[];

  /** A speed in milliseconds between typing new characters */
  writeSpeed: number;

  /** A speed in milliseconds between deletion of already typed characters */
  deleteSpeed?: number;

  /** A delay between before typing the line */
  writeLineDelay?: number;

  /** A delay between before deleting the line */
  deleteLineDelay?: number;

  /** Run in infinite loop */
  loop?: boolean;

  /** Preserve line text instead of deletion */
  preserve?: boolean;
}

interface MicrowriterInstance {
  /** Start timer */
  start(): void;

  /** Stop timer */
  pause(): void;

  /** Replace lines and restart timer */
  replaceLines(lines: string[]): void;
}

const DEFAULT_WRITE_SPEED = 200;

export default function microwriter(options: MicrowriterOptions): MicrowriterInstance {
  /** An HTML element to write into */
  const target: HTMLElement = options.target;

  /** An array of strings to type */
  let lines = options.lines;

  /** A delay in milliseconds between typing new characters */
  const writeSpeed = options.writeSpeed || DEFAULT_WRITE_SPEED;

  /** A delay in milliseconds between deletion of already typed characters */
  const deleteSpeed = options.deleteSpeed || writeSpeed;

  /** A delay between before typing the line */
  const writeLineDelay = options.writeLineDelay || 0;

  /** A delay between before deleting the line */
  const deleteLineDelay = options.deleteLineDelay || 0;

  /** Run in infinite loop */
  const loop = options.loop;

  /** Preserve line text instead of deletion */
  const preserve = options.preserve;

  /** Is microwriter writing new characters */
  let isPaused = false;

  /** Is microwriter deleting already typed characters */
  let isDeleting = false;

  /** The length of a currently written line */
  let charsWrittenCount = 0;

  /** The index of a currently written line */
  let lineIndex = 0;

  /** Current timer ID */
  let timerId = -1;

  /**
   * Start timer.
   * Exposed as instance method.
   */
  function startTimer(): void {
    isPaused = false;
    timerId = window.setTimeout(tick, getDelay());
  }

  /**
   * Stop timer.
   * Exposed as instance method.
   */
  function stopTimer(): void {
    window.clearTimeout(timerId);
    isPaused = true;
    timerId = -1;
  }

  /**
   * Replace lines and restart timer.
   * Exposed as instance method.
   *
   * @param nextLines - a new list of lines to write
   */
  function replaceLines(nextLines: string[]): void {
    lines = nextLines;
    reset();
    startTimer();
  }

  /**
   * Stop timer and reset state to initial.
   */
  function reset(): void {
    stopTimer();

    isDeleting = false;
    lineIndex = 0;
    charsWrittenCount = 0;
  }

  /**
   * Perform writing or deleting a character.
   */
  function tick(): void {
    if (isPaused) {
      return;
    }

    const currentLine = lines[lineIndex];
    const currentLineLen = currentLine.length;

    if (charsWrittenCount < currentLineLen && !isDeleting) {
      charsWrittenCount += 1;
    } else if (charsWrittenCount > 0 && isDeleting && !preserve) {
      charsWrittenCount -= 1;
    }

    const nextInnerHtml = currentLine.substr(0, charsWrittenCount);
    target.innerHTML = nextInnerHtml;

    if (charsWrittenCount === 0 && isDeleting) {
      isDeleting = false;
      onLineEnd();
    } else if (charsWrittenCount === currentLine.length && !isDeleting) {
      if (preserve && !loop) {
        setTimeout(() => {
          onLineEnd();

          if (!isPaused) {
            charsWrittenCount = 0;
            startTimer();
          }
        }, deleteLineDelay);

        return;
      }

      isDeleting = true;
    }

    if (!isPaused) {
      startTimer();
    }
  }

  /**
   * Check if line should be switched or timer should be stopped
   */
  function onLineEnd(): void {
    if (lineIndex === lines.length - 1 && !loop) {
      isPaused = true;
      stopTimer();
      return;
    }

    switchToNextLine();
  }

  /**
   * Switch to the next line in the lines list.
   * If the current line is the last one, jump to the first.
   */
  function switchToNextLine(): void {
    if (lineIndex === lines.length - 1) {
      lineIndex = 0;
      return;
    }

    lineIndex++;
  }

  /**
   * Get delay for timer depending on the current state.
   */
  function getDelay(): number {
    const currentLine = lines[lineIndex];

    // If writing a line is about to begin
    if (charsWrittenCount === 0) {
      return writeLineDelay || writeSpeed;
    }

    // If deleting a line is about to begin
    if (charsWrittenCount === currentLine.length) {
      return deleteLineDelay || deleteSpeed;
    }

    // If in the middle of deleting a line
    if (isDeleting) {
      return deleteSpeed;
    }

    // If in the middle of writing a line
    return writeSpeed;
  }

  // Return a microwriter instance
  return {
    start: startTimer,
    pause: stopTimer,
    replaceLines: replaceLines,
  };
}
