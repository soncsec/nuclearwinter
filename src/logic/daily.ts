import { HIGH_SCORE } from '../config/tuning';
import type { KeyValueStore } from './highScore';

/**
 * The daily challenge (M3.5): every player gets the same seed on the same UTC day, and the
 * best score for today is kept apart from the normal high score.
 */

/** Today's date in UTC as "YYYY-MM-DD", the same for every player whatever their time zone. */
export function utcDateKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** The day's seed: an FNV-1a hash of the date, so nearby days get unrelated waves. */
export function dailySeed(dateKey: string): number {
  let h = 0x811c9dc5;
  for (const ch of `nuclearwinter:${dateKey}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Reads a stored daily best. Only "YYYY-MM-DD:score" for `dateKey` itself counts; another day's
 * best, a missing value or anything malformed reads as 0.
 */
export function parseDailyBest(raw: string | null, dateKey: string): number {
  const m = raw === null ? null : /^(\d{4}-\d{2}-\d{2}):(\d{1,9})$/.exec(raw);
  if (!m || m[1] !== dateKey) return 0;
  const n = Number(m[2]);
  return n <= HIGH_SCORE.max ? n : 0;
}

/** Today's daily best, or 0 if there is none or storage can't be read. */
export function loadDailyBest(store: KeyValueStore | null, dateKey: string): number {
  if (!store) return 0;
  try {
    return parseDailyBest(store.getItem(HIGH_SCORE.dailyStorageKey), dateKey);
  } catch {
    return 0;
  }
}

/** Saves `score` as today's best if it beats it (replacing any earlier day's). Returns the best. */
export function saveDailyBest(store: KeyValueStore | null, dateKey: string, score: number): number {
  const best = loadDailyBest(store, dateKey);
  const n = Math.floor(score);
  if (!store || !(n > best) || n > HIGH_SCORE.max) return best;
  try {
    store.setItem(HIGH_SCORE.dailyStorageKey, `${dateKey}:${n}`);
    return n;
  } catch {
    return best;
  }
}
