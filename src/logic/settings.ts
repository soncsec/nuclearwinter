/**
 * Player settings (M4.5), saved in localStorage as approved on 2026-10-18 (reduce flashing,
 * vibration) and 2026-10-20 (mute, ADR-NW09). Stored as the plain text
 * "reduceFlashing=0,vibration=1,mute=0"; the older form without mute still loads, with sound
 * on. Anything else reads as the defaults, so a damaged or tampered value can never break the
 * game.
 */
import { SETTINGS } from '../config/tuning';
import type { KeyValueStore } from './highScore';

export interface Settings {
  /** No city-hit flash and no screen shake. */
  reduceFlashing: boolean;
  /** Phone vibration on city hits, where the browser supports it (M4.8). */
  vibration: boolean;
  /** No sound at all (M6.2). */
  mute: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  reduceFlashing: false,
  vibration: true,
  mute: false,
};

/** The saved form; the mute part is optional, as settings saved before M6.2 lack it. */
const FORMAT = /^reduceFlashing=([01]),vibration=([01])(?:,mute=([01]))?$/;

export function parseSettings(raw: string | null): Settings {
  const m = raw === null ? null : FORMAT.exec(raw);
  if (!m) return { ...DEFAULT_SETTINGS };
  return { reduceFlashing: m[1] === '1', vibration: m[2] === '1', mute: m[3] === '1' };
}

export function formatSettings(s: Settings): string {
  const bit = (on: boolean): number => (on ? 1 : 0);
  return `reduceFlashing=${bit(s.reduceFlashing)},vibration=${bit(s.vibration)},mute=${bit(s.mute)}`;
}

/** The saved settings, or the defaults if there are none or storage can't be read. */
export function loadSettings(store: KeyValueStore | null): Settings {
  if (!store) return { ...DEFAULT_SETTINGS };
  try {
    return parseSettings(store.getItem(SETTINGS.storageKey));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Saves the settings. Returns false where storage is blocked (the change still applies now). */
export function saveSettings(store: KeyValueStore | null, s: Settings): boolean {
  if (!store) return false;
  try {
    store.setItem(SETTINGS.storageKey, formatSettings(s));
    return true;
  } catch {
    return false;
  }
}
