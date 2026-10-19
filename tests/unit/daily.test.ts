import { describe, expect, it } from 'vitest';
import { HIGH_SCORE } from '../../src/config/tuning';
import {
  dailySeed,
  loadDailyBest,
  parseDailyBest,
  saveDailyBest,
  utcDateKey,
} from '../../src/logic/daily';
import type { KeyValueStore } from '../../src/logic/highScore';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

const KEY = HIGH_SCORE.dailyStorageKey;

describe('utcDateKey', () => {
  it('uses the UTC date, whatever the local time zone', () => {
    expect(utcDateKey(new Date('2026-10-19T23:59:59Z'))).toBe('2026-10-19');
    expect(utcDateKey(new Date('2026-10-20T00:00:00Z'))).toBe('2026-10-20');
    expect(utcDateKey(new Date('2026-10-19T20:00:00-07:00'))).toBe('2026-10-20');
  });
});

describe('dailySeed', () => {
  it('is the same for the same day and differs between days', () => {
    expect(dailySeed('2026-10-19')).toBe(dailySeed('2026-10-19'));
    const week = ['13', '14', '15', '16', '17', '18', '19'].map((d) => dailySeed(`2026-10-${d}`));
    expect(new Set(week).size).toBe(7);
  });

  it('is a whole number the RNG accepts', () => {
    const s = dailySeed('2026-10-19');
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(2 ** 32);
  });
});

describe('parseDailyBest', () => {
  it("reads today's best", () => {
    expect(parseDailyBest('2026-10-19:1234', '2026-10-19')).toBe(1234);
  });

  it("ignores another day's best", () => {
    expect(parseDailyBest('2026-10-18:9999', '2026-10-19')).toBe(0);
  });

  it('ignores anything malformed or out of range', () => {
    for (const raw of [
      null,
      '',
      '1234',
      '2026-10-19:',
      '2026-10-19:-5',
      '2026-10-19:1e3',
      '2026-10-19:12 ',
      'x2026-10-19:5',
      '2026-10-19:9999999999',
    ]) {
      expect(parseDailyBest(raw, '2026-10-19')).toBe(0);
    }
  });
});

describe('loadDailyBest / saveDailyBest', () => {
  it('start at zero and keep only a better score', () => {
    const store = memoryStore();
    expect(loadDailyBest(store, '2026-10-19')).toBe(0);
    expect(saveDailyBest(store, '2026-10-19', 500)).toBe(500);
    expect(saveDailyBest(store, '2026-10-19', 300)).toBe(500);
    expect(store.data[KEY]).toBe('2026-10-19:500');
  });

  it("start fresh on a new day, replacing the old day's best", () => {
    const store = memoryStore({ [KEY]: '2026-10-18:9000' });
    expect(loadDailyBest(store, '2026-10-19')).toBe(0);
    expect(saveDailyBest(store, '2026-10-19', 10)).toBe(10);
    expect(store.data[KEY]).toBe('2026-10-19:10');
  });

  it('never touch the normal high score', () => {
    const store = memoryStore({ [HIGH_SCORE.storageKey]: '777' });
    saveDailyBest(store, '2026-10-19', 5000);
    expect(store.data[HIGH_SCORE.storageKey]).toBe('777');
  });

  it('survive missing or failing storage', () => {
    expect(loadDailyBest(null, '2026-10-19')).toBe(0);
    expect(saveDailyBest(null, '2026-10-19', 50)).toBe(0);
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadDailyBest(broken, '2026-10-19')).toBe(0);
    expect(saveDailyBest(broken, '2026-10-19', 50)).toBe(0);
    const readOnly: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(saveDailyBest(readOnly, '2026-10-19', 50)).toBe(0);
  });

  it('refuse a score above the maximum', () => {
    const store = memoryStore();
    expect(saveDailyBest(store, '2026-10-19', HIGH_SCORE.max + 1)).toBe(0);
    expect(store.data[KEY]).toBeUndefined();
  });
});
