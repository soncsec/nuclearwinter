import { SCORE } from '../config/tuning';

/**
 * The wave's score multiplier: 1 for the first `every` waves, then one more every `every`
 * waves, never above `max`.
 */
export function waveMultiplier(
  wave: number,
  rule: { multiplierEvery: number; multiplierMax: number } = SCORE,
): number {
  const every = Math.max(1, Math.floor(rule.multiplierEvery));
  const max = Math.max(1, Math.floor(rule.multiplierMax));
  const n = Math.max(1, Math.floor(wave));
  return Math.min(max, Math.floor((n - 1) / every) + 1);
}

/** The end-of-wave bonus, broken down for the tally screen. */
export interface WaveBonus {
  readonly citiesSaved: number;
  readonly missilesLeft: number;
  /** The wave multiplier already applied to the points below. */
  readonly multiplier: number;
  readonly cityPoints: number;
  readonly missilePoints: number;
  readonly total: number;
}

/**
 * Bonus for the cities still standing and the missiles left unused when a wave is cleared,
 * times the wave multiplier.
 */
export function waveBonus(
  citiesSaved: number,
  missilesLeft: number,
  multiplier = 1,
  points: { citySaved: number; missileLeft: number } = SCORE,
): WaveBonus {
  const cities = Math.max(0, Math.floor(citiesSaved));
  const missiles = Math.max(0, Math.floor(missilesLeft));
  const m = Math.max(1, Math.floor(multiplier));
  const cityPoints = cities * points.citySaved * m;
  const missilePoints = missiles * points.missileLeft * m;
  return {
    citiesSaved: cities,
    missilesLeft: missiles,
    multiplier: m,
    cityPoints,
    missilePoints,
    total: cityPoints + missilePoints,
  };
}

/** How many bonus cities a score has earned in total: one per `every` points. */
export function bonusCitiesEarned(score: number, every: number = SCORE.bonusCityEvery): number {
  if (every <= 0 || score <= 0) return 0;
  return Math.floor(score / every);
}

/**
 * The value shown while a number counts up from `from` to `to` over `durationMs`:
 * whole numbers only, never past `to`.
 */
export function countUp(from: number, to: number, elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0 || elapsedMs >= durationMs) return to;
  const t = Math.max(0, elapsedMs) / durationMs;
  return Math.floor(from + (to - from) * t);
}

/** Formats a score for the HUD: zero-padded to `digits`, capped at all nines. */
export function formatScore(score: number, digits: number): string {
  const max = 10 ** digits - 1;
  const n = Math.min(max, Math.max(0, Math.floor(score)));
  return String(n).padStart(digits, '0');
}
