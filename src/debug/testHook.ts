import type Phaser from 'phaser';
import type { Point } from '../logic/geometry';
import type { GameScene, GameSnapshot } from '../scenes/GameScene';

/**
 * Test-only hook for Playwright (ADR-006). It is loaded only in the e2e build
 * (`vite build --mode e2e`), so the build players get never includes it.
 * Add controls here as the game grows (spawn an enemy, skip a level, ...).
 */
export interface TestHook {
  /** The key of the scene that is running, or null while loading. */
  scene(): string | null;
  snapshot(): GameSnapshot | null;
  /** Launches an enemy warhead from `origin` towards `target` at `speed` px/s. */
  launchWarhead(origin: Point, target: Point, speed: number): void;
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
  window.__game = {
    launchWarhead: (origin, target, speed) => scene().testLaunchWarhead(origin, target, speed),
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
