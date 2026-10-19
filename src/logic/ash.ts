/**
 * Falling ash (M4.4): a fixed pool of flakes drifting down the screen and wrapping back to the
 * top. Only the first `visibleFlakes(gloom)` are drawn, so the ash thickens as cities fall
 * without allocating anything. Randomness is from the visual stream (ADR-NW08).
 */
import { ASH } from '../config/tuning';
import type { Rng } from './rng';

export interface Flake {
  x: number;
  y: number;
  /** Pixels per second. */
  vx: number;
  vy: number;
  /** 1 = a single pixel, 2 = two pixels wide, 3 = a 2×2 clump. */
  size: 1 | 2 | 3;
  color: number;
}

function randomize(f: Flake, rng: Rng): void {
  f.vx = rng.range(ASH.driftMin, ASH.driftMax);
  f.vy = rng.range(ASH.fallMin, ASH.fallMax);
  const s = rng.next();
  f.size = s < ASH.clumpChance ? 3 : s < ASH.clumpChance + ASH.wideChance ? 2 : 1;
  f.color = rng.pick(ASH.colors);
}

/** `count` flakes spread over the whole area [0, width) × [0, height). */
export function createAsh(count: number, rng: Rng, width: number, height: number): Flake[] {
  const flakes: Flake[] = [];
  for (let i = 0; i < count; i++) {
    const f: Flake = {
      x: rng.next() * width,
      y: rng.next() * height,
      vx: 0,
      vy: 0,
      size: 1,
      color: 0,
    };
    randomize(f, rng);
    flakes.push(f);
  }
  return flakes;
}

/** Moves every flake; one that leaves the bottom starts again above the top at a new place. */
export function stepAsh(
  flakes: Flake[],
  dtMs: number,
  rng: Rng,
  width: number,
  height: number,
): void {
  const dt = dtMs / 1000;
  for (const f of flakes) {
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    if (f.y >= height) {
      f.y -= height;
      f.x = rng.next() * width;
      randomize(f, rng);
    }
    // Sideways drift wraps around the screen edges.
    if (f.x < 0) f.x += width;
    else if (f.x >= width) f.x -= width;
  }
}

/** How many flakes show at `gloom` (0..1). */
export function visibleFlakes(gloom: number): number {
  const g = Math.min(1, Math.max(0, gloom));
  return Math.round(ASH.minFlakes + (ASH.maxFlakes - ASH.minFlakes) * g);
}

/** Flake opacity at `gloom`: faint at first, thick when most cities are gone. */
export function ashAlpha(gloom: number): number {
  const g = Math.min(1, Math.max(0, gloom));
  return ASH.alphaMin + (ASH.alphaMax - ASH.alphaMin) * g;
}
