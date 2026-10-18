import Phaser from 'phaser';
import { IMAGES, SHEETS } from '../assets/manifest';
import {
  COLORS,
  DEFAULT_SEED,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_Y,
  SHAPES,
  SKY,
} from '../config/tuning';
import { createWorld, type Phase, type World } from '../logic/world';

/** Read-only view of the game state, used by the e2e test hook. */
export interface GameSnapshot {
  seed: number;
  phase: Phase;
  timeMs: number;
  score: number;
  cities: boolean[];
  bases: boolean[];
}

/** The game screen: draws the world from src/logic and passes input to it. */
export class GameScene extends Phaser.Scene {
  private world!: World;
  private seed = DEFAULT_SEED;
  private defenses!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Game');
  }

  preload(): void {
    for (const [key, path] of Object.entries(IMAGES)) this.load.image(key, path);
    for (const [key, sheet] of Object.entries(SHEETS)) {
      this.load.spritesheet(key, sheet.path, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    }
  }

  create(): void {
    this.seed = seedFromUrl();
    this.world = createWorld();

    // The distant skyline, tiled across the screen. Its own sky matches the game's sky colour.
    this.cameras.main.setBackgroundColor(SKY.color);
    this.add
      .tileSprite(0, SKY.skylineTop, GAME_WIDTH, SKY.skylineHeight, 'skylineFar')
      .setOrigin(0, 0);

    this.add
      .rectangle(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y, COLORS.ground)
      .setOrigin(0, 0);
    this.add.rectangle(0, GROUND_Y, GAME_WIDTH, 1, COLORS.groundEdge).setOrigin(0, 0);

    this.defenses = this.add.graphics();
    this.drawDefenses();
  }

  snapshot(): GameSnapshot {
    const w = this.world;
    return {
      seed: this.seed,
      phase: w.phase,
      timeMs: w.timeMs,
      score: w.score,
      cities: w.cities.map((c) => c.alive),
      bases: w.bases.map((b) => b.alive),
    };
  }

  /** Cities and bases: standing, or rubble once destroyed. */
  private drawDefenses(): void {
    const g = this.defenses.clear();
    for (const city of this.world.cities) {
      if (city.alive) {
        for (const [dx, w, h] of SHAPES.cityBlocks) {
          g.fillStyle(COLORS.city).fillRect(city.x + dx, GROUND_Y - h, w, h);
          g.fillStyle(COLORS.cityWindow).fillRect(city.x + dx + 1, GROUND_Y - h + 2, 1, 1);
        }
      } else {
        g.fillStyle(COLORS.rubble);
        g.fillRect(city.x - 9, GROUND_Y - SHAPES.rubbleHeight, 19, SHAPES.rubbleHeight);
      }
    }
    for (const base of this.world.bases) {
      g.fillStyle(base.alive ? COLORS.base : COLORS.baseDestroyed);
      const h = base.alive ? SHAPES.baseHeight : SHAPES.rubbleHeight;
      g.fillTriangle(
        base.x - SHAPES.baseHalfWidth,
        GROUND_Y,
        base.x + SHAPES.baseHalfWidth,
        GROUND_Y,
        base.x,
        GROUND_Y - h,
      );
    }
  }
}

/** Seed from the URL (?seed=123) for repeatable runs, otherwise the default. */
function seedFromUrl(): number {
  const raw = new URLSearchParams(window.location.search).get('seed');
  const n = raw === null ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : DEFAULT_SEED;
}
