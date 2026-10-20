import Phaser from 'phaser';
import type { Point } from '../logic/geometry';
import type { GameScene, GameSnapshot } from '../scenes/GameScene';
import type { HelpScene } from '../scenes/HelpScene';
import type { SettingsScene } from '../scenes/SettingsScene';
import type { TitleScene } from '../scenes/TitleScene';
import type { DebugScene } from './DebugOverlay';

/**
 * Test-only hook for Playwright (ADR-006). It is loaded only in the e2e build
 * (`vite build --mode e2e`), so the build players get never includes it.
 * Add controls here as the game grows (spawn an enemy, skip a level, ...).
 */
export interface TestHook {
  /** The key of the scene that is running, or null while loading. */
  scene(): string | null;
  /** The debug overlay's lines, or null while it is hidden. */
  debugLines(): string[] | null;
  /** The title screen's lines, top to bottom, or null when it is not showing. */
  titleLines(): string[] | null;
  /** The settings screen's lines, top to bottom, or null when it is not showing. */
  settingsLines(): string[] | null;
  /** The "How to play" page showing and its lines, or null when it is not showing. */
  help(): { page: number; pages: number; lines: string[] } | null;
  /** Starts a game from the title screen, as a tap would: normal, or the daily challenge. */
  start(mode?: 'normal' | 'daily'): void;
  /** Tells the game the page was hidden, as switching tabs or apps does. */
  hide(): void;
  snapshot(): GameSnapshot | null;
  /**
   * Launches an enemy warhead from `origin` towards `target` at `speed` px/s. With `split`, it
   * is a MIRV that splits into `count` warheads at row `atY`.
   */
  launchWarhead(
    origin: Point,
    target: Point,
    speed: number,
    split?: { atY: number; count: number },
  ): void;
  /** Sends a bomber or satellite across the sky at row `y`; `dir` 1 flies right; `x` to start mid-screen. */
  launchRaider(kind: 'bomber' | 'satellite', y: number, dir: 1 | -1, x?: number): void;
  /** Launches a smart bomb, which steers around blasts. */
  launchSmartBomb(origin: Point, target: Point, speed: number): void;
  /** Fires at a point as a tap would, so a test can time a shot exactly. */
  fireAt(target: Point): void;
  /** Stops the wave launching warheads but keeps it open, so a test controls every one. */
  holdWave(): void;
  /** Launches nothing more, so the wave is cleared once the sky is empty. */
  finishWave(): void;
  /** Whether a tap would start a new game now. */
  canRestart(): boolean;
  /** Changes how long taps are ignored after the wave ends, so tests don't race the clock. */
  setRestartDelay(ms: number): void;
  /** Feeds frame times (ms each, for `totalMs` in all) to the bloom watchdog. */
  feedFrames(frameMs: number, totalMs: number): void;
  /** Sets the score, e.g. to just below a bonus city. */
  setScore(score: number): void;
  /**
   * The loudest sample that reached the speakers since the last call (0 to 1), measured every
   * frame after the master volume; null without Web Audio.
   */
  soundPeak(): number | null;
}

declare global {
  interface Window {
    __game?: TestHook;
  }
}

/** Listens to the game's output after the master volume, every frame, keeping the peak. */
function soundMeter(game: Phaser.Game): () => number | null {
  let peak = 0;
  let started = false;
  return () => {
    const manager = game.sound;
    if (!(manager instanceof Phaser.Sound.WebAudioSoundManager)) return null;
    if (!started) {
      started = true;
      const analyser = manager.context.createAnalyser();
      analyser.fftSize = 2048;
      manager.masterVolumeNode.connect(analyser);
      const data = new Float32Array(analyser.fftSize);
      const sample = (): void => {
        analyser.getFloatTimeDomainData(data);
        for (const v of data) peak = Math.max(peak, Math.abs(v));
        requestAnimationFrame(sample);
      };
      sample();
    }
    const result = peak;
    peak = 0;
    return result;
  };
}

export function installTestHook(game: Phaser.Game): void {
  const scene = (): GameScene => {
    const s = game.scene.getScene('Game') as GameScene | null;
    if (!s || !game.scene.isActive('Game')) throw new Error('the game scene is not running');
    return s;
  };
  const title = (): TitleScene | null => {
    const t = game.scene.getScene('Title') as TitleScene | null;
    return t && game.scene.isActive('Title') ? t : null;
  };
  window.__game = {
    debugLines: () => (game.scene.getScene('Debug') as DebugScene | null)?.lines() ?? null,
    titleLines: () => title()?.lines() ?? null,
    settingsLines: () =>
      game.scene.isActive('Settings')
        ? ((game.scene.getScene('Settings') as SettingsScene | null)?.lines() ?? null)
        : null,
    help: () =>
      game.scene.isActive('Help')
        ? ((game.scene.getScene('Help') as HelpScene | null)?.state() ?? null)
        : null,
    start: (mode) => title()?.startGame(mode),
    hide: () => game.events.emit(Phaser.Core.Events.HIDDEN),
    launchWarhead: (origin, target, speed, split) =>
      scene().testLaunchWarhead(origin, target, speed, split),
    launchRaider: (kind, y, dir, x) => scene().testLaunchRaider(kind, y, dir, x),
    fireAt: (target) => scene().testFireAt(target),
    launchSmartBomb: (origin, target, speed) => scene().testLaunchSmartBomb(origin, target, speed),
    holdWave: () => scene().testHoldWave(),
    finishWave: () => scene().testFinishWave(),
    canRestart: () => scene().testCanRestart(),
    setRestartDelay: (ms) => scene().testSetRestartDelay(ms),
    setScore: (score) => scene().testSetScore(score),
    feedFrames: (frameMs, totalMs) => scene().testFeedFrames(frameMs, totalMs),
    soundPeak: soundMeter(game),
    scene: () => game.scene.getScenes(true)[0]?.scene.key ?? null,
    snapshot: () => {
      const s = game.scene.getScene('Game') as GameScene | null;
      return s && game.scene.isActive('Game') ? s.snapshot() : null;
    },
  };
}
