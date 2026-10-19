import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, HUD, SCREENS, SETTINGS, TITLE } from '../config/tuning';
import { loadSettings, saveSettings, type Settings } from '../logic/settings';
import { Backdrop, browserStore, centredText } from './ui';

interface Option {
  key: keyof Settings;
  label: string;
  hint: string;
}

const OPTIONS: readonly Option[] = [
  { key: 'reduceFlashing', label: 'REDUCE FLASHING', hint: 'ALSO STOPS SCREEN SHAKE' },
  { key: 'vibration', label: 'VIBRATION', hint: 'ON PHONES THAT SUPPORT IT' },
];

/**
 * The settings screen (M4.5): reduce flashing and vibration, saved in localStorage. A tap on a
 * row (or its number key) toggles it; a tap on BACK (or Escape) returns to the title.
 */
export class SettingsScene extends Phaser.Scene {
  private settings!: Settings;
  private rows: Phaser.GameObjects.Text[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private touch = false;
  private leaving = false;

  constructor() {
    super('Settings');
  }

  create(): void {
    this.leaving = false;
    this.settings = loadSettings(browserStore());
    this.touch = this.sys.game.device.input.touch;
    new Backdrop(this);
    this.texts = [
      centredText(this, SETTINGS.titleY, 'SETTINGS', {
        fontSizePx: TITLE.nameFontSizePx,
        color: COLORS.title,
      }),
    ];
    this.rows = OPTIONS.map((_, i) => {
      const y = SETTINGS.rowYs[i] ?? 0;
      this.panel(y);
      const row = centredText(this, y, '', { color: COLORS.title });
      this.texts.push(row);
      this.texts.push(
        centredText(this, y + SETTINGS.hintGap, OPTIONS[i]?.hint ?? '', {
          color: COLORS.buildText,
        }),
      );
      return row;
    });
    this.panel(SETTINGS.backY, SETTINGS.backPanelWidth);
    this.texts.push(
      centredText(this, SETTINGS.backY, this.touch ? 'BACK' : 'ESC  BACK', {
        color: COLORS.title,
      }),
    );
    this.refresh();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const hit = (y: number): boolean =>
        Math.abs(p.worldY - (y + HUD.fontSizePx / 2)) <= SETTINGS.rowTapHalfHeight;
      const index = SETTINGS.rowYs.findIndex(hit);
      if (index >= 0) this.toggle(index);
      else if (hit(SETTINGS.backY)) this.back();
    });
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const index = (SETTINGS.toggleKeys as readonly string[]).indexOf(key);
      if (index >= 0) this.toggle(index);
      else if ((SETTINGS.backKeys as readonly string[]).includes(key)) this.back();
    });
  }

  /** Flips option `index` and saves straight away. */
  toggle(index: number): void {
    const option = OPTIONS[index];
    if (!option || this.leaving) return;
    this.settings = { ...this.settings, [option.key]: !this.settings[option.key] };
    saveSettings(browserStore(), this.settings);
    this.refresh();
  }

  back(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start('Title');
  }

  /** Every line on the screen, top to bottom (for the test hook). */
  lines(): string[] {
    return this.texts.map((t) => t.text);
  }

  private refresh(): void {
    OPTIONS.forEach((o, i) => {
      const keyHint = this.touch ? '' : `${i + 1}  `;
      this.rows[i]?.setText(`${keyHint}${o.label}  ${this.settings[o.key] ? 'ON' : 'OFF'}`);
    });
  }

  private panel(y: number, width: number = SETTINGS.panelWidth): void {
    this.add
      .rectangle(
        GAME_WIDTH / 2,
        y + HUD.fontSizePx / 2,
        width,
        SETTINGS.panelHeight,
        COLORS.messagePanel,
      )
      .setAlpha(SCREENS.panelAlpha)
      .setStrokeStyle(1, COLORS.dailyButton);
  }
}
