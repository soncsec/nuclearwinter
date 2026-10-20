import Phaser from 'phaser';
import { AUDIO, SOUNDS, type SoundName } from '../config/tuning';
import { renderSound, soundDurationMs } from '../logic/sound';
import { createVoiceLimiter, startVoice, type VoiceLimiter } from '../logic/voices';

const NAMES = Object.keys(SOUNDS) as SoundName[];
const DURATION_MS = Object.fromEntries(
  NAMES.map((name) => [name, soundDurationMs(SOUNDS[name])]),
) as Record<SoundName, number>;
const cacheKey = (name: SoundName): string => `sound.${name}`;

/** What the e2e tests can see of the sound (M6.2). */
export interface SoundStats {
  /** 'webaudio' when sounds can play; 'none' where the browser has no Web Audio. */
  output: 'webaudio' | 'none';
  muted: boolean;
  /** Whether sounds play now: on, with Web Audio, and unlocked by the player's first tap. */
  ready: boolean;
  /** Copies of each sound started this game. */
  played: Record<SoundName, number>;
  /** Copies not started because every voice of that sound was busy. */
  capped: number;
}

/**
 * Renders every sound recipe into a Web Audio buffer, once per page: the buffers live in
 * Phaser's audio cache, so later games reuse them. Returns null without Web Audio.
 */
function buildBuffers(scene: Phaser.Scene): Phaser.Sound.WebAudioSoundManager | null {
  const manager = scene.sound;
  if (!(manager instanceof Phaser.Sound.WebAudioSoundManager)) return null;
  const { context } = manager;
  for (const name of NAMES) {
    if (scene.cache.audio.exists(cacheKey(name))) continue;
    const samples = renderSound(SOUNDS[name], context.sampleRate);
    const buffer = context.createBuffer(1, samples.length, context.sampleRate);
    buffer.getChannelData(0).set(samples);
    scene.cache.audio.add(cacheKey(name), buffer);
  }
  return manager;
}

/**
 * The game's sound effects (ADR-NW09): generated buffers played through Phaser's sound
 * manager, which waits for the player's first tap or key (browsers block sound before one)
 * and pauses with the page. Each sound has a few pooled voices, and no more copies than that
 * play at once. With mute on, nothing is created or played.
 */
export class GameAudio {
  private readonly manager: Phaser.Sound.WebAudioSoundManager | null;
  private readonly voices = new Map<SoundName, Phaser.Sound.BaseSound[]>();
  private readonly limiter: VoiceLimiter = createVoiceLimiter();
  private readonly played = Object.fromEntries(NAMES.map((n) => [n, 0])) as Record<
    SoundName,
    number
  >;
  private capped = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly muted: boolean,
  ) {
    scene.sound.mute = muted;
    scene.sound.volume = Math.min(AUDIO.masterVolume, AUDIO.maxMasterVolume);
    this.manager = muted ? null : buildBuffers(scene);
    const manager = this.manager;
    if (!manager) return;
    for (const name of NAMES) {
      this.voices.set(
        name,
        Array.from({ length: AUDIO.voices[name] }, () => manager.add(cacheKey(name))),
      );
    }
    // The sound manager outlives the scene, so its voices go when the scene does.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const pool of this.voices.values()) for (const sound of pool) sound.destroy();
      this.voices.clear();
    });
  }

  /** Plays `name` if sound is on and a voice of it is free. */
  play(name: SoundName): void {
    // Before the first tap the browser holds sound back; queued sounds would all play late.
    if (!this.manager || this.manager.locked) return;
    const voice = startVoice(
      this.limiter,
      name,
      this.scene.time.now,
      DURATION_MS[name],
      AUDIO.voices[name],
    );
    if (voice === null) {
      this.capped++;
      return;
    }
    this.voices.get(name)?.[voice]?.play();
    this.played[name]++;
  }

  stats(): SoundStats {
    return {
      output: this.scene.sound instanceof Phaser.Sound.WebAudioSoundManager ? 'webaudio' : 'none',
      muted: this.muted,
      ready: this.manager !== null && !this.manager.locked,
      played: { ...this.played },
      capped: this.capped,
    };
  }
}
