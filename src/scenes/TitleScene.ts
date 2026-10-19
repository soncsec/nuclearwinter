import Phaser from 'phaser';
import { FONT_FAMILY, IMAGES, SHEETS } from '../assets/manifest';
import { COLORS, CONFIRM_KEYS, DAILY_KEY, GAME_WIDTH, HUD, SCREENS, TITLE } from '../config/tuning';
import { loadDailyBest, utcDateKey } from '../logic/daily';
import { loadHighScore } from '../logic/highScore';
import { formatScore } from '../logic/scoring';
import type { GameMode } from './GameScene';
import { browserStore, centredText, drawBackdrop } from './ui';

/** The title screen: the name, the high score, how to play, and a blinking prompt to start. */
export class TitleScene extends Phaser.Scene {
  private texts: Phaser.GameObjects.Text[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private started = false;

  constructor() {
    super('Title');
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
    this.started = false;
    drawBackdrop(this);
    const touch = this.sys.game.device.input.touch;
    const tap = touch ? 'TAP' : 'CLICK';
    const best = formatScore(loadHighScore(browserStore()), HUD.scoreDigits);
    this.prompt = centredText(this, TITLE.promptY, `${tap} TO START`);
    this.texts = [
      centredText(this, TITLE.nameY, 'NUCLEAR WINTER', {
        fontSizePx: TITLE.nameFontSizePx,
        color: COLORS.title,
      }),
      centredText(this, TITLE.highY, `HI ${best}`),
      centredText(this, TITLE.helpY, `${tap} WHERE A MISSILE SHOULD EXPLODE`),
      centredText(
        this,
        TITLE.help2Y,
        touch ? 'DEFEND THE SIX CITIES' : 'A S D OR 1 2 3 FIRE FROM ONE BASE',
      ),
      this.prompt,
    ];

    // The daily challenge: a button-like band under the prompt, with today's best on it.
    const today = formatScore(
      loadDailyBest(browserStore(), utcDateKey(new Date())),
      HUD.scoreDigits,
    );
    this.add
      .rectangle(
        GAME_WIDTH / 2,
        TITLE.dailyY + HUD.fontSizePx / 2,
        TITLE.dailyPanelWidth,
        TITLE.dailyPanelHeight,
        COLORS.messagePanel,
      )
      .setAlpha(SCREENS.panelAlpha)
      .setStrokeStyle(1, COLORS.dailyButton);
    this.texts.push(
      centredText(this, TITLE.dailyY, `${touch ? '' : 'D  '}DAILY CHALLENGE  BEST ${today}`, {
        color: COLORS.title,
      }),
    );

    // The build number, so a play-test report can say exactly which build it was (M3.7).
    this.texts.push(
      this.add
        .text(GAME_WIDTH - HUD.margin, TITLE.buildY, `BUILD ${buildId()}`, {
          fontFamily: FONT_FAMILY,
          fontSize: `${HUD.fontSizePx}px`,
          color: COLORS.buildText,
        })
        .setOrigin(1, 0),
    );

    // One input path for mouse and touch (ADR-NW06): a tap on the daily band starts the daily
    // challenge, any other tap a normal game. Desktop players can also press a key.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const onDaily =
        Math.abs(p.worldY - (TITLE.dailyY + HUD.fontSizePx / 2)) <= TITLE.dailyTapHalfHeight;
      this.startGame(onDaily ? 'daily' : 'normal');
    });
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === DAILY_KEY) this.startGame('daily');
      else if (CONFIRM_KEYS.includes(key)) this.startGame('normal');
    });
  }

  override update(): void {
    const on = Math.floor(this.time.now / SCREENS.promptBlinkMs) % 2 === 0;
    this.prompt.setAlpha(on ? 1 : 0);
  }

  /** Every line on the screen, top to bottom (for the test hook). */
  lines(): string[] {
    return this.texts.map((t) => t.text);
  }

  /** Starts a game. Taps, keys and the test hook call it; a second call does nothing. */
  startGame(mode: GameMode = 'normal'): void {
    if (this.started) return;
    this.started = true;
    this.scene.start('Game', { mode });
  }
}

/** The build number, or "dev" when the build scripts didn't set one (or it looks wrong). */
function buildId(): string {
  const id = import.meta.env.VITE_BUILD ?? '';
  return /^[0-9a-f]{8}$/.test(id) ? id : 'dev';
}
