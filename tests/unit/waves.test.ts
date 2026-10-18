import { describe, expect, it } from 'vitest';
import { WAVES } from '../../src/config/tuning';
import { waveSpec } from '../../src/logic/waves';

describe('waveSpec', () => {
  it('uses the hand-set waves first', () => {
    WAVES.handSet.forEach((spec, i) => expect(waveSpec(i + 1)).toEqual(spec));
  });

  it('treats anything below 1 as wave 1', () => {
    expect(waveSpec(0)).toEqual(WAVES.handSet[0]);
    expect(waveSpec(-3)).toEqual(WAVES.handSet[0]);
  });

  it('steps up from the last hand-set wave after that', () => {
    const last = WAVES.handSet[WAVES.handSet.length - 1];
    const next = waveSpec(WAVES.handSet.length + 1);
    const f = WAVES.formula;
    expect(next.count).toBe((last?.count ?? 0) + f.countStep);
    expect(next.speedMin).toBe((last?.speedMin ?? 0) + f.speedStep);
    expect(next.launchGapMinMs).toBe((last?.launchGapMinMs ?? 0) - f.gapStepMs);
  });

  it('never gets easier from one wave to the next', () => {
    for (let n = 1; n < 60; n++) {
      const a = waveSpec(n);
      const b = waveSpec(n + 1);
      expect(b.count).toBeGreaterThanOrEqual(a.count);
      expect(b.speedMin).toBeGreaterThanOrEqual(a.speedMin);
      expect(b.speedMax).toBeGreaterThanOrEqual(a.speedMax);
      expect(b.launchGapMinMs).toBeLessThanOrEqual(a.launchGapMinMs);
      expect(b.launchGapMaxMs).toBeLessThanOrEqual(a.launchGapMaxMs);
      expect(b.pairChance).toBeGreaterThanOrEqual(a.pairChance);
    }
  });

  it('levels off at the caps, so late waves stay possible', () => {
    const f = WAVES.formula;
    const late = waveSpec(500);
    expect(late.count).toBe(f.countMax);
    expect(late.speedMin).toBe(f.speedMinCap);
    expect(late.speedMax).toBe(f.speedMaxCap);
    expect(late.launchGapMinMs).toBe(f.gapMinFloorMs);
    expect(late.launchGapMaxMs).toBe(f.gapMaxFloorMs);
    expect(late.pairChance).toBeCloseTo(f.pairMax);
  });

  it('keeps every wave sensible', () => {
    for (let n = 1; n <= 100; n++) {
      const s = waveSpec(n);
      expect(Number.isInteger(s.count)).toBe(true);
      expect(s.speedMin).toBeLessThanOrEqual(s.speedMax);
      expect(s.launchGapMinMs).toBeLessThanOrEqual(s.launchGapMaxMs);
      expect(s.pairChance).toBeGreaterThanOrEqual(0);
      expect(s.pairChance).toBeLessThanOrEqual(1);
    }
  });

  it('fails clearly without any hand-set wave', () => {
    expect(() => waveSpec(1, { ...WAVES, handSet: [] })).toThrow(/at least one wave/);
  });
});
