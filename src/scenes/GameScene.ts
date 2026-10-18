import Phaser from 'phaser';
import { FONT_FAMILY, IMAGES, SHEETS } from '../assets/manifest';
import {
  AMMO_PIPS,
  BASE_KEYS,
  COLORS,
  DEFAULT_SEED,
  EFFECTS,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_Y,
  HUD,
  MAX_STEPS_PER_FRAME,
  SCREENS,
  SHAPES,
  SKY,
  STEP_MS,
  TRAILS,
} from '../config/tuning';
import { EffectPool, type EffectKind } from '../entities/EffectPool';
import { blastRadius } from '../logic/blast';
import type { Point } from '../logic/geometry';
import { createRng, type Rng } from '../logic/rng';
import { formatScore } from '../logic/scoring';
import {
  createWorld,
  drainEvents,
  fire,
  launchWarhead,
  startNextWave,
  step,
  type Phase,
  type World,
} from '../logic/world';

/** Read-only view of the game state, used by the e2e test hook. */
export interface GameSnapshot {
  seed: number;
  phase: Phase;
  /** The wave being played, 1 for the first. */
  wave: number;
  /** The wave number as the HUD shows it. */
  hudWave: string;
  /** The "WAVE n" banner at the start of a wave, or null when hidden. */
  waveBanner: string | null;
  /** Every banner shown this game, oldest first, so tests needn't race the banner's timer. */
  bannersShown: string[];
  timeMs: number;
  score: number;
  cities: boolean[];
  bases: boolean[];
  /** Missiles left at each base. */
  ammo: number[];
  /** Whether each base shows its "OUT" label. */
  outLabels: boolean[];
  warheads: Point[];
  interceptors: number;
  blasts: number;
  /** The most recent counter-missile launch, or null before the first. */
  lastShot: { baseIndex: number; target: Point } | null;
  /** The score as the HUD shows it. */
  hudScore: string;
  /** Explosion sprites playing right now. */
  effects: number;
  /** Explosion sprites started so far, by kind. */
  effectsPlayed: { impact: number; cityHit: number };
  /** Lines of the wave-cleared or game-over message, empty while playing. */
  message: string[];
}

const IMPACT: EffectKind = { key: 'impact', frames: SHEETS.impact.frames, ...EFFECTS.impact };
const CITY_HIT: EffectKind = { key: 'cityHit', frames: SHEETS.cityHit.frames, ...EFFECTS.cityHit };

/** The game screen: draws the world from src/logic and passes input to it. */
export class GameScene extends Phaser.Scene {
  private world!: World;
  private rng!: Rng;
  private seed = DEFAULT_SEED;
  private defenses!: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics;
  /** Real time not yet simulated; the world advances in fixed steps (ADR-NW03). */
  private pendingMs = 0;
  private lastShot: GameSnapshot['lastShot'] = null;
  private effects!: EffectPool;
  private effectsPlayed = { impact: 0, cityHit: 0 };
  private scoreText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private waveBanner!: Phaser.GameObjects.Text;
  /** Real time (ms) when the "WAVE n" banner should hide. */
  private bannerUntil = 0;
  private bannersShown: string[] = [];
  private messageLines: Phaser.GameObjects.Text[] = [];
  private messagePanel!: Phaser.GameObjects.Rectangle;
  private outLabels: Phaser.GameObjects.Text[] = [];
  /** Real time (ms) when the wave-cleared or game-over message appeared. */
  private endedAt: number | null = null;
  /** How long taps are ignored after the message appears (the test hook can change it). */
  private restartDelayMs: number = SCREENS.restartDelayMs;

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
    this.seed = seedFromUrl() ?? randomSeed();
    this.rng = createRng(this.seed);
    this.world = createWorld();
    this.pendingMs = 0;
    this.lastShot = null;

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
    this.outLabels = this.world.bases.map((b) =>
      this.add
        .text(b.x, AMMO_PIPS.outLabelTop, 'OUT', {
          fontFamily: FONT_FAMILY,
          fontSize: `${HUD.fontSizePx}px`,
          color: COLORS.ammoOut,
        })
        .setOrigin(0.5, 0)
        .setVisible(false),
    );
    this.drawDefenses();
    this.fx = this.add.graphics();
    this.effects = new EffectPool(this, [IMPACT, CITY_HIT], EFFECTS.poolSize);
    this.effectsPlayed = { impact: 0, cityHit: 0 };

