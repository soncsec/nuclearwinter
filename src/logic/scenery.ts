/**
 * Fixed scenery: the stars and which city windows are lit. Both come from their own seeds, so
 * they look the same in every game and never touch the gameplay random streams (ADR-NW08).
 */
import { createRng } from './rng';

export interface Star {
  x: number;
  y: number;
  /** 0..1: dim to bright. */
  brightness: number;
}

/** `count` stars scattered over the area [0, width) × [0, maxY), on whole pixels. */
export function starField(seed: number, count: number, width: number, maxY: number): Star[] {
  const rng = createRng(seed);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.floor(rng.next() * width),
      y: Math.floor(rng.next() * maxY),
      brightness: rng.next(),
    });
  }
  return stars;
}

/** A window: pixel offset from the city's centre (x) and from the ground (y, up is negative). */
export interface CityWindow {
  dx: number;
  dy: number;
}

/**
 * The lit windows of one city. Each building of `blocks` ([x offset, width, height]) has a grid
 * of window spots every `pitchX` columns and `pitchY` rows inside its edges; each spot is lit
 * with probability `litChance`.
 */
export function litWindows(
  seed: number,
  blocks: readonly (readonly [number, number, number])[],
  pitchX: number,
  pitchY: number,
  litChance: number,
): CityWindow[] {
  const rng = createRng(seed);
  const lit: CityWindow[] = [];
  for (const [dx, w, h] of blocks) {
    for (let y = -h + 2; y < -1; y += pitchY) {
      for (let x = dx + 1; x < dx + w - 1; x += pitchX) {
        if (rng.next() < litChance) lit.push({ dx: x, dy: y });
      }
    }
  }
  return lit;
}
