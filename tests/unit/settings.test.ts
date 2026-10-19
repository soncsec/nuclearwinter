import { describe, expect, it } from 'vitest';
import { SETTINGS } from '../../src/config/tuning';
import type { KeyValueStore } from '../../src/logic/highScore';
import {
  DEFAULT_SETTINGS,
  formatSettings,
  loadSettings,
  parseSettings,
  saveSettings,
} from '../../src/logic/settings';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

const throwing: KeyValueStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('settings', () => {
  it('defaults to flashing on (not reduced) and vibration on', () => {
    expect(DEFAULT_SETTINGS).toEqual({ reduceFlashing: false, vibration: true });
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips every combination through storage', () => {
    for (const reduceFlashing of [false, true]) {
      for (const vibration of [false, true]) {
        const store = memoryStore();
        expect(saveSettings(store, { reduceFlashing, vibration })).toBe(true);
        expect(loadSettings(store)).toEqual({ reduceFlashing, vibration });
      }
    }
  });

  it('saves plain text under its own key', () => {
    const store = memoryStore();
    saveSettings(store, { reduceFlashing: true, vibration: false });
    expect(store.data.get(SETTINGS.storageKey)).toBe('reduceFlashing=1,vibration=0');
    expect(formatSettings(DEFAULT_SETTINGS)).toBe('reduceFlashing=0,vibration=1');
  });

  it('reads anything malformed as the defaults', () => {
    for (const raw of [
      '',
      'reduceFlashing=2,vibration=1',
      'reduceFlashing=1',
      ' reduceFlashing=1,vibration=1',
      'reduceFlashing=1,vibration=1,extra=1',
      '{"reduceFlashing":true}',
      '<script>',
    ]) {
      expect(parseSettings(raw)).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('copes with storage that throws', () => {
    expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS);
    expect(saveSettings(throwing, DEFAULT_SETTINGS)).toBe(false);
    expect(saveSettings(null, DEFAULT_SETTINGS)).toBe(false);
  });

  it('never hands out the shared defaults object', () => {
    const s = loadSettings(null);
    s.reduceFlashing = true;
    expect(DEFAULT_SETTINGS.reduceFlashing).toBe(false);
  });
});