    this.scoreText = this.add.text(HUD.margin, HUD.margin, '', {
      fontFamily: FONT_FAMILY,
      fontSize: `${HUD.fontSizePx}px`,
      color: COLORS.hud,
    });
    this.updateScore();
    this.waveText = this.add
      .text(GAME_WIDTH - HUD.margin, HUD.margin, '', {
        fontFamily: FONT_FAMILY,
        fontSize: `${HUD.fontSizePx}px`,
        color: COLORS.hud,
      })
      .setOrigin(1, 0);

    this.endedAt = null;
    this.messagePanel = this.add
      .rectangle(0, SCREENS.panelTop, GAME_WIDTH, SCREENS.panelHeight, COLORS.messagePanel)
      .setOrigin(0, 0)
      .setAlpha(SCREENS.panelAlpha)
      .setVisible(false);
    this.messageLines = [SCREENS.titleY, SCREENS.detailY, SCREENS.promptY].map((y) =>
      this.add
        .text(GAME_WIDTH / 2, y, '', {
          fontFamily: FONT_FAMILY,
          fontSize: `${HUD.fontSizePx}px`,
          color: COLORS.hud,
          align: 'center',
        })
        .setOrigin(0.5, 0)
        .setVisible(false),
    );
    this.waveBanner = this.add
      .text(GAME_WIDTH / 2, SCREENS.titleY, '', {
        fontFamily: FONT_FAMILY,
        fontSize: `${HUD.fontSizePx}px`,
        color: COLORS.hud,
      })
      .setOrigin(0.5, 0)
      .setVisible(false);
    this.bannersShown = [];
    this.showWave();

