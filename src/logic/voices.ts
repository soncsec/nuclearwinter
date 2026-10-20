/**
 * Caps how many copies of each sound play at once (ADR-NW09), so a burst of launches or blasts
 * can't stack into a roar. Each copy is a "voice" that is busy until its sound ends; a new
 * copy starts only while a voice is free. Timed by the caller's clock, so it needs no audio.
 */

export interface VoiceLimiter {
  /** When each busy voice of each sound frees up, in the caller's milliseconds. */
  readonly endsAt: Map<string, number[]>;
}

export function createVoiceLimiter(): VoiceLimiter {
  return { endsAt: new Map() };
}

/**
 * Starts a copy of `name`, lasting `durMs` from `nowMs`, if fewer than `cap` copies are still
 * playing. Returns the voice used (0 to cap - 1), or null if every voice is busy.
 */
export function startVoice(
  limiter: VoiceLimiter,
  name: string,
  nowMs: number,
  durMs: number,
  cap: number,
): number | null {
  let voices = limiter.endsAt.get(name);
  if (!voices) {
    voices = [];
    limiter.endsAt.set(name, voices);
  }
  for (let i = 0; i < cap; i++) {
    const end = voices[i];
    if (end === undefined || end <= nowMs) {
      voices[i] = nowMs + durMs;
      return i;
    }
  }
  return null;
}

/** How many copies of `name` are playing at `nowMs`. */
export function voicesPlaying(limiter: VoiceLimiter, name: string, nowMs: number): number {
  return (limiter.endsAt.get(name) ?? []).filter((end) => end > nowMs).length;
}
