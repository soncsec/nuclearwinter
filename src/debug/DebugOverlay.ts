import Phaser from 'phaser';
import { FONT_FAMILY } from '../assets/manifest';
import { COLORS, DEBUG_OVERLAY, HUD } from '../config/tuning';
import type { GameScene } from '../scenes/GameScene';

/**
 * Debug overlay (ROADMAP M2.7): frame rate and the simulation's counts, for tuning the waves
 * and checking phones. main.ts loads it in dev and e2e builds, and in production only with
 * ?debug in the address. It shows when the address has ?debug; outside production the
 * backquote key also toggles it. It only reads game state and draws text on the canvas.
 */
export class DebugScene extends Phaser.Scene {
  private text!: Phaser.GameObjects.Text;
  private frameMs: number[] = [];
  private shown = false;

  constructor() {
    super('Debug');
  }

  create(): void {
    this.shown = new URLSearchParams(window.location.search).has(DEBUG_OVERLAY.queryParam);
    this.text = this.add
      .text(DEBUG_OVERLAY.x, DEBUG_OVERLAY.y, '', {
        fontFamily: FONT_FAMILY,
        fontSize: `${HUD.fontSizePx}px`,
        color: COLORS.hud,
        backgroundColor: '#000000',
      })
      .setAlpha(DEBUG_OVERLAY.alpha)
      .setVisible(this.shown);
    // Phaser can hand the same browser event over more than once (seen in WebKit), which would
    // toggle the overlay off and straight back on, so each event is handled only once.
    const seenKeys = new WeakSet<KeyboardEvent>();
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (seenKeys.has(e)) return;
      seenKeys.add(e);
      if (import.meta.env.MODE === 'production') return;
      if (e.key === DEBUG_OVERLAY.toggleKey && !e.repeat) this.toggle();
    });
  }

  override update(_time: number, deltaMs: number): void {
    this.frameMs.push(deltaMs);
    if (this.frameMs.length > DEBUG_OVERLAY.sampleFrames) this.frameMs.shift();
    if (!this.shown) return;
    const avg = this.frameMs.reduce((a, b) => a + b, 0) / this.frameMs.length;
    const worst = Math.max(...this.frameMs);
    const lines = [`FPS ${Math.round(1000 / avg)}  WORST ${Math.round(1000 / worst)}`];
    const game = this.game.scene.getScene('Game') as GameScene | null;
    if (game && this.game.scene.isActive('Game')) {
      const s = game.debugStats();
      lines.push(
        `WAVE ${s.wave}${s.paused ? ' PAUSED' : ''}  TO LAUNCH ${s.toLaunch}`,
        `WARHEADS ${s.warheads}  MISSILES ${s.interceptors}  BLASTS ${s.blasts}`,
        `RAIDERS ${s.raiders}  FX ${s.effects}/${s.effectPool}`,
      );
    }
    this.text.setText(lines);
  }

  toggle(): void {
    this.shown = !this.shown;
    this.text.setVisible(this.shown);
  }

  /** The lines on screen, or null while hidden (for the test hook). */
  lines(): string[] | null {
    return this.shown ? this.text.text.split('\n') : null;
  }
}

/** Adds the overlay on top of every other scene and starts it. */
export function installDebugOverlay(game: Phaser.Game): void {
  game.scene.add('Debug', DebugScene, true);
}
