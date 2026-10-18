import { BLAST } from '../config/tuning';

export interface BlastShape {
  readonly maxRadius: number;
  readonly growMs: number;
  readonly holdMs: number;
  readonly shrinkMs: number;
}

export function blastDurationMs(shape: BlastShape = BLAST): number {
  return shape.growMs + shape.holdMs + shape.shrinkMs;
}

/** Blast radius at a given age: grows, holds at full size, then shrinks to nothing. */
export function blastRadius(ageMs: number, shape: BlastShape = BLAST): number {
  const { maxRadius, growMs, holdMs, shrinkMs } = shape;
  if (ageMs < 0) return 0;
  if (ageMs < growMs) return (maxRadius * ageMs) / growMs;
  if (ageMs < growMs + holdMs) return maxRadius;
  const shrinkAge = ageMs - growMs - holdMs;
  if (shrinkAge < shrinkMs) return maxRadius * (1 - shrinkAge / shrinkMs);
  return 0;
}
