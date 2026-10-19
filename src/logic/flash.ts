/**
 * The city-hit flash and screen shake (M4.3), kept photosensitive-safe: at most `maxPerWindow`
 * flashes start in any `windowMs` (three per second, the usual guideline). A hit that would go
 * over the limit still shakes the screen but does not flash.
 */
import type { Rng } from './rng';

export interface FlashLimiter {
  /** Start times of recent flashes, oldest first. */
  readonly recent: number[];
  readonly maxPerWindow: number;
  readonly windowMs: number;
}

export function createFlashLimiter(maxPerWindow: number, windowMs: number): FlashLimiter {
  return { recent: [], maxPerWindow, windowMs };
}

/** Whether a flash may start at `nowMs`; if so it is recorded. */
export function tryFlash(limiter: FlashLimiter, nowMs: number): boolean {
  while (limiter.recent.length > 0 && nowMs - (limiter.recent[0] ?? 0) >= limiter.windowMs) {
    limiter.recent.shift();
  }
  if (limiter.recent.length >= limiter.maxPerWindow) return false;
  limiter.recent.push(nowMs);
  return true;
}

/** Flash opacity `elapsedMs` after it starts: `peak`, fading linearly to 0 over `durationMs`. */
export function flashAlpha(elapsedMs: number, durationMs: number, peak: number): number {
  if (elapsedMs < 0 || elapsedMs >= durationMs) return 0;
  return peak * (1 - elapsedMs / durationMs);
}

/**
 * Screen-shake offset `elapsedMs` into a shake: whole pixels within ±`amplitude`, shrinking to
 * none by `durationMs`. Randomness is from the visual stream (ADR-NW08).
 */
export function shakeOffset(
  elapsedMs: number,
  durationMs: number,
  amplitude: number,
  rng: Rng,
): { x: number; y: number } {
  if (elapsedMs < 0 || elapsedMs >= durationMs) return { x: 0, y: 0 };
  const reach = Math.ceil(amplitude * (1 - elapsedMs / durationMs));
  return { x: rng.int(-reach, reach), y: rng.int(-reach, reach) };
}
