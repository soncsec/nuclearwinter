import type Phaser from 'phaser';
import { FONT_FAMILY } from '../assets/manifest';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, GROUND_Y, HUD, SKY, STARS } from '../config/tuning';
import { starField } from '../logic/scenery';
import type { KeyValueStore } from '../logic/highScore';

/** The night sky, the stars, the distant skyline and the ground, shared by the title and game screens. */
export function drawBackdrop(scene: Phaser.Scene): void {
  const sky = scene.add.graphics();
  sky.fillGradientStyle(SKY.top, SKY.top, SKY.horizon, SKY.horizon, 1);
  sky.fillRect(0, 0, GAME_WIDTH, GROUND_Y);
  for (const star of starField(STARS.seed, STARS.count, GAME_WIDTH, STARS.maxY)) {
    sky.fillStyle(STARS.color, STARS.minAlpha + star.brightness * (1 - STARS.minAlpha));
    sky.fillRect(star.x, star.y, 1, 1);
    if (star.brightness > STARS.glintAbove) {
      sky.fillStyle(STARS.color, STARS.glintAlpha);
      sky.fillRect(star.x - 1, star.y, 1, 1).fillRect(star.x + 1, star.y, 1, 1);
      sky.fillRect(star.x, star.y - 1, 1, 1).fillRect(star.x, star.y + 1, 1, 1);
    }
  }
  // The skyline is tiled across the screen; its sky is transparent, so the stars show above it.
  scene.add
    .tileSprite(0, SKY.skylineTop, GAME_WIDTH, SKY.skylineHeight, 'skylineNight')
    .setOrigin(0, 0)
    .setTint(SKY.skylineTint);
  scene.add
    .rectangle(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y, COLORS.ground)
    .setOrigin(0, 0);
  scene.add.rectangle(0, GROUND_Y, GAME_WIDTH, 1, COLORS.groundEdge).setOrigin(0, 0);
}

/** A line of centred pixel-font text with its top edge at `y`. */
export function centredText(
  scene: Phaser.Scene,
  y: number,
  text: string,
  options: { color?: string; fontSizePx?: number } = {},
): Phaser.GameObjects.Text {
  return scene.add
    .text(GAME_WIDTH / 2, y, text, {
      fontFamily: FONT_FAMILY,
      fontSize: `${options.fontSizePx ?? HUD.fontSizePx}px`,
      color: options.color ?? COLORS.hud,
      align: 'center',
    })
    .setOrigin(0.5, 0);
}

/** This browser's localStorage, or null where it is blocked (some private modes throw). */
export function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
