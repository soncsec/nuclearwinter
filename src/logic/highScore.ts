import { HIGH_SCORE } from '../config/tuning';

/** The two localStorage methods the high score needs, so tests can pass a fake. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Reads a stored high score. Anything that isn't a plain whole number from 0 to `HIGH_SCORE.max`
 * (missing, edited by hand, corrupted) counts as 0, so a bad value can never break the game.
 */
export function parseHighScore(raw: string | null): number {
  if (raw === null || !/^\d{1,9}$/.test(raw)) return 0;
  const n = Number(raw);
  return n <= HIGH_SCORE.max ? n : 0;
}

/** The saved high score, or 0 if there is none or storage can't be read (private mode, blocked). */
export function loadHighScore(store: KeyValueStore | null): number {
  if (!store) return 0;
  try {
    return parseHighScore(store.getItem(HIGH_SCORE.storageKey));
  } catch {
    return 0;
  }
}

/**
 * Saves `score` if it beats the saved high score. Returns the high score afterwards.
 * Storage failures are ignored: the game goes on, the score just isn't remembered.
 */
export function saveHighScore(store: KeyValueStore | null, score: number): number {
  const best = loadHighScore(store);
  const n = Math.floor(score);
  if (!store || !(n > best) || n > HIGH_SCORE.max) return best;
  try {
    store.setItem(HIGH_SCORE.storageKey, String(n));
    return n;
  } catch {
    return best;
  }
}
