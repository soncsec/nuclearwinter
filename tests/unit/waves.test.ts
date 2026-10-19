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

describe('enemy mix (M3.4)', () => {
  const f = WAVES.formula;

  it('brings each enemy in on its own wave: bombers, MIRVs, satellites, smart bombs', () => {
    const first = (pick: (n: number) => number): number => {
      for (let n = 1; n <= 50; n++) if (pick(n) > 0) return n;
      return -1;
    };
    expect(first((n) => waveSpec(n).raiders)).toBe(2);
    expect(first((n) => waveSpec(n).mirvChance)).toBe(3);
    expect(first((n) => waveSpec(n).satelliteChance)).toBe(4);
    expect(first((n) => waveSpec(n).smartBombChance)).toBe(f.smartBombFromWave);
  });

  it('wave 1 is plain warheads only', () => {
    expect(waveSpec(1)).toMatchObject({
      mirvChance: 0,
      smartBombChance: 0,
      raiders: 0,
      satelliteChance: 0,
    });
  });

  it('grows the mix after the hand-set waves, never easing off, up to the caps', () => {
    for (let n = 1; n < 80; n++) {
      const a = waveSpec(n);
      const b = waveSpec(n + 1);
      expect(b.mirvChance).toBeGreaterThanOrEqual(a.mirvChance);
      expect(b.smartBombChance).toBeGreaterThanOrEqual(a.smartBombChance);
      expect(b.raiders).toBeGreaterThanOrEqual(a.raiders);
    }
    const late = waveSpec(500);
    expect(late.mirvChance).toBeCloseTo(f.mirvMax);
    expect(late.smartBombChance).toBeCloseTo(f.smartBombMax);
    expect(late.raiders).toBe(f.raidersMax);
  });

  it('starts smart bombs at their first wave with the starting chance, then steps up', () => {
    expect(waveSpec(f.smartBombFromWave - 1).smartBombChance).toBe(0);
    expect(waveSpec(f.smartBombFromWave).smartBombChance).toBeCloseTo(f.smartBombStart);
    expect(waveSpec(f.smartBombFromWave + 2).smartBombChance).toBeCloseTo(
      f.smartBombStart + 2 * f.smartBombStep,
    );
  });

  it('adds a raider every few waves after the hand-set ones', () => {
    const last = WAVES.handSet[WAVES.handSet.length - 1]?.raiders ?? 0;
    const h = WAVES.handSet.length;
    expect(waveSpec(h + f.raiderEveryWaves - 1).raiders).toBe(last);
    expect(waveSpec(h + f.raiderEveryWaves).raiders).toBe(Math.min(f.raidersMax, last + 1));
  });

  it('keeps every chance between 0 and 1 and every count a whole number', () => {
    for (let n = 1; n <= 100; n++) {
      const s = waveSpec(n);
      for (const c of [s.mirvChance, s.smartBombChance, s.satelliteChance]) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
      expect(Number.isInteger(s.raiders)).toBe(true);
    }
  });
});
