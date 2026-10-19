import { describe, expect, it } from 'vitest';
import { VIBRATION } from '../../src/config/tuning';
import { vibrate, type Vibrator } from '../../src/logic/haptics';

function fakeDevice(result = true): Vibrator & { calls: (number | number[])[] } {
  const calls: (number | number[])[] = [];
  return {
    calls,
    vibrate: (p) => {
      calls.push(p);
      return result;
    },
  };
}

describe('vibrate', () => {
  it('vibrates the pattern when the setting is on and the browser supports it', () => {
    const d = fakeDevice();
    expect(vibrate(d, { vibration: true }, VIBRATION.cityHit)).toBe(true);
    expect(d.calls).toEqual([[...VIBRATION.cityHit]]);
  });

  it('does nothing when the player turned vibration off', () => {
    const d = fakeDevice();
    expect(vibrate(d, { vibration: false }, VIBRATION.cityHit)).toBe(false);
    expect(d.calls).toEqual([]);
  });

  it('does nothing where the browser has no Vibration API', () => {
    expect(vibrate({}, { vibration: true }, VIBRATION.cityHit)).toBe(false);
    expect(vibrate(null, { vibration: true }, VIBRATION.cityHit)).toBe(false);
  });

  it('never throws, and reports a refused vibration', () => {
    const throwing: Vibrator = {
      vibrate: () => {
        throw new Error('blocked');
      },
    };
    expect(vibrate(throwing, { vibration: true }, VIBRATION.cityHit)).toBe(false);
    expect(vibrate(fakeDevice(false), { vibration: true }, VIBRATION.cityHit)).toBe(false);
  });

  it('keeps the tuned pattern short', () => {
    const total = VIBRATION.cityHit.reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(400);
  });
});
