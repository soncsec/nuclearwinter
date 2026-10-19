import Phaser from 'phaser';
import { FONT_FAMILY, IMAGES, SHEETS } from '../assets/manifest';
import {
  AMMO_PIPS,
  BASE_KEYS,
  COLORS,
  CONFIRM_KEYS,
  DEFAULT_SEED,
  EFFECTS,
  GAME_WIDTH,
  GROUND_Y,
  HUD,
  MAX_STEPS_PER_FRAME,
  PAUSE,
  PAUSE_KEYS,
  SCREENS,
  SHAPES,
  STEP_MS,
  TRAILS,
} from '../config/tuning';
import { EffectPool, type EffectKind } from '../entities/EffectPool';
import { blastRadius } from '../logic/blast';
import type { Point } from '../logic/geometry';
import { createRng, type Rng } from '../logic/rng';
import { dailySeed, loadDailyBest, saveDailyBest, utcDateKey } from '../logic/daily';
import { loadHighScore, saveHighScore } from '../logic/highScore';
import { countUp, formatScore, waveMultiplier } from '../logic/scoring';
import {
  createWorld,
  drainEvents,
  fire,
  launchRaider,
  launchWarhead,
  startNextWave,
  step,
  type Phase,
  type RaiderKind,
  type World,
} from '../logic/world';
import { browserStore, drawBackdrop } from './ui';

/** Cheap counts for the dev debug overlay, read every frame. */
export interface DebugStats {
  wave: number;
  paused: boolean;
  /** Warheads still to launch this wave. */
  toLaunch: number;
  warheads: number;
  raiders: number;
  interceptors: number;
  blasts: number;
  /** Explosion sprites playing, and the pool's size. */
  effects: number;
  effectPool: number;
}

/** A normal game, or the daily challenge (same seed for everyone on a UTC day, own best). */
export type GameMode = 'normal' | 'daily';

/** Read-only view of the game state, used by the e2e test hook. */
export interface GameSnapshot {
  seed: number;
  mode: GameMode;
  phase: Phase;
  /** Whether play is paused (the simulation stands still until a tap resumes it). */
  paused: boolean;
  /** The wave being played, 1 for the first. */
  wave: number;
  /** The wave's score multiplier. */
  multiplier: number;
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
  /** Smart bombs among the warheads. */
  smartBombs: number;
  /** Bombers and satellites in the sky. */
  raiders: { kind: RaiderKind; x: number; y: number }[];
  /** Bombers and satellites shot down so far this game. */
  raidersDestroyed: number;
  interceptors: number;
  blasts: number;
  /** The most recent counter-missile launch, or null before the first. */
  lastShot: { baseIndex: number; target: Point } | null;
  /** The score as the HUD shows it. */
  hudScore: string;
  /** The high score as the HUD shows it. */
  hudHigh: string;
  /** Explosion sprites playing right now. */
  effects: number;
  /** MIRV splits so far this game. */
  splits: number;
  /** Explosion sprites started so far, by kind. */
  effectsPlayed: { impact: number; cityHit: number };
  /** Lines of the paused, wave-cleared or game-over message, empty while playing. */
  message: string[];
}

const IMPACT: EffectKind = { key: 'impact', frames: SHEETS.impact.frames, ...EFFECTS.impact };
const CITY_HIT: EffectKind = { key: 'cityHit', frames: SHEETS.cityHit.frames, ...EFFECTS.cityHit };

/** The game screen: draws the world from src/logic and passes input to it. */
export class GameScene extends Phaser.Scene {
  private world!: World;
  private rng!: Rng;
  private seed = DEFAULT_SEED;
  private mode: GameMode = 'normal';
  /** The daily challenge's UTC date, fixed when the game starts so midnight can't split it. */
  private dateKey = '';
  private defenses!: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics;
  /** Real time not yet simulated; the world advances in fixed steps (ADR-NW03). */
  private pendingMs = 0;
  private lastShot: GameSnapshot['lastShot'] = null;
  private effects!: EffectPool;
  private effectsPlayed = { impact: 0, cityHit: 0 };
  private splits = 0;
  private raidersDestroyed = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private highText!: Phaser.GameObjects.Text;
  /** The best score saved in this browser when this game started. */
  private highScore = 0;
  private waveText!: Phaser.GameObjects.Text;
  private waveBanner!: Phaser.GameObjects.Text;
  /** Real time (ms) when the "WAVE n" banner should hide. */
  private bannerUntil = 0;
  private bannersShown: string[] = [];
  /** The end-of-wave bonus counting up on screen, or null when no count is running. */
  private tally: { scoreBefore: number; bonus: number; startedAt: number } | null = null;
  private messageLines: Phaser.GameObjects.Text[] = [];
  private messagePanel!: Phaser.GameObjects.Rectangle;
  private outLabels: Phaser.GameObjects.Text[] = [];
  /** Real time (ms) when the wave-cleared or game-over message appeared. */
  private endedAt: number | null = null;
  /** How long taps are ignored after the message appears (the test hook can change it). */
  private restartDelayMs: number = SCREENS.restartDelayMs;
  private paused = false;
  /** Pauses when the page is hidden or loses focus, so a wave never plays on unseen. */
  private readonly onHidden = (): void => this.pauseGame();

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