    // One input path for mouse and touch (ADR-NW06): fire where the pointer goes down.
    // Between waves a tap starts the next wave; after game over it starts a new game.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.world.phase === 'playing') fire(this.world, { x: p.worldX, y: p.worldY });
      else if (!this.canRestart()) return;
      else if (this.world.phase === 'waveCleared') this.nextWave();
      else this.scene.restart();
    });

    // Desktop: a base key fires from that base at the mouse position.
    // Phaser's keyboard queue can hand the same browser event over more than once, so each
    // event is handled only the first time (otherwise one key press could fire several shots).
    const seenKeys = new WeakSet<KeyboardEvent>();
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (seenKeys.has(e)) return;
      seenKeys.add(e);
      if (e.repeat || this.world.phase !== 'playing') return;
      const baseIndex = BASE_KEYS.findIndex((keys) => keys.includes(e.key.toLowerCase()));
      if (baseIndex < 0) return;
      const p = this.input.activePointer;
      fire(this.world, { x: p.worldX, y: p.worldY }, baseIndex);
    });
  }

  override update(_time: number, deltaMs: number): void {
    this.pendingMs += deltaMs;
    let steps = 0;
    while (this.pendingMs >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      step(this.world, this.rng, STEP_MS);
      this.pendingMs -= STEP_MS;
      steps++;
    }
    // After a long stall, drop the backlog instead of fast-forwarding through it.
    if (steps === MAX_STEPS_PER_FRAME) this.pendingMs = 0;
    this.handleEvents();
    this.drawMoving();
    this.blinkPrompt();
    if (this.waveBanner.visible && this.time.now >= this.bannerUntil) {
      this.waveBanner.setVisible(false);
    }
  }

  /** For the test hook: launches a warhead directly. */
  testLaunchWarhead(origin: Point, target: Point, speed: number): void {
    launchWarhead(this.world, origin, target, speed);
  }

  /**
   * For the test hook: the wave launches nothing more, but stays open (it never counts as
   * cleared), so a test controls every warhead.
   */
  testHoldWave(): void {
    this.world.wave.nextLaunchMs = Number.POSITIVE_INFINITY;
  }

  /**
   * For the test hook: the wave launches nothing more, so it is cleared once the sky is empty.
   */
  testFinishWave(): void {
    this.world.wave.toLaunch = 0;
  }

  /** For the test hook: whether a tap would start a new game now. */
  testCanRestart(): boolean {
    return this.canRestart();
  }

  /** For the test hook: changes how long taps are ignored after the wave ends. */
  testSetRestartDelay(ms: number): void {
    this.restartDelayMs = ms;
  }

  snapshot(): GameSnapshot {
    const w = this.world;
    return {
      seed: this.seed,
      phase: w.phase,
      wave: w.wave.number,
      hudWave: this.waveText.text,
      waveBanner: this.waveBanner.visible ? this.waveBanner.text : null,
      bannersShown: [...this.bannersShown],
      timeMs: w.timeMs,
      score: w.score,
      cities: w.cities.map((c) => c.alive),
      bases: w.bases.map((b) => b.alive),
      ammo: w.bases.map((b) => b.ammo),
      outLabels: this.outLabels.map((t) => t.visible),
      warheads: w.warheads.map((h) => ({ ...h.pos })),
      interceptors: w.interceptors.length,
      blasts: w.blasts.length,
      lastShot: this.lastShot,
      hudScore: this.scoreText.text,
      effects: this.effects.activeCount,
      effectsPlayed: { ...this.effectsPlayed },
      message: this.messageLines.filter((t) => t.visible).map((t) => t.text),
    };
  }

  private handleEvents(): void {
    let defensesChanged = false;
    for (const e of drainEvents(this.world)) {
      switch (e.type) {
        case 'launch':
          this.lastShot = { baseIndex: e.baseIndex, target: { ...e.target } };
          defensesChanged = true;
          break;
        case 'warheadDestroyed':
          this.updateScore();
          break;
        case 'impact':
          this.playEffect(IMPACT, e.at);
          break;
        case 'cityDestroyed':
          this.playEffect(CITY_HIT, { x: this.world.cities[e.index]?.x ?? e.at.x, y: GROUND_Y });
          defensesChanged = true;
          break;
        case 'baseDestroyed':
          this.playEffect(CITY_HIT, { x: this.world.bases[e.index]?.x ?? e.at.x, y: GROUND_Y });
          defensesChanged = true;
          break;
        case 'waveCleared': {
          const saved = this.world.cities.filter((c) => c.alive).length;
          this.showMessage(`WAVE ${e.number} CLEARED`, `CITIES SAVED ${saved}`, 'FOR NEXT WAVE');
          break;
        }
        case 'waveStarted':
          this.showWave();
          defensesChanged = true;
          break;
        case 'gameOver':
          this.showMessage(
            'GAME OVER',
            `SCORE ${formatScore(this.world.score, HUD.scoreDigits)}`,
            'TO PLAY AGAIN',
          );
          break;
        default:
          break;
      }
    }
    if (defensesChanged) this.drawDefenses();
  }

  /** Shows a three-line message; `action` completes the prompt, e.g. "TAP FOR NEXT WAVE". */
  private showMessage(title: string, detail: string, action: string): void {
    this.endedAt = this.time.now;
    const prompt = `${this.sys.game.device.input.touch ? 'TAP' : 'CLICK'} ${action}`;
    [title, detail, prompt].forEach((line, i) => this.messageLines[i]?.setText(line));
    this.messagePanel.setVisible(true);
    for (const t of this.messageLines) t.setVisible(true);
  }

  private hideMessage(): void {
    this.endedAt = null;
    this.messagePanel.setVisible(false);
    for (const t of this.messageLines) t.setVisible(false);
  }

  private nextWave(): void {
    if (!startNextWave(this.world)) return;
    this.hideMessage();
  }

  /** Updates the HUD's wave number and shows "WAVE n" for a moment. */
  private showWave(): void {
    const label = `WAVE ${this.world.wave.number}`;
    this.waveText.setText(label);
    this.waveBanner.setText(label).setVisible(true);
    this.bannersShown.push(label);
    this.bannerUntil = this.time.now + SCREENS.waveBannerMs;
  }

  private canRestart(): boolean {
    return this.endedAt !== null && this.time.now - this.endedAt >= this.restartDelayMs;
  }

  /** The "play again" prompt blinks once taps are accepted, and stays hidden before that. */
  private blinkPrompt(): void {
    const prompt = this.messageLines[2];
    if (!prompt || this.endedAt === null) return;
    const on = this.canRestart() && Math.floor(this.time.now / SCREENS.promptBlinkMs) % 2 === 0;
    prompt.setAlpha(on ? 1 : 0);
  }

  private playEffect(kind: EffectKind, at: Point): void {
    if (this.effects.play(kind, at)) {
      if (kind === IMPACT) this.effectsPlayed.impact++;
      else this.effectsPlayed.cityHit++;
    }
  }

  private updateScore(): void {
    this.scoreText.setText(formatScore(this.world.score, HUD.scoreDigits));
  }

  /** Trails, missiles, aim markers and blasts, redrawn every frame. */
  private drawMoving(): void {
    const g = this.fx.clear();
    for (const h of this.world.warheads) {
      g.lineStyle(1, COLORS.warheadTrail, TRAILS.alpha);
      g.lineBetween(h.origin.x, h.origin.y, h.pos.x, h.pos.y);
      g.fillStyle(COLORS.warheadHead).fillRect(Math.round(h.pos.x), Math.round(h.pos.y), 1, 1);
    }
    const m = TRAILS.aimMarkerHalf;
    for (const i of this.world.interceptors) {
      g.lineStyle(1, COLORS.interceptorTrail, TRAILS.alpha);
      g.lineBetween(i.origin.x, i.origin.y, i.pos.x, i.pos.y);
      g.lineStyle(1, COLORS.aimMarker);
      g.lineBetween(i.target.x - m, i.target.y - m, i.target.x + m, i.target.y + m);
      g.lineBetween(i.target.x - m, i.target.y + m, i.target.x + m, i.target.y - m);
    }
    for (const b of this.world.blasts) {
      const r = blastRadius(b.ageMs);
      g.fillStyle(COLORS.blastOuter).fillCircle(b.center.x, b.center.y, r);
      g.fillStyle(COLORS.blastInner).fillCircle(b.center.x, b.center.y, r * TRAILS.blastCore);
    }
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
      this.drawAmmo(g, base.x, base.ammo);
    }
    this.world.bases.forEach((b, i) => this.outLabels[i]?.setVisible(b.alive && b.ammo === 0));
  }

  /** One pip per missile left, centred under the base. */
  private drawAmmo(g: Phaser.GameObjects.Graphics, x: number, ammo: number): void {
    if (ammo <= 0) return;
    const left = Math.round(x - (ammo * AMMO_PIPS.pitch - (AMMO_PIPS.pitch - AMMO_PIPS.width)) / 2);
    g.fillStyle(COLORS.ammoPip);
    for (let i = 0; i < ammo; i++) {
      g.fillRect(left + i * AMMO_PIPS.pitch, AMMO_PIPS.top, AMMO_PIPS.width, AMMO_PIPS.height);
    }
  }
}

/** Seed from the URL (?seed=123), so a run can be repeated exactly; null when there is none. */
function seedFromUrl(): number | null {
  const raw = new URLSearchParams(window.location.search).get('seed');
  const n = raw === null ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/** A new seed for each game, so every game plays differently. */
function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] ?? DEFAULT_SEED;
}
