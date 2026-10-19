import Phaser from 'phaser';
import type { Point } from '../logic/geometry';
import type { GameScene, GameSnapshot } from '../scenes/GameScene';
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
  /** Starts the game from the title screen, as a tap would. */
  start(): void;
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
  /** Sends a bomber or satellite across the sky at row `y`; `dir` 1 flies right. */
  launchRaider(kind: 'bomber' | 'satellite', y: number, dir: 1 | -1): void;
  /** Stops the wave launching warheads but keeps it open, so a test controls every one. */
  holdWave(): void;
  /** Launches nothing more, so the wave is cleared once the sky is empty. */
  finishWave(): void;
  /** Whether a tap would start a new game now. */
  canRestart(): boolean;
  /** Changes how long taps are ignored after the wave ends, so tests don't race the clock. */
  setRestartDelay(ms: number): void;
  /** Sets the score, e.g. to just below a bonus city. */
  setScore(score: number): void;
}

declare global {
  interface Window {
    __game?: TestHook;
  }
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
    start: () => title()?.startGame(),
    hide: () => game.events.emit(Phaser.Core.Events.HIDDEN),
    launchWarhead: (origin, target, speed, split) =>
      scene().testLaunchWarhead(origin, target, speed, split),
    launchRaider: (kind, y, dir) => scene().testLaunchRaider(kind, y, dir),
    holdWave: () => scene().testHoldWave(),
    finishWave: () => scene().testFinishWave(),
    canRestart: () => scene().testCanRestart(),
    setRestartDelay: (ms) => scene().testSetRestartDelay(ms),
    setScore: (score) => scene().testSetScore(score),
    scene: () => game.scene.getScenes(true)[0]?.scene.key ?? null,
    snapshot: () => {
      const s = game.scene.getScene('Game') as GameScene | null;
      return s && game.scene.isActive('Game') ? s.snapshot() : null;
    },
  };
}
