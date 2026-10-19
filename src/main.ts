import Phaser from 'phaser';
import './style.css';
import { DEBUG_OVERLAY, GAME_HEIGHT, GAME_WIDTH } from './config/tuning';
import { deviceZoom } from './logic/scaling';
import { FONT_FAMILY } from './assets/manifest';
import { GameScene } from './scenes/GameScene';
import { SettingsScene } from './scenes/SettingsScene';
import { TitleScene } from './scenes/TitleScene';

// Whole-number zoom in device pixels, given to Phaser in CSS pixels (ADR-NW02).
const zoomForWindow = (): number =>
  deviceZoom(
    window.innerWidth,
    window.innerHeight,
    window.devicePixelRatio,
    GAME_WIDTH,
    GAME_HEIGHT,
  ).cssZoom;

// Phaser draws text once, so the font must be ready before the first scene starts.
await document.fonts.load(`8px ${FONT_FAMILY}`);

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#05070f',
  pixelArt: true,
  roundPixels: true,
  scale: {
    // Whole-number device-pixel zoom keeps pixels crisp; the page's CSS centers the canvas.
    mode: Phaser.Scale.NONE,
    zoom: zoomForWindow(),
  },
  scene: [TitleScene, SettingsScene, GameScene],
});

window.addEventListener('resize', () => {
  const zoom = zoomForWindow();
  if (game.scale.zoom !== zoom) game.scale.setZoom(zoom);
});

// The debug overlay (frame rate and counts) loads in dev and e2e builds, and in production only
// when the address has ?debug (owner decision 2026-10-19, to measure phones). It is a separate
// chunk, so players who don't ask for it never download it.
const wantDebug =
  import.meta.env.MODE !== 'production' ||
  new URLSearchParams(window.location.search).has(DEBUG_OVERLAY.queryParam);
if (wantDebug) {
  void import('./debug/DebugOverlay').then(({ installDebugOverlay }) => installDebugOverlay(game));
}

// The e2e build adds a test hook. Vite replaces MODE at build time, so this
// branch and the hook module are left out of the normal build entirely.
if (import.meta.env.MODE === 'e2e') {
  void import('./debug/testHook').then(({ installTestHook }) => installTestHook(game));
}
