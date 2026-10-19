/**
 * Nuclear winter (M4.4): as cities are lost the sky darkens and the ash thickens. `gloom` runs
 * from 0 (every city standing) to 1 (every city lost) and eases toward its target, so the change
 * is gradual rather than a jump.
 */
import { GLOOM } from '../config/tuning';

/** The gloom the sky heads toward with `lost` of `total` cities destroyed. */
export function gloomTarget(lost: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, lost / total));
}

/** Moves `current` toward `target` by at most `perSecond` × elapsed time. */
export function easeToward(
  current: number,
  target: number,
  dtMs: number,
  perSecond: number,
): number {
  const step = (perSecond * dtMs) / 1000;
  if (Math.abs(target - current) <= step) return target;
  return current + Math.sign(target - current) * step;
}

/** Blends two 0xRRGGBB colours: t = 0 gives `a`, t = 1 gives `b`. */
export function lerpColor(a: number, b: number, t: number): number {
  const k = Math.min(1, Math.max(0, t));
  const ch = (shift: number): number => {
    const ca = (a >> shift) & 0xff;
    const cb = (b >> shift) & 0xff;
    return Math.round(ca + (cb - ca) * k) << shift;
  };
  return ch(16) | ch(8) | ch(0);
}

export interface SkyLook {
  top: number;
  horizon: number;
  skylineTint: number;
  /** 1 = stars fully visible, 0 = hidden by smoke. */
  starAlpha: number;
  /** Strength of the orange glow of burning cities along the horizon. */
  emberAlpha: number;
}

/**
 * How the sky looks at `gloom`. The colours reach the full nuclear-winter palette at
 * `GLOOM.fullAt`, so half the cities lost already looks grim (as in the approved mock-up).
 */
export function skyLook(
  gloom: number,
  clear: { top: number; horizon: number; skylineTint: number },
): SkyLook {
  const t = Math.min(1, gloom / GLOOM.fullAt);
  return {
    top: lerpColor(clear.top, GLOOM.top, t),
    horizon: lerpColor(clear.horizon, GLOOM.horizon, t),
    skylineTint: lerpColor(clear.skylineTint, GLOOM.skylineTint, t),
    starAlpha: Math.max(0, 1 - gloom / GLOOM.starsGoneAt),
    emberAlpha: gloom * GLOOM.emberMaxAlpha,
  };
}
