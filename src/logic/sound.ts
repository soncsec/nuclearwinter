/**
 * Sound effects generated in code (ADR-NW09): each sound is a recipe of layers (tones and
 * filtered noise, each with its own envelope), rendered here to plain samples. The scenes copy
 * the samples into Web Audio buffers; this file knows nothing about Phaser or the browser.
 */
import { createRng } from './rng';

export type Waveform = 'sine' | 'square' | 'triangle' | 'saw';

interface LayerTiming {
  /** When the layer starts, from the start of the sound. */
  readonly startMs?: number;
  readonly durMs: number;
  /** Linear fade-in; the rest of the layer decays to silence. */
  readonly attackMs: number;
  /** Shape of the decay: 1 is a straight line, higher dies away faster. */
  readonly curve?: number;
  /** Loudness relative to the sound's other layers. */
  readonly gain: number;
}

/** A tone gliding from one pitch to another (exponentially, as the ear hears pitch). */
export interface ToneLayer extends LayerTiming {
  readonly kind: 'tone';
  readonly wave: Waveform;
  readonly fromHz: number;
  readonly toHz: number;
}

/** Seeded white noise through a low-pass filter whose cutoff glides over the layer. */
export interface NoiseLayer extends LayerTiming {
  readonly kind: 'noise';
  readonly seed: number;
  readonly cutoffFromHz: number;
  readonly cutoffToHz: number;
}

export type SoundLayer = ToneLayer | NoiseLayer;

export interface SoundRecipe {
  readonly layers: readonly SoundLayer[];
  /** The loudest sample of the finished sound, between 0 and 1. */
  readonly peak: number;
}

/** Fade applied to the last moments of every sound, so it never ends on a click. */
const END_FADE_MS = 5;

/** How long a recipe lasts: until its last layer ends. */
export function soundDurationMs(recipe: SoundRecipe): number {
  return recipe.layers.reduce((end, l) => Math.max(end, (l.startMs ?? 0) + l.durMs), 0);
}

/** Envelope at time `t` ms into a layer: linear attack, then a decay to zero at the end. */
export function envelope(t: number, layer: LayerTiming): number {
  if (t < 0 || t >= layer.durMs) return 0;
  const attack = Math.min(layer.attackMs, layer.durMs);
  if (t < attack) return t / attack;
  const decayLen = layer.durMs - attack;
  if (decayLen <= 0) return 1;
  const left = 1 - (t - attack) / decayLen;
  return left ** (layer.curve ?? 2);
}

/** One cycle of a waveform at phase `p` in [0, 1). */
export function waveSample(wave: Waveform, p: number): number {
  switch (wave) {
    case 'sine':
      return Math.sin(2 * Math.PI * p);
    case 'square':
      return p < 0.5 ? 1 : -1;
    case 'triangle':
      return 1 - 4 * Math.abs(p - 0.5);
    case 'saw':
      return 2 * p - 1;
  }
}

/** Exponential glide from `from` to `to` as `x` goes from 0 to 1. */
function glide(from: number, to: number, x: number): number {
  return from * (to / from) ** x;
}

function addTone(out: Float32Array, layer: ToneLayer, sampleRate: number): void {
  const start = Math.round(((layer.startMs ?? 0) * sampleRate) / 1000);
  const count = Math.round((layer.durMs * sampleRate) / 1000);
  let phase = 0;
  for (let i = 0; i < count && start + i < out.length; i++) {
    const tMs = (i * 1000) / sampleRate;
    const hz = glide(layer.fromHz, layer.toHz, i / count);
    out[start + i] =
      (out[start + i] ?? 0) + waveSample(layer.wave, phase) * envelope(tMs, layer) * layer.gain;
    phase = (phase + hz / sampleRate) % 1;
  }
}

function addNoise(out: Float32Array, layer: NoiseLayer, sampleRate: number): void {
  const start = Math.round(((layer.startMs ?? 0) * sampleRate) / 1000);
  const count = Math.round((layer.durMs * sampleRate) / 1000);
  const rng = createRng(layer.seed);
  let filtered = 0;
  for (let i = 0; i < count && start + i < out.length; i++) {
    const tMs = (i * 1000) / sampleRate;
    const cutoff = glide(layer.cutoffFromHz, layer.cutoffToHz, i / count);
    // One-pole low-pass filter: the higher the cutoff, the more of the raw noise gets through.
    const a = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);
    filtered += a * (rng.next() * 2 - 1 - filtered);
    out[start + i] = (out[start + i] ?? 0) + filtered * envelope(tMs, layer) * layer.gain;
  }
}

/**
 * Renders a recipe to mono samples at `sampleRate`, scaled so the loudest sample is exactly
 * `recipe.peak` and faded out over the last few milliseconds. The same recipe always gives
 * the same samples.
 */
export function renderSound(recipe: SoundRecipe, sampleRate: number): Float32Array {
  const out = new Float32Array(Math.ceil((soundDurationMs(recipe) * sampleRate) / 1000));
  for (const layer of recipe.layers) {
    if (layer.kind === 'tone') addTone(out, layer, sampleRate);
    else addNoise(out, layer, sampleRate);
  }
  const fade = Math.min(out.length, Math.round((END_FADE_MS * sampleRate) / 1000));
  for (let i = 0; i < fade; i++) {
    const at = out.length - 1 - i;
    out[at] = (out[at] ?? 0) * (i / fade);
  }
  let loudest = 0;
  for (const s of out) loudest = Math.max(loudest, Math.abs(s));
  if (loudest > 0) {
    const scale = recipe.peak / loudest;
    for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) * scale;
  }
  return out;
}
