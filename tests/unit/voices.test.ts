import { describe, expect, it } from 'vitest';
import { AUDIO, SOUNDS, type SoundName } from '../../src/config/tuning';
import { createVoiceLimiter, startVoice, voicesPlaying } from '../../src/logic/voices';

describe('voice limiter', () => {
  it('starts copies until the cap, then refuses', () => {
    const v = createVoiceLimiter();
    expect(startVoice(v, 'blast', 0, 100, 2)).toBe(0);
    expect(startVoice(v, 'blast', 10, 100, 2)).toBe(1);
    expect(startVoice(v, 'blast', 20, 100, 2)).toBeNull();
    expect(voicesPlaying(v, 'blast', 20)).toBe(2);
  });

  it('frees a voice when its sound ends', () => {
    const v = createVoiceLimiter();
    startVoice(v, 'blast', 0, 100, 2);
    startVoice(v, 'blast', 50, 100, 2);
    expect(startVoice(v, 'blast', 99, 100, 2)).toBeNull();
    expect(startVoice(v, 'blast', 100, 100, 2)).toBe(0);
    expect(voicesPlaying(v, 'blast', 151)).toBe(1);
  });

  it('counts each sound separately', () => {
    const v = createVoiceLimiter();
    expect(startVoice(v, 'launch', 0, 100, 1)).toBe(0);
    expect(startVoice(v, 'launch', 0, 100, 1)).toBeNull();
    expect(startVoice(v, 'blast', 0, 100, 1)).toBe(0);
    expect(voicesPlaying(v, 'cityHit', 0)).toBe(0);
  });

  it('plays nothing with a cap of 0', () => {
    expect(startVoice(createVoiceLimiter(), 'launch', 0, 100, 0)).toBeNull();
  });
});

describe('audio tuning', () => {
  const names = Object.keys(SOUNDS) as SoundName[];

  it('gives every sound a cap of at least one copy', () => {
    for (const name of names) expect(AUDIO.voices[name]).toBeGreaterThanOrEqual(1);
  });

  it('keeps the master volume under the safe limit', () => {
    expect(AUDIO.masterVolume).toBeGreaterThan(0);
    expect(AUDIO.masterVolume).toBeLessThanOrEqual(AUDIO.maxMasterVolume);
    expect(AUDIO.maxMasterVolume).toBeLessThanOrEqual(1);
  });
});
