import { describe, expect, it } from 'vitest';
import { HIGH_SCORE } from '../../src/config/tuning';
import {
  loadHighScore,
  parseHighScore,
  saveHighScore,
  type KeyValueStore,
} from '../../src/logic/highScore';

function memoryStore(initial?: string): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(HIGH_SCORE.storageKey, initial);
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

const broken: KeyValueStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('quota');
  },
};

describe('parseHighScore', () => {
  it('reads plain whole numbers', () => {
    expect(parseHighScore('0')).toBe(0);
    expect(parseHighScore('12345')).toBe(12345);
    expect(parseHighScore(String(HIGH_SCORE.max))).toBe(HIGH_SCORE.max);
  });

  it('treats anything else as no high score', () => {
    for (const bad of [null, '', '-5', '1.5', '1e9', ' 42', '42abc', 'NaN', '0x10', '9999999999']) {
      expect(parseHighScore(bad)).toBe(0);
    }
  });
});

describe('loadHighScore', () => {
  it('is 0 with nothing saved, no storage, or storage that throws', () => {
    expect(loadHighScore(memoryStore())).toBe(0);
    expect(loadHighScore(null)).toBe(0);
    expect(loadHighScore(broken)).toBe(0);
  });

  it('reads the saved value', () => {
    expect(loadHighScore(memoryStore('8000'))).toBe(8000);
  });
});

describe('saveHighScore', () => {
  it('saves a better score', () => {
    const store = memoryStore('100');
    expect(saveHighScore(store, 250)).toBe(250);
    expect(store.data.get(HIGH_SCORE.storageKey)).toBe('250');
  });

  it('keeps the old high score when the new one is not better', () => {
    const store = memoryStore('500');
    expect(saveHighScore(store, 500)).toBe(500);
    expect(saveHighScore(store, 20)).toBe(500);
    expect(store.data.get(HIGH_SCORE.storageKey)).toBe('500');
  });

  it('replaces a tampered value', () => {
    const store = memoryStore('<script>');
    expect(saveHighScore(store, 75)).toBe(75);
    expect(store.data.get(HIGH_SCORE.storageKey)).toBe('75');
  });

  it('never saves an impossible score', () => {
    const store = memoryStore();
    expect(saveHighScore(store, HIGH_SCORE.max + 1)).toBe(0);
    expect(saveHighScore(store, Number.NaN)).toBe(0);
    expect(store.data.size).toBe(0);
  });

  it('carries on when storage is missing or fails', () => {
    expect(saveHighScore(null, 300)).toBe(0);
    expect(saveHighScore(broken, 300)).toBe(0);
  });
});
