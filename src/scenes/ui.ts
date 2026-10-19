import type Phaser from 'phaser';
import { FONT_FAMILY } from '../assets/manifest';
import {
  COLORS,
  GAME_HEIGHT,
  GAME_WIDTH,
  GLOOM,
  GROUND_Y,
  HUD,
  SKY,
  STARS,
} from '../config/tuning';
import { skyLook } from '../logic/gloom';
import { starField } from '../logic/scenery';
import type { KeyValueStore } from '../logic/highScore';

/**
 * The night sky, the stars, the distant skyline and the ground, shared by the title and game
 * screens. `setGloom` darkens it as cities are lost (M4.4).
 */
export class Backdrop {
  private readonly sky: Phaser.GameObjects.Graphics;
  private readonly stars: Phaser.GameObjects.Graphics;
  private readonly skyline: Phaser.GameObjects.TileSprite;
  private readonly embers: Phaser.GameObjects.Graphics;
  private gloom = -1;

  constructor(scene: Phaser.Scene) {
    this.sky = scene.add.graphics();
    this.stars = scene.add.graphics();
    for (const star of starField(STARS.seed, STARS.count, GAME_WIDTH, STARS.maxY)) {
      this.stars.fillStyle(STARS.color, STARS.minAlpha + star.brightness * (1 - STARS.minAlpha));
      this.stars.fillRect(star.x, star.y, 1, 1);
      if (star.brightness > STARS.glintAbove) {
        this.stars.fillStyle(STARS.color, STARS.glintAlpha);
        this.stars.fillRect(star.x - 1, star.y, 1, 1).fillRect(star.x + 1, star.y, 1, 1);
        this.stars.fillRect(star.x, star.y - 1, 1, 1).fillRect(star.x, star.y + 1, 1, 1);
      }
    }
    // The skyline is tiled across the screen; its sky is transparent, so the stars show above it.
    this.skyline = scene.add
      .tileSprite(0, SKY.skylineTop, GAME_WIDTH, SKY.skylineHeight, 'skylineNight')
      .setOrigin(0, 0);
    // Burning cities light the haze from below: transparent at the top of the band, solid at the ground.
    this.embers = scene.add.graphics();
    this.embers.fillGradientStyle(
      GLOOM.emberColor,
      GLOOM.emberColor,
      GLOOM.emberColor,
      GLOOM.emberColor,
      0,
      0,
      1,
      1,
    );
    this.embers.fillRect(0, GROUND_Y - GLOOM.emberHeight, GAME_WIDTH, GLOOM.emberHeight);
    scene.add
      .rectangle(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y, COLORS.ground)
      .setOrigin(0, 0);
    scene.add.rectangle(0, GROUND_Y, GAME_WIDTH, 1, COLORS.groundEdge).setOrigin(0, 0);
    this.setGloom(0);
  }

  /** Redraws the sky for `gloom` (0 = clear night, 1 = every city lost). */
  setGloom(gloom: number): void {
    if (gloom === this.gloom) return;
    this.gloom = gloom;
    const look = skyLook(gloom, SKY);
    this.sky.clear();
    this.sky.fillGradientStyle(look.top, look.top, look.horizon, look.horizon, 1);
    this.sky.fillRect(0, 0, GAME_WIDTH, GROUND_Y);
    this.stars.setAlpha(look.starAlpha).setVisible(look.starAlpha > 0);
    this.skyline.setTint(look.skylineTint);
    this.embers.setAlpha(look.emberAlpha).setVisible(look.emberAlpha > 0);
  }
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
