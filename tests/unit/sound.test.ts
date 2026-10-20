import { describe, expect, it } from 'vitest';
import { SOUNDS, type SoundName } from '../../src/config/tuning';
import {
  envelope,
  renderSound,
  soundDurationMs,
  waveSample,
  type SoundRecipe,
  type ToneLayer,
} from '../../src/logic/sound';

const RATE = 8000;
const peakOf = (s: Float32Array): number => s.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

const tone: ToneLayer = {
  kind: 'tone',
  wave: 'square',
  fromHz: 440,
  toHz: 440,
  durMs: 100,
  attackMs: 5,
  gain: 1,
};
const beep: SoundRecipe = { peak: 0.5, layers: [tone] };

describe('sound recipes', () => {
  it('last until their last layer ends', () => {
    expect(soundDurationMs(beep)).toBe(100);
    expect(
      soundDurationMs({
        peak: 1,
        layers: [
          { ...tone, durMs: 50 },
          { ...tone, startMs: 80, durMs: 70 },
        ],
      }),
    ).toBe(150);
  });

  it('render to the right number of samples', () => {
    expect(renderSound(beep, RATE)).toHaveLength(800);
  });

  it('peak exactly at the recipe level, whatever the layers add up to', () => {
    expect(peakOf(renderSound(beep, RATE))).toBeCloseTo(0.5, 6);
    const loud: SoundRecipe = { ...beep, layers: [tone, tone, tone] };
    expect(peakOf(renderSound(loud, RATE))).toBeCloseTo(0.5, 6);
  });

  it('start silent and end silent, so they never click', () => {
    const s = renderSound(beep, RATE);
    expect(Math.abs(s[0] ?? 1)).toBe(0);
    expect(Math.abs(s[s.length - 1] ?? 1)).toBe(0);
  });

  it('give the same samples every time', () => {
    expect(renderSound(SOUNDS.blast, RATE)).toEqual(renderSound(SOUNDS.blast, RATE));
  });

  it('noise with a different seed sounds different', () => {
    const a = renderSound(SOUNDS.blast, RATE);
    const layers = SOUNDS.blast.layers.map((l) => (l.kind === 'noise' ? { ...l, seed: 99 } : l));
    expect(renderSound({ ...SOUNDS.blast, layers }, RATE)).not.toEqual(a);
  });
});

describe('envelopes', () => {
  const layer = { durMs: 100, attackMs: 10, gain: 1 };
  it('rise during the attack, then decay to nothing', () => {
    expect(envelope(0, layer)).toBe(0);
    expect(envelope(5, layer)).toBeCloseTo(0.5);
    expect(envelope(10, layer)).toBe(1);
    expect(envelope(55, layer)).toBeCloseTo(0.25);
    expect(envelope(100, layer)).toBe(0);
    expect(envelope(-1, layer)).toBe(0);
  });
  it('decay faster with a steeper curve', () => {
    expect(envelope(55, { ...layer, curve: 3 })).toBeLessThan(envelope(55, { ...layer, curve: 1 }));
  });
});

describe('waveforms', () => {
  it('stay between -1 and 1 over a cycle', () => {
    for (const wave of ['sine', 'square', 'triangle', 'saw'] as const) {
      for (let p = 0; p < 1; p += 0.01) {
        const v = waveSample(wave, p);
        expect(Math.abs(v)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('the game sounds', () => {
  const names = Object.keys(SOUNDS) as SoundName[];

  it.each(names)('%s renders cleanly at a safe level', (name) => {
    const s = renderSound(SOUNDS[name], 44_100);
    expect(s.length).toBeGreaterThan(0);
    expect(s.every(Number.isFinite)).toBe(true);
    expect(peakOf(s)).toBeLessThanOrEqual(0.8 + 1e-6);
    expect(Math.abs(s[s.length - 1] ?? 1)).toBe(0);
  });

  it.each(names)('%s is short enough not to pile up (under 2 s)', (name) => {
    expect(soundDurationMs(SOUNDS[name])).toBeLessThanOrEqual(2000);
  });
});
