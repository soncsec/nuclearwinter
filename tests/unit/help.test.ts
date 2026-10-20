import { describe, expect, it } from 'vitest';
import { BASES, GAME_WIDTH, HELP, HUD, SCORE, WAVES } from '../../src/config/tuning';
import { firstWaveWith, helpPages } from '../../src/logic/help';

const all = (touch: boolean): string[] => helpPages(touch).flatMap((p) => [p.title, ...p.lines]);

describe('help pages', () => {
  it.each([true, false])('fit the screen (touch %s): every line and every page', (touch) => {
    // The pixel font is HUD.fontSizePx wide per character; keep a margin on both sides.
    const maxChars = Math.floor((GAME_WIDTH - 2 * HELP.sideMargin) / HUD.fontSizePx);
    for (const line of all(touch)) expect(line.length, line).toBeLessThanOrEqual(maxChars);
    for (const page of helpPages(touch)) {
      expect(page.lines.length, page.title).toBeLessThanOrEqual(HELP.maxLines);
    }
  });

  it('stay in capitals, with only plain punctuation', () => {
    for (const line of [...all(true), ...all(false)]) expect(line).toMatch(/^[A-Z0-9 ,./:]*$/);
  });

  it('give the numbers the game uses', () => {
    const text = all(true).join('\n');
    expect(text).toContain(`EACH BASE HAS ${BASES.ammo} MISSILES A WAVE`);
    expect(text).toContain(`MISSILE ${SCORE.warhead}   SMART BOMB ${SCORE.smartBomb}`);
    expect(text).toContain(`${SCORE.citySaved} FOR EACH CITY STANDING`);
    expect(text).toContain(`${SCORE.missileLeft} FOR EACH MISSILE LEFT`);
    expect(text).toContain('A BONUS CITY EVERY 5,000 POINTS');
    expect(text).toContain('FROM WAVE 3 POINTS COUNT 2X,');
    expect(text).toContain(`RISING TO ${SCORE.multiplierMax}X`);
    expect(text).toContain('ALL SIX CITIES FALL');
  });

  it('say when each enemy first comes, from the wave plans', () => {
    const text = all(true).join('\n');
    expect(text).toContain('WAVE 2  BOMBERS DROP MISSILES');
    expect(text).toContain('WAVE 3  MISSILES SPLIT IN THE AIR');
    expect(text).toContain('WAVE 4  SATELLITES JOIN THEM');
    expect(text).toContain(`WAVE ${WAVES.formula.smartBombFromWave}  SMART BOMBS DODGE BLASTS`);
  });

  it('show the base keys on desktop, and the pause button on touch screens', () => {
    expect(all(false)).toContain('OR A S D / 1 2 3 FIRE FROM ONE BASE');
    expect(all(false)).toContain('P OR ESC PAUSES');
    expect(all(true).join('\n')).not.toContain('A S D');
    expect(all(true)).toContain('TAP THE II AT THE TOP RIGHT TO PAUSE');
    expect(all(true)[1]).toBe('TAP WHERE A MISSILE SHOULD EXPLODE');
    expect(all(false)[1]).toBe('CLICK WHERE A MISSILE SHOULD EXPLODE');
  });
});

describe('firstWaveWith', () => {
  it('finds the first matching wave, or null', () => {
    expect(firstWaveWith(() => true)).toBe(1);
    expect(firstWaveWith((w) => w.raiders > 0)).toBe(2);
    expect(firstWaveWith(() => false, WAVES, 10)).toBeNull();
  });
});
