import { SCORE } from '../config/tuning';

/** The end-of-wave bonus, broken down for the tally screen. */
export interface WaveBonus {
  readonly citiesSaved: number;
  readonly missilesLeft: number;
  readonly cityPoints: number;
  readonly missilePoints: number;
  readonly total: number;
}

/** Bonus for the cities still standing and the missiles left unused when a wave is cleared. */
export function waveBonus(
  citiesSaved: number,
  missilesLeft: number,
  points: { citySaved: number; missileLeft: number } = SCORE,
): WaveBonus {
  const cities = Math.max(0, Math.floor(citiesSaved));
  const missiles = Math.max(0, Math.floor(missilesLeft));
  const cityPoints = cities * points.citySaved;
  const missilePoints = missiles * points.missileLeft;
  return {
    citiesSaved: cities,
    missilesLeft: missiles,
    cityPoints,
    missilePoints,
    total: cityPoints + missilePoints,
  };
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
