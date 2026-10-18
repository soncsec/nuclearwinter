/** A point in game pixels. y grows downwards, as on screen. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Moves up to `maxStep` pixels from `from` towards `to`, stopping exactly on `to`. */
export function moveToward(
  from: Point,
  to: Point,
  maxStep: number,
): { pos: Point; arrived: boolean } {
  const d = distance(from, to);
  if (d <= maxStep) return { pos: { x: to.x, y: to.y }, arrived: true };
  const t = maxStep / d;
  return {
    pos: { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
    arrived: false,
  };
}
