/**
 * The "How to play" pages (M7.1). Every number comes from the tuning, so the help can never
 * disagree with the game: change a score or a wave there and the help changes with it.
 */
import { BASES, BASE_KEYS, CITIES, SCORE, WAVES, type WaveSpec } from '../config/tuning';
import { waveSpec } from './waves';

export interface HelpPage {
  readonly title: string;
  /** Lines of text, top to bottom; an empty string is a blank line. */
  readonly lines: readonly string[];
}

/** The first wave (searching up to `limit`) whose plan passes `test`, or null if none does. */
export function firstWaveWith(
  test: (spec: WaveSpec) => boolean,
  waves: typeof WAVES = WAVES,
  limit = 50,
): number | null {
  for (let n = 1; n <= limit; n++) if (test(waveSpec(n, waves))) return n;
  return null;
}

const NUMBER_WORDS = ['NO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT'];

/** "6" as "SIX" for small counts; larger ones stay as digits. */
function inWords(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

/** 5000 as "5,000". */
function withCommas(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "WAVE 2  BOMBERS DROP MISSILES", or nothing if that enemy never comes. */
function arrival(wave: number | null, text: string): string[] {
  return wave === null ? [] : [`WAVE ${wave}  ${text}`];
}

/** The pages for a touch screen (`touch`) or a mouse and keyboard. */
export function helpPages(touch: boolean): HelpPage[] {
  const baseKeys = (i: number): string => BASE_KEYS.map((keys) => keys[i]?.toUpperCase()).join(' ');
  const twoX = SCORE.multiplierEvery + 1;
  return [
    {
      title: 'HOW TO PLAY',
      lines: [
        `${touch ? 'TAP' : 'CLICK'} WHERE A MISSILE SHOULD EXPLODE`,
        'THE NEAREST BASE WITH MISSILES FIRES',
        ...(touch ? [] : [`OR ${baseKeys(0)} / ${baseKeys(1)} FIRE FROM ONE BASE`]),
        '',
        'A BLAST DESTROYS EVERY MISSILE IT TOUCHES,',
        'AND EACH ONE DESTROYED BLASTS IN TURN',
        '',
        `EACH BASE HAS ${BASES.ammo} MISSILES A WAVE`,
        `THE GAME ENDS WHEN ALL ${inWords(CITIES.xs.length)} CITIES FALL`,
        touch ? 'TAP THE II AT THE TOP RIGHT TO PAUSE' : 'P OR ESC PAUSES',
      ],
    },
    {
      title: 'SCORING',
      lines: [
        `MISSILE ${SCORE.warhead}   SMART BOMB ${SCORE.smartBomb}`,
        `BOMBER ${SCORE.bomber}   SATELLITE ${SCORE.satellite}`,
        '',
        'AT THE END OF EACH WAVE:',
        `${SCORE.citySaved} FOR EACH CITY STANDING`,
        `${SCORE.missileLeft} FOR EACH MISSILE LEFT`,
        '',
        `FROM WAVE ${twoX} POINTS COUNT 2X,`,
        `RISING TO ${SCORE.multiplierMax}X`,
        '',
        `A BONUS CITY EVERY ${withCommas(SCORE.bonusCityEvery)} POINTS`,
      ],
    },
    {
      title: 'ENEMIES',
      lines: [
        ...arrival(
          firstWaveWith((w) => w.raiders > 0),
          'BOMBERS DROP MISSILES',
        ),
        ...arrival(
          firstWaveWith((w) => w.mirvChance > 0),
          'MISSILES SPLIT IN THE AIR',
        ),
        ...arrival(
          firstWaveWith((w) => w.raiders > 0 && w.satelliteChance > 0),
          'SATELLITES JOIN THEM',
        ),
        ...arrival(
          firstWaveWith((w) => w.smartBombChance > 0),
          'SMART BOMBS DODGE BLASTS',
        ),
        '',
        'THE DAILY CHALLENGE HAS THE SAME',
        'MISSILES FOR EVERYONE, NEW EACH DAY,',
        'WITH ITS OWN BEST SCORE',
      ],
    },
  ];
}