  init(data: { mode?: GameMode }): void {
    this.mode = data.mode === 'daily' ? 'daily' : 'normal';
    this.dateKey = utcDateKey(new Date());
  }

  create(): void {
    this.seed = this.mode === 'daily' ? dailySeed(this.dateKey) : (seedFromUrl() ?? randomSeed());
    this.rng = createRng(this.seed);
    this.world = createWorld();
    this.pendingMs = 0;
    this.lastShot = null;

    this.paused = false;
    drawBackdrop(this);

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
    this.splits = 0;
    this.raidersDestroyed = 0;

    this.scoreText = this.add.text(HUD.margin, HUD.margin, '', {
      fontFamily: FONT_FAMILY,
      fontSize: `${HUD.fontSizePx}px`,
      color: COLORS.hud,
    });
    this.highScore = this.loadBest();
    this.highText = this.add
      .text(GAME_WIDTH / 2, HUD.margin, '', {
        fontFamily: FONT_FAMILY,
        fontSize: `${HUD.fontSizePx}px`,
        color: COLORS.hud,
      })
      .setOrigin(0.5, 0);
    this.updateScore();
    this.waveText = this.add
      .text(GAME_WIDTH - PAUSE.width - HUD.margin, HUD.margin, '', {
        fontFamily: FONT_FAMILY,
        fontSize: `${HUD.fontSizePx}px`,
        color: COLORS.hud,
      })
      .setOrigin(1, 0);
    this.drawPauseButton();

    this.endedAt = null;
    this.messagePanel = this.add
      .rectangle(0, SCREENS.panelTop, GAME_WIDTH, SCREENS.panelHeight, COLORS.messagePanel)
      .setOrigin(0, 0)
      .setAlpha(SCREENS.panelAlpha)
      .setVisible(false);
    this.tally = null;
    this.messageLines = [SCREENS.titleY, SCREENS.detailY, SCREENS.detail2Y, SCREENS.promptY].map(
      (y) =>
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
        align: 'center',
        lineSpacing: SCREENS.bannerLineSpacing,
      })
      .setOrigin(0.5, 0)
      .setVisible(false);
    this.bannersShown = [];
    this.showWave();

