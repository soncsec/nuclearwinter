/** All gameplay numbers live here so they can be tuned in one place. */
/** Native resolution in game pixels (ADR-NW02). */
export const GAME_WIDTH = 384;
export const GAME_HEIGHT = 216;

/** Seed for the random number generator; override with ?seed= in the URL. */
export const DEFAULT_SEED = 1;

/** Background: night sky and the distant skyline (assets/backgrounds/skyline-far.png). */
export const SKY = {
  /** The skyline image's own sky colour, so the two blend with no seam. */
  color: '#052c46',
  /** Game-pixel row where the top of the skyline image sits. */
  skylineTop: 72,
  /** Rows of the 192-row image shown: everything above the street. */
  skylineHeight: GAME_HEIGHT - 72,
} as const;

/** The simulation advances in fixed steps of this many milliseconds (ADR-NW03). */
export const STEP_MS = 1000 / 60;
/** At most this many steps per rendered frame, so a slow frame can't snowball. */
export const MAX_STEPS_PER_FRAME = 5;

/** Ground line: cities and bases stand on it; warheads explode when they reach it. */
export const GROUND_Y = 204;

/** Six cities, in two groups of three between the bases. */
export const CITIES = {
  xs: [72, 104, 136, 248, 280, 312],
  /** Hit box: a warhead landing within this many pixels of the centre destroys the city. */
  halfWidth: 10,
} as const;

/** Three missile bases: left, centre, right. */
export const BASES = {
  xs: [24, 192, 360],
  /** Launch point height above the ground. */
  launchHeight: 8,
  halfWidth: 10,
  /** Counter-missiles per base each wave (classic Missile Command: 10). */
  ammo: 10,
} as const;

/** The player's counter-missiles. */
export const INTERCEPTOR = {
  /** Pixels per second. */
  speed: 240,
  /** Taps lower than this row are raised to it, so blasts never sit on the ground. */
  minTargetY: GROUND_Y - 20,
} as const;

/** Blasts grow, hold, then shrink. Anything inside the circle is destroyed. */
export const BLAST = {
  maxRadius: 14,
  growMs: 350,
  holdMs: 250,
  shrinkMs: 400,
} as const;

/** Enemy warheads. */
export const WARHEAD = {
  /** Spawn row: just above the top of the screen. */
  spawnY: -4,
} as const;

/** How one wave launches its warheads. */
export interface WaveSpec {
  /** Warheads in the wave. */
  readonly count: number;
  /** Pixels per second, picked between these for each warhead. */
  readonly speedMin: number;
  readonly speedMax: number;
  /** Delay before the first launch, in milliseconds. */
  readonly firstLaunchMs: number;
  /** Delay between launches, picked between these, in milliseconds. */
  readonly launchGapMinMs: number;
  readonly launchGapMaxMs: number;
  /** Chance that a launch is a pair fired together. */
  readonly pairChance: number;
}

/**
 * Waves (ADR-NW05): the first few are set by hand; after them, each wave adds the formula's
 * steps to the last hand-set wave, up to the caps. Endless.
 */
export const WAVES: {
  readonly handSet: readonly WaveSpec[];
  readonly formula: {
    readonly countStep: number;
    readonly countMax: number;
    readonly speedStep: number;
    readonly speedMinCap: number;
    readonly speedMaxCap: number;
    readonly gapStepMs: number;
    readonly gapMinFloorMs: number;
    readonly gapMaxFloorMs: number;
    readonly pairStep: number;
    readonly pairMax: number;
  };
} = {
  handSet: [
    // Wave 1: the M1 wave, slow and sparse.
    {
      count: 12,
      speedMin: 14,
      speedMax: 22,
      firstLaunchMs: 1000,
      launchGapMinMs: 700,
      launchGapMaxMs: 2200,
      pairChance: 0.25,
    },
    {
      count: 14,
      speedMin: 16,
      speedMax: 25,
      firstLaunchMs: 1000,
      launchGapMinMs: 650,
      launchGapMaxMs: 2000,
      pairChance: 0.3,
    },
    {
      count: 16,
      speedMin: 18,
      speedMax: 28,
      firstLaunchMs: 1000,
      launchGapMinMs: 600,
      launchGapMaxMs: 1800,
      pairChance: 0.35,
    },
    {
      count: 18,
      speedMin: 20,
      speedMax: 31,
      firstLaunchMs: 1000,
      launchGapMinMs: 550,
      launchGapMaxMs: 1600,
      pairChance: 0.4,
    },
  ],
  formula: {
    countStep: 2,
    countMax: 30,
    speedStep: 2,
    speedMinCap: 45,
    speedMaxCap: 60,
    gapStepMs: 40,
    gapMinFloorMs: 300,
    gapMaxFloorMs: 700,
    pairStep: 0.03,
    pairMax: 0.6,
  },
};

/** Points. */
export const SCORE = {
  warhead: 25,
  /** End-of-wave bonus for each missile left in a standing base (arcade value). */
  missileLeft: 5,
  /** End-of-wave bonus for each city still standing (arcade value). */
  citySaved: 100,
  /** A bonus city is earned every this many points (arcade value). */
  bonusCityEvery: 10_000,
  /**
   * Wave multiplier (arcade rule): every point is worth 1x on waves 1-2, 2x on waves 3-4, and
   * one more every `multiplierEvery` waves, up to `multiplierMax`. Approved 2026-10-18.
   */
  multiplierEvery: 2,
  multiplierMax: 6,
} as const;

