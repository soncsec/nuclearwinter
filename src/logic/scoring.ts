/** Formats a score for the HUD: zero-padded to `digits`, capped at all nines. */
export function formatScore(score: number, digits: number): string {
  const max = 10 ** digits - 1;
  const n = Math.min(max, Math.max(0, Math.floor(score)));
  return String(n).padStart(digits, '0');
}
