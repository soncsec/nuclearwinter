import { describe, expect, it } from 'vitest';
import { FLASH, SHAKE } from '../../src/config/tuning';
import { createFlashLimiter, flashAlpha, shakeOffset, tryFlash } from '../../src/logic/flash';
import { createRng } from '../../src/logic/rng';

describe('flash limiter', () => {
  it('allows three flashes a second and refuses the fourth', () => {
    const l = createFlashLimiter(3, 1000);
    expect([0, 100, 200, 300].map((t) => tryFlash(l, t))).toEqual([true, true, true, false]);
  });

  it('allows a flash again once the oldest is a full window old', () => {
    const l = createFlashLimiter(3, 1000);
    for (const t of [0, 100, 200]) tryFlash(l, t);
    expect(tryFlash(l, 999)).toBe(false);
    expect(tryFlash(l, 1000)).toBe(true);
  });

  it('never lets more than the limit start in any window, however fast the hits come', () => {
    const l = createFlashLimiter(FLASH.maxPerSecond, 1000);
    const started: number[] = [];
    for (let t = 0; t < 5000; t += 37) if (tryFlash(l, t)) started.push(t);
    for (const t of started) {
      expect(started.filter((s) => s >= t && s < t + 1000).length).toBeLessThanOrEqual(3);
    }
  });

  it('keeps the tuned limit at three per second or fewer', () => {
    expect(FLASH.maxPerSecond).toBeLessThanOrEqual(3);
  });
});

describe('flashAlpha', () => {
  it('starts at the peak and fades to nothing', () => {
    expect(flashAlpha(0, 100, 0.3)).toBeCloseTo(0.3);
    expect(flashAlpha(50, 100, 0.3)).toBeCloseTo(0.15);
    expect(flashAlpha(100, 100, 0.3)).toBe(0);
    expect(flashAlpha(-1, 100, 0.3)).toBe(0);
  });
});

describe('shakeOffset', () => {
  it('stays on whole pixels within the amplitude and stops at the end', () => {
    const rng = createRng(1);
    for (let t = 0; t < SHAKE.durationMs; t += 5) {
      const o = shakeOffset(t, SHAKE.durationMs, SHAKE.amplitude, rng);
      expect(Number.isInteger(o.x) && Number.isInteger(o.y)).toBe(true);
      expect(Math.abs(o.x)).toBeLessThanOrEqual(SHAKE.amplitude);
      expect(Math.abs(o.y)).toBeLessThanOrEqual(SHAKE.amplitude);
    }
    expect(shakeOffset(SHAKE.durationMs, SHAKE.durationMs, SHAKE.amplitude, rng)).toEqual({
      x: 0,
      y: 0,
    });
  });
});
