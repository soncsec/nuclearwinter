import { describe, expect, it } from 'vitest';
import { SCORE } from '../../src/config/tuning';
import {
  bonusCitiesEarned,
  countUp,
  formatScore,
  waveBonus,
  waveMultiplier,
} from '../../src/logic/scoring';

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
      multiplier: 1,
      cityPoints: 6 * SCORE.citySaved,
      missilePoints: 30 * SCORE.missileLeft,
      total: 6 * SCORE.citySaved + 30 * SCORE.missileLeft,
    });
  });

  it('uses the given point values', () => {
    expect(waveBonus(2, 4, 1, { citySaved: 10, missileLeft: 1 }).total).toBe(24);
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

describe('bonusCitiesEarned', () => {
  it('earns one city per threshold reached', () => {
    expect(bonusCitiesEarned(0)).toBe(0);
    expect(bonusCitiesEarned(SCORE.bonusCityEvery - 1)).toBe(0);
    expect(bonusCitiesEarned(SCORE.bonusCityEvery)).toBe(1);
    expect(bonusCitiesEarned(SCORE.bonusCityEvery * 3 + 7)).toBe(3);
  });

  it('earns nothing for a negative score or a bad threshold', () => {
    expect(bonusCitiesEarned(-500)).toBe(0);
    expect(bonusCitiesEarned(50_000, 0)).toBe(0);
  });
});

describe('waveMultiplier', () => {
  it('follows the arcade steps: 1x, 1x, 2x, 2x, 3x ... capped at 6x', () => {
    const got = Array.from({ length: 14 }, (_, i) => waveMultiplier(i + 1));
    expect(got).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 6, 6]);
    expect(waveMultiplier(1000)).toBe(SCORE.multiplierMax);
  });

  it('treats a wave below 1 or a broken rule as safely as it can', () => {
    expect(waveMultiplier(0)).toBe(1);
    expect(waveMultiplier(-3)).toBe(1);
    expect(waveMultiplier(5, { multiplierEvery: 0, multiplierMax: 3 })).toBe(3);
    expect(waveMultiplier(5, { multiplierEvery: 2, multiplierMax: 0 })).toBe(1);
  });
});

describe('waveBonus with a multiplier', () => {
  it('multiplies both parts of the bonus', () => {
    const b = waveBonus(5, 28, 3);
    expect(b.multiplier).toBe(3);
    expect(b.cityPoints).toBe(5 * SCORE.citySaved * 3);
    expect(b.missilePoints).toBe(28 * SCORE.missileLeft * 3);
    expect(b.total).toBe(b.cityPoints + b.missilePoints);
  });

  it('never multiplies by less than 1', () => {
    expect(waveBonus(1, 0, 0).total).toBe(SCORE.citySaved);
  });
});