    // One input path for mouse and touch (ADR-NW06): a tap on the pause button pauses or
    // resumes; any other tap fires while playing, or confirms the screen that is showing.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.onPauseButton(p.worldX, p.worldY)) this.togglePause();
      else this.confirm({ x: p.worldX, y: p.worldY });
    });

    // Desktop: pause keys, confirm keys, and base keys that fire from one base at the mouse.
    // Phaser's keyboard queue can hand the same browser event over more than once, so each
    // event is handled only the first time (otherwise one key press could fire several shots).
    const seenKeys = new WeakSet<KeyboardEvent>();
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (seenKeys.has(e)) return;
      seenKeys.add(e);
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (PAUSE_KEYS.includes(key)) {
        this.togglePause();
        return;
      }
      if (this.paused || this.world.phase !== 'playing') {
        if (CONFIRM_KEYS.includes(key)) this.confirm(null);
        return;
      }
      const baseIndex = BASE_KEYS.findIndex((keys) => keys.includes(key));
      if (baseIndex < 0) return;
      const p = this.input.activePointer;
      fire(this.world, { x: p.worldX, y: p.worldY }, baseIndex);
    });

    // A hidden page or a lost focus pauses the game; the listeners go when the scene does.
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onHidden);
    this.game.events.on(Phaser.Core.Events.BLUR, this.onHidden);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.onHidden);
      this.game.events.off(Phaser.Core.Events.BLUR, this.onHidden);
    });
  }

  override update(_time: number, deltaMs: number): void {
    if (this.paused) {
      // Time spent paused is not simulated when play resumes.
      this.pendingMs = 0;
    } else {
      this.pendingMs += deltaMs;
      let steps = 0;
      while (this.pendingMs >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
        step(this.world, this.rng, STEP_MS);
        this.pendingMs -= STEP_MS;
        steps++;
      }
      // After a long stall, drop the backlog instead of fast-forwarding through it.
      if (steps === MAX_STEPS_PER_FRAME) this.pendingMs = 0;
    }
    this.handleEvents();
    this.drawMoving();
    this.blinkPrompt();
    this.updateTally();
    if (this.waveBanner.visible && this.time.now >= this.bannerUntil) {
      this.waveBanner.setVisible(false);
    }
  }

  /** For the test hook: launches a warhead directly, optionally a MIRV. */
  testLaunchWarhead(
    origin: Point,
    target: Point,
    speed: number,
    split?: { atY: number; count: number },
  ): void {
    launchWarhead(this.world, origin, target, speed, split ? { split } : {});
  }

  /**
   * For the test hook: the wave launches nothing more, but stays open (it never counts as
   * cleared), so a test controls every warhead.
   */
  testHoldWave(): void {
    this.world.wave.nextLaunchMs = Number.POSITIVE_INFINITY;
    this.world.wave.nextRaiderMs = Number.POSITIVE_INFINITY;
  }

  /**
   * For the test hook: the wave launches nothing more, so it is cleared once the sky is empty.
   */
  testFinishWave(): void {
    this.world.wave.toLaunch = 0;
    this.world.wave.raidersToLaunch = 0;
  }

  /**
   * For the test hook: sends a bomber or satellite across at row `y` (dir 1 flies right),
   * from the screen's edge or, with `x`, from that column.
   */
  testLaunchRaider(kind: RaiderKind, y: number, dir: 1 | -1, x?: number): void {
    const r = launchRaider(this.world, kind, y, dir);
    if (x !== undefined) r.pos = { x, y };
  }

  /** For the test hook: launches a smart bomb. */
  testLaunchSmartBomb(origin: Point, target: Point, speed: number): void {
    launchWarhead(this.world, origin, target, speed, { smart: true });
  }

  /** For the test hook: fires at a point, as a tap there would, in the same frame as the call. */
  testFireAt(target: Point): void {
    fire(this.world, target);
  }

  /** For the test hook: whether a tap would start a new game now. */
  testCanRestart(): boolean {
    return this.canRestart();
  }

  /** For the test hook: changes how long taps are ignored after the wave ends. */
  testSetRestartDelay(ms: number): void {
    this.restartDelayMs = ms;
  }

  /** For the test hook: sets the score, e.g. to just below a bonus city. */
  testSetScore(score: number): void {
    this.world.score = score;
    this.updateScore();
  }

  /** For the dev debug overlay: counts without building a full snapshot. */
  debugStats(): DebugStats {
    const w = this.world;
    return {
      wave: w.wave.number,
      paused: this.paused,
      toLaunch: w.wave.toLaunch,
      warheads: w.warheads.length,
      raiders: w.raiders.length,
      interceptors: w.interceptors.length,
      blasts: w.blasts.length,
      effects: this.effects.activeCount,
      effectPool: EFFECTS.poolSize,
    };
  }

  snapshot(): GameSnapshot {
    const w = this.world;
    return {
      seed: this.seed,
      mode: this.mode,
      phase: w.phase,
      paused: this.paused,
      wave: w.wave.number,
      multiplier: waveMultiplier(w.wave.number),
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
      smartBombs: w.warheads.filter((h) => h.smart).length,
      raiders: w.raiders.map((r) => ({ kind: r.kind, x: r.pos.x, y: r.pos.y })),
      raidersDestroyed: this.raidersDestroyed,
      interceptors: w.interceptors.length,
      blasts: w.blasts.length,
      lastShot: this.lastShot,
      hudScore: this.scoreText.text,
      hudHigh: this.highText.text,
      effects: this.effects.activeCount,
      effectsPlayed: { ...this.effectsPlayed },
      splits: this.splits,
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
        case 'warheadSplit':
          this.splits++;
          break;
        case 'raiderDestroyed':
          this.raidersDestroyed++;
          this.updateScore();
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
          // Saved at every wave, so closing the tab mid-game keeps the record.
          this.saveBest(this.world.score);
          const b = e.bonus;
          this.showMessage(
            `WAVE ${e.number} CLEARED`,
            `CITIES ${b.citiesSaved}  MISSILES ${b.missilesLeft}${b.multiplier > 1 ? `  ${b.multiplier}X` : ''}`,
            'BONUS 0',
            'FOR NEXT WAVE',
          );
          this.tally = {
            scoreBefore: this.world.score - b.total,
            bonus: b.total,
            startedAt: this.time.now,
          };
          this.updateTally();
          break;
        }
        case 'waveStarted':
          this.showWave();
          defensesChanged = true;
          break;
        case 'bonusCity':
          this.addToBanner(e.count === 1 ? 'BONUS CITY' : `${e.count} BONUS CITIES`);
          break;
        case 'cityRebuilt':
          defensesChanged = true;
          break;
        case 'gameOver': {
          this.saveBest(this.world.score);
          const newBest = this.world.score > this.highScore;
          this.showMessage(
            'GAME OVER',
            `SCORE ${formatScore(this.world.score, HUD.scoreDigits)}  WAVE ${this.world.wave.number}`,
            newBest ? (this.mode === 'daily' ? 'NEW DAILY BEST' : 'NEW HIGH SCORE') : '',
            'TO CONTINUE',
          );
          this.updateScore();
          break;
        }
        default:
          break;
      }
    }
    if (defensesChanged) this.drawDefenses();
  }

  /**
   * Shows the message panel: a title, two detail lines (an empty one is hidden) and a prompt,
   * where `action` completes it, e.g. "TAP FOR NEXT WAVE".
   */
  private showMessage(title: string, detail: string, detail2: string, action: string): void {
    this.endedAt = this.time.now;
    const prompt = `${this.sys.game.device.input.touch ? 'TAP' : 'CLICK'} ${action}`;
    // The message and the "WAVE n" banner share the same rows, so the banner gives way.
    this.waveBanner.setVisible(false);
    this.messagePanel.setVisible(true);
    [title, detail, detail2, prompt].forEach((line, i) =>
      this.messageLines[i]?.setText(line).setVisible(line !== ''),
    );
  }

  /** Counts the bonus up on screen, with the HUD score rising alongside it. */
  private updateTally(): void {
    if (!this.tally) return;
    const { scoreBefore, bonus, startedAt } = this.tally;
    const shown = countUp(0, bonus, this.time.now - startedAt, SCREENS.bonusCountMs);
    this.messageLines[2]?.setText(`BONUS ${shown}`);
    this.showScore(scoreBefore + shown);
    if (shown === bonus) this.tally = null;
  }

  private hideMessage(): void {
    this.endedAt = null;
    this.messagePanel.setVisible(false);
    for (const t of this.messageLines) t.setVisible(false);
  }

  /**
   * A tap (or a confirm key, with no position) outside the pause button: it resumes a paused
   * game, fires while playing, starts the next wave once cleared, or returns to the title
   * after game over. Screens accept taps only after a short lockout, so a late shot can't
   * skip them.
   */
  private confirm(at: Point | null): void {
    if (this.paused) {
      this.resumeGame();
      return;
    }
    if (this.world.phase === 'playing') {
      if (at) fire(this.world, at);
      return;
    }
    if (!this.canRestart()) return;
    if (this.world.phase === 'waveCleared') this.nextWave();
    else this.scene.start('Title');
  }

  private togglePause(): void {
    if (this.paused) this.resumeGame();
    else this.pauseGame();
  }

  /** Stops the simulation and shows PAUSED; only play can be paused, not the other screens. */
  private pauseGame(): void {
    if (this.paused || this.world.phase !== 'playing') return;
    this.paused = true;
    this.showMessage('PAUSED', '', '', 'TO RESUME');
  }

  private resumeGame(): void {
    if (!this.paused) return;
    this.paused = false;
    this.pendingMs = 0;
    this.hideMessage();
  }

  /** Whether a game-pixel position is on the pause button in the top-right corner. */
  private onPauseButton(x: number, y: number): boolean {
    return x >= GAME_WIDTH - PAUSE.width && y <= PAUSE.height;
  }

  /** Two bars in the top-right corner; the whole corner is the tap target. */
  private drawPauseButton(): void {
    const g = this.add.graphics().fillStyle(COLORS.pauseIcon);
    const cx = GAME_WIDTH - PAUSE.width / 2;
    const top = (PAUSE.height - PAUSE.barHeight) / 2;
    g.fillRect(cx - PAUSE.barGap / 2 - PAUSE.barWidth, top, PAUSE.barWidth, PAUSE.barHeight);
    g.fillRect(cx + PAUSE.barGap / 2, top, PAUSE.barWidth, PAUSE.barHeight);
  }

  private nextWave(): void {
    if (!startNextWave(this.world)) return;
    this.tally = null;
    this.updateScore();
    this.hideMessage();
  }

  /** Updates the HUD's wave number and shows "WAVE n" for a moment. */
  private showWave(): void {
    const label = `WAVE ${this.world.wave.number}`;
    this.waveText.setText(label);
    this.waveBanner.setText(label).setVisible(true);
    this.bannersShown.push(label);
    this.bannerUntil = this.time.now + SCREENS.waveBannerMs;
    // Announce each step up in the multiplier.
    const n = this.world.wave.number;
    const m = waveMultiplier(n);
    if (m > waveMultiplier(n - 1)) this.addToBanner(`${m}X POINTS`);
  }

  /** Adds a second line under the "WAVE n" banner that is showing. */
  private addToBanner(line: string): void {
    const label = `${this.waveBanner.text}\n${line}`;
    this.waveBanner.setText(label);
    this.bannersShown[this.bannersShown.length - 1] = label;
  }

  private canRestart(): boolean {
    return this.endedAt !== null && this.time.now - this.endedAt >= this.restartDelayMs;
  }

  /** The prompt blinks once taps are accepted, and stays hidden before that. */
  private blinkPrompt(): void {
    const prompt = this.messageLines[3];
    if (!prompt || this.endedAt === null) return;
    const ready = this.paused || this.canRestart();
    const on = ready && Math.floor(this.time.now / SCREENS.promptBlinkMs) % 2 === 0;
    prompt.setAlpha(on ? 1 : 0);
  }

  private playEffect(kind: EffectKind, at: Point): void {
    if (this.effects.play(kind, at)) {
      if (kind === IMPACT) this.effectsPlayed.impact++;
      else this.effectsPlayed.cityHit++;
    }
  }

  private updateScore(): void {
    this.showScore(this.world.score);
  }

  /** Shows `score`, and the high score, which rises live once the score passes it. */
  private showScore(score: number): void {
    this.scoreText.setText(formatScore(score, HUD.scoreDigits));
    const label = this.mode === 'daily' ? 'DAY' : 'HI';
    this.highText.setText(
      `${label} ${formatScore(Math.max(this.highScore, score), HUD.scoreDigits)}`,
    );
  }

  /** The best to beat: today's daily best in the daily challenge, else the high score. */
  private loadBest(): number {
    return this.mode === 'daily'
      ? loadDailyBest(browserStore(), this.dateKey)
      : loadHighScore(browserStore());
  }

  private saveBest(score: number): void {
    if (this.mode === 'daily') saveDailyBest(browserStore(), this.dateKey, score);
    else saveHighScore(browserStore(), score);
  }

  /** Trails, missiles, aim markers and blasts, redrawn every frame. */
  private drawMoving(): void {
    const g = this.fx.clear();
    for (const h of this.world.warheads) {
      if (h.smart) {
        // Smart bombs leave no trail: a small diamond, as in the arcade game.
        const x = Math.round(h.pos.x);
        const y = Math.round(h.pos.y);
        g.fillStyle(COLORS.smartBomb)
          .fillRect(x - 1, y, 3, 1)
          .fillRect(x, y - 1, 1, 3);
        continue;
      }
      g.lineStyle(1, COLORS.warheadTrail, TRAILS.alpha);
      // A warhead born from a split keeps its parent's trail down to the split point.
      if (h.stemFrom) g.lineBetween(h.stemFrom.x, h.stemFrom.y, h.origin.x, h.origin.y);
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
    for (const r of this.world.raiders) this.drawRaider(g, r.kind, r.pos, r.dir);
    for (const b of this.world.blasts) {
      const r = blastRadius(b.ageMs);
      g.fillStyle(COLORS.blastOuter).fillCircle(b.center.x, b.center.y, r);
      g.fillStyle(COLORS.blastInner).fillCircle(b.center.x, b.center.y, r * TRAILS.blastCore);
    }
  }

  /** Placeholder shapes until the M4 art pass: a bomber facing its way, or a satellite. */
  private drawRaider(
    g: Phaser.GameObjects.Graphics,
    kind: RaiderKind,
    at: Point,
    dir: 1 | -1,
  ): void {
    const x = Math.round(at.x);
    const y = Math.round(at.y);
    if (kind === 'bomber') {
      g.fillStyle(COLORS.bomber);
      for (const [dx, dy, w, h] of SHAPES.bomber) {
        // Mirror for a bomber flying left: the tail stays behind it.
        g.fillRect(dir === 1 ? x + dx : x - dx - w, y + dy, w, h);
      }
      return;
    }
    const [bx, by, bw, bh] = SHAPES.satelliteBody;
    g.fillStyle(COLORS.satellitePanel);
    for (const [dx, dy, w, h] of SHAPES.satellitePanels) g.fillRect(x + dx, y + dy, w, h);
    g.fillStyle(COLORS.satellite).fillRect(x + bx, y + by, bw, bh);
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
