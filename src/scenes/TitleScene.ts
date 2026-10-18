import Phaser from 'phaser';
import { IMAGES, SHEETS } from '../assets/manifest';
import { COLORS, CONFIRM_KEYS, HUD, SCREENS, TITLE } from '../config/tuning';
import { loadHighScore } from '../logic/highScore';
import { formatScore } from '../logic/scoring';
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

    // One input path for mouse and touch (ADR-NW06); desktop players can also press a key.
    this.input.on('pointerdown', () => this.startGame());
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (CONFIRM_KEYS.includes(e.key.toLowerCase())) this.startGame();
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
  startGame(): void {
    if (this.started) return;
    this.started = true;
    this.scene.start('Game');
  }
}
