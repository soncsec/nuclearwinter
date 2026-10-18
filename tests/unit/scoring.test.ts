import { describe, expect, it } from 'vitest';
import { SCORE } from '../../src/config/tuning';
import { countUp, formatScore, waveBonus } from '../../src/logic/scoring';

describe('formatScore', () => {
  it('pads to the given number of digits', () => {
    expect(formatScore(0, 6)).toBe('000000');
    expect(formatScore(25, 6)).toBe('000025');
  });

  it('caps at all nines instead of growing wider', () => {
    expect(formatScore(1_234_567, 6)).toBe('999999');
  });

  it('never shows negatives or fractions', () => {
    expect(formatScore(-5, 4)).toBe('0000');
    expect(formatScore(99.9, 4)).toBe('0099');
  });
});

describe('waveBonus', () => {
  it('pays per city saved and per missile left', () => {
    expect(waveBonus(6, 30)).toEqual({
      citiesSaved: 6,
      missilesLeft: 30,
      cityPoints: 6 * SCORE.citySaved,
      missilePoints: 30 * SCORE.missileLeft,
      total: 6 * SCORE.citySaved + 30 * SCORE.missileLeft,
    });
  });

  it('uses the given point values', () => {
    expect(waveBonus(2, 4, { citySaved: 10, missileLeft: 1 }).total).toBe(24);
  });

  it('is zero with nothing left, and ignores negatives and fractions', () => {
    expect(waveBonus(0, 0).total).toBe(0);
    expect(waveBonus(-1, -5).total).toBe(0);
    expect(waveBonus(1.9, 2.5)).toMatchObject({ citiesSaved: 1, missilesLeft: 2 });
  });
});

describe('countUp', () => {
  it('starts at the start value and ends at the target', () => {
    expect(countUp(100, 700, 0, 900)).toBe(100);
    expect(countUp(100, 700, 900, 900)).toBe(700);
    expect(countUp(100, 700, 5000, 900)).toBe(700);
  });

  it('rises in whole numbers in between, never past the target', () => {
    let last = -1;
    for (let t = 0; t <= 900; t += 37) {
      const v = countUp(0, 655, t, 900);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(last);
      expect(v).toBeLessThanOrEqual(655);
      last = v;
    }
    expect(countUp(0, 600, 450, 900)).toBe(300);
  });

  it('jumps straight to the target with no duration, and treats negative time as the start', () => {
    expect(countUp(0, 50, 0, 0)).toBe(50);
    expect(countUp(10, 50, -20, 100)).toBe(10);
  });
});
