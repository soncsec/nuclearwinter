/**
 * The bloom watchdog (M4.7, ADR-NW04). Bloom is the optional high-quality layer: it starts on
 * where the renderer supports it, and switches off for the rest of the game once the frame rate
 * stays low. It never switches back on, so the picture can't flicker between the two looks.
 */
export interface BloomGovernor {
  on: boolean;
  /** Milliseconds of frames seen so far, so start-up hitches are ignored. */
  elapsedMs: number;
  /** Rolling average frame time in milliseconds (exponential smoothing). */
  avgFrameMs: number;
  /** How long the average has been too slow, in milliseconds. */
  slowForMs: number;
}

export interface BloomRules {
  /** Frames during this first stretch don't count (loading, shader compiling). */
  warmupMs: number;
  /** Average frame time above this counts as slow (e.g. 1000 / 50 fps = 20 ms). */
  slowFrameMs: number;
  /** Bloom switches off after the average has been slow this long. */
  slowForMs: number;
  /** Smoothing of the average: the weight each new frame gets (0..1). */
  smoothing: number;
}

export function createBloomGovernor(supported: boolean, startFrameMs: number): BloomGovernor {
  return { on: supported, elapsedMs: 0, avgFrameMs: startFrameMs, slowForMs: 0 };
}

/** Feeds one frame's duration in. Returns true if this frame switched bloom off. */
export function observeFrame(gov: BloomGovernor, frameMs: number, rules: BloomRules): boolean {
  if (!gov.on) return false;
  gov.elapsedMs += frameMs;
  if (gov.elapsedMs <= rules.warmupMs) return false;
  gov.avgFrameMs += (frameMs - gov.avgFrameMs) * rules.smoothing;
  gov.slowForMs = gov.avgFrameMs > rules.slowFrameMs ? gov.slowForMs + frameMs : 0;
  if (gov.slowForMs >= rules.slowForMs) {
    gov.on = false;
    return true;
  }
  return false;
}
