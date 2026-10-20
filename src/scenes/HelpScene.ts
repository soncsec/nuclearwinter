import Phaser from 'phaser';
import { FONT_FAMILY } from '../assets/manifest';
import { COLORS, GAME_WIDTH, HELP, HUD, SCREENS, TITLE } from '../config/tuning';
import { helpPages, type HelpPage } from '../logic/help';
import { Backdrop, centredText, onKeyPress } from './ui';

/**
 * "How to play" (M7.1): a few pages of plain text from `logic/help.ts`. A tap (or Enter, Space
 * or the right arrow) turns the page, and on the last page goes back to the title; the left
 * arrow turns back; Escape goes back from any page. Stores nothing.
 */
export class HelpScene extends Phaser.Scene {
  private pages: HelpPage[] = [];
  private page = 0;
  private touch = false;
  private leaving = false;
  private title!: Phaser.GameObjects.Text;
  private rows: Phaser.GameObjects.Text[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private pageNumber!: Phaser.GameObjects.Text;

  constructor() {
    super('Help');
  }

  create(): void {
    this.leaving = false;
    this.page = 0;
    this.touch = this.sys.game.device.input.touch;
    this.pages = helpPages(this.touch);
    new Backdrop(this);
    this.add
      .rectangle(
        GAME_WIDTH / 2,
        HELP.panelTop,
        HELP.panelWidth,
        HELP.panelHeight,
        COLORS.messagePanel,
      )
      .setOrigin(0.5, 0)
      .setAlpha(SCREENS.panelAlpha)
      .setStrokeStyle(1, COLORS.dailyButton);
    this.title = centredText(this, HELP.titleY, '', {
      fontSizePx: TITLE.nameFontSizePx,
      color: COLORS.title,
    });
    this.rows = Array.from({ length: HELP.maxLines }, (_, i) =>
      centredText(this, HELP.firstLineY + i * HELP.lineGap, ''),
    );
    this.prompt = centredText(this, HELP.promptY, '', { color: COLORS.title });
    this.pageNumber = this.add
      .text(GAME_WIDTH - HUD.margin, TITLE.buildY, '', {
        fontFamily: FONT_FAMILY,
        fontSize: `${HUD.fontSizePx}px`,
        color: COLORS.buildText,
      })
      .setOrigin(1, 0);
    this.show(0);

    this.input.on('pointerdown', () => this.next());
    onKeyPress(this, (key) => {
      if ((HELP.nextKeys as readonly string[]).includes(key)) this.next();
      else if ((HELP.previousKeys as readonly string[]).includes(key)) this.show(this.page - 1);
      else if ((HELP.backKeys as readonly string[]).includes(key)) this.back();
    });
  }

  /** The next page, or back to the title from the last one. */
  next(): void {
    if (this.page >= this.pages.length - 1) this.back();
    else this.show(this.page + 1);
  }

  back(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start('Title');
  }

  /** The page showing (0 for the first), and every line on the screen, top to bottom. */
  state(): { page: number; pages: number; lines: string[] } {
    const lines = [this.title, ...this.rows, this.prompt, this.pageNumber]
      .map((t) => t.text)
      .filter((t) => t !== '');
    return { page: this.page, pages: this.pages.length, lines };
  }

  private show(index: number): void {
    const page = this.pages[index];
    if (!page || this.leaving) return;
    this.page = index;
    this.title.setText(page.title);
    this.rows.forEach((row, i) => row.setText(page.lines[i] ?? ''));
    const last = index === this.pages.length - 1;
    const action = this.touch ? 'TAP' : 'CLICK OR ENTER';
    this.prompt.setText(
      last ? `${action} TO GO BACK` : `${action} FOR MORE${this.touch ? '' : '   ESC BACK'}`,
    );
    this.pageNumber.setText(`${index + 1}/${this.pages.length}`);
  }
}
