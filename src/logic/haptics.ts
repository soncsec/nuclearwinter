/**
 * Phone vibration on city and base hits (M4.8), through the Vibration API where the browser has
 * it (Android Chrome and Firefox; not iOS Safari). The player can turn it off in settings.
 */
import type { Settings } from './settings';

/** The part of `navigator` this needs; absent where the browser has no Vibration API. */
export interface Vibrator {
  vibrate?: (pattern: number | number[]) => boolean;
}

/**
 * Vibrates `pattern` if the setting is on and the browser supports it. Returns whether a
 * vibration was asked for. Never throws: a browser that refuses (no tap yet, or a blocked
 * feature) just doesn't vibrate.
 */
export function vibrate(
  device: Vibrator | null,
  settings: Pick<Settings, 'vibration'>,
  pattern: readonly number[],
): boolean {
  if (!settings.vibration || !device || typeof device.vibrate !== 'function') return false;
  try {
    return device.vibrate([...pattern]);
  } catch {
    return false;
  }
}