/** Colours for shapes drawn in code (placeholders until the M4 art pass). */
export const COLORS = {
  ground: 0x1a1410,
  groundEdge: 0x4a3a2a,
  city: 0x6fd3ff,
  cityWindow: 0xfff3b0,
  rubble: 0x3a3030,
  base: 0x8a7a5a,
  baseDestroyed: 0x3a3030,
  hud: '#f2e9dc',
  title: '#7ff6ff',
  pauseIcon: 0xf2e9dc,
  ammoPip: 0x7ff6ff,
  ammoOut: '#ff5a3c',
  messagePanel: 0x02121e,
  warheadTrail: 0xff5a3c,
  warheadHead: 0xffffff,
  interceptorTrail: 0x7ff6ff,
  aimMarker: 0x7ff6ff,
  blastOuter: 0xffb347,
  blastInner: 0xfff3d0,
} as const;

/** Trails and markers. */
export const TRAILS = {
  /** Alpha of a missile's trail behind its head. */
  alpha: 0.8,
  /** Half-size of the X drawn where a counter-missile will explode. */
  aimMarkerHalf: 2,
  /** The blast's bright core, as a fraction of its radius. */
  blastCore: 0.55,
} as const;

/** How cities and bases are drawn: pixel offsets from their centre on the ground. */
export const SHAPES = {
  /** [x offset, width, height] of each building in a city. */
  cityBlocks: [
    [-9, 4, 6],
    [-5, 4, 10],
    [-1, 3, 7],
    [2, 4, 12],
    [6, 4, 8],
  ],
  rubbleHeight: 2,
  baseHalfWidth: 12,
  baseHeight: 8,
} as const;

/** Missiles left, drawn as pips in the ground strip under each base. */
export const AMMO_PIPS = {
  /** Row of the pips' top edge. */
  top: GROUND_Y + 4,
  width: 1,
  height: 3,
  /** Distance from one pip's left edge to the next. */
  pitch: 2,
  /** Row of the "OUT" label's top edge when a standing base is empty. */
  outLabelTop: GROUND_Y + 3,
} as const;

/** Desktop keys that fire from one base at the mouse position (ADR-NW06): left, centre, right. */
export const BASE_KEYS: readonly (readonly string[])[] = [
  ['a', '1'],
  ['s', '2'],
  ['d', '3'],
];

/** Desktop keys that pause and resume the game. */
export const PAUSE_KEYS: readonly string[] = ['p', 'escape'];

/** Desktop keys that stand in for a tap on a screen: start, next wave, continue. */
export const CONFIRM_KEYS: readonly string[] = ['enter', ' '];

/** Score and other text along the top of the screen, in Press Start 2P at its native 8 px. */
export const HUD = {
  fontSizePx: 8,
  /** Gap from the screen edge, in game pixels. */
  margin: 4,
  /** Digits the score is padded to, arcade style. */
  scoreDigits: 6,
} as const;

/** The best score, kept in this browser's localStorage (approved 2026-10-18; nothing else). */
export const HIGH_SCORE = {
  /** localStorage key. */
  storageKey: 'nuclearwinter.highScore',
  /** Stored values above this are treated as tampered and ignored. */
  max: 999_999_999,
} as const;

/** Explosion sprites (assets/fx). They are pooled and reused. */
export const EFFECTS = {
  /** Most explosions on screen at once; extra ones are skipped. */
  poolSize: 16,
  /** A warhead hitting open ground: centred burst, drawn slightly above the ground line. */
  impact: { frameRate: 18, originY: 0.75 },
  /** A city or base destroyed: a cloud rising from the ground. */
  cityHit: { frameRate: 12, originY: 1 },
} as const;

/** The wave-cleared and game-over messages. */
export const SCREENS = {
  /** Taps are ignored for this long after the message appears, so a late shot can't skip it. */
  restartDelayMs: 1000,
  /** Rows of the message's lines, in game pixels: title, two detail lines, prompt. */
  titleY: 80,
  detailY: 94,
  detail2Y: 106,
  promptY: 124,
  /** The end-of-wave bonus counts up on screen over this many milliseconds. */
  bonusCountMs: 900,
  /** The prompt blinks on and off every this many milliseconds. */
  promptBlinkMs: 500,
  /** How long "WAVE n" shows at the start of each wave, in milliseconds. */
  waveBannerMs: 1500,
  /** Extra pixels between the banner's lines ("WAVE n" and "BONUS CITY"). */
  bannerLineSpacing: 6,
  /** Dark band behind the message, so it reads clearly over the skyline. */
  panelTop: 74,
  panelHeight: 66,
  panelAlpha: 0.7,
} as const;

/** The title screen: rows of its lines, in game pixels. */
export const TITLE = {
  /** The name is drawn at twice the font's native size, still a whole-number scale. */
  nameFontSizePx: 16,
  nameY: 44,
  highY: 80,
  helpY: 104,
  help2Y: 116,
  promptY: 148,
} as const;

/** The pause button: a tap target in the HUD's top-right corner, with a two-bar icon. */
export const PAUSE = {
  width: 20,
  height: 14,
  barWidth: 2,
  barHeight: 6,
  barGap: 2,
} as const;

/** The dev-only debug overlay (M2.7): frame rate and counts, left out of production builds. */
export const DEBUG_OVERLAY = {
  /** URL query parameter that shows it (?debug), and the key that toggles it. */
  queryParam: 'debug',
  toggleKey: '`',
  /** Top-left corner, under the HUD row. */
  x: 4,
  y: 16,
  /** Frames averaged for the frame rate; the worst frame among them is shown too. */
  sampleFrames: 120,
  alpha: 0.85,
} as const;
