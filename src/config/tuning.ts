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

/** One wave of plain warheads (M1). M2 replaces this with the wave formula (ADR-NW05). */
export const WAVE_1 = {
  count: 12,
  /** Pixels per second, picked between these for each warhead. */
  speedMin: 14,
  speedMax: 22,
  /** Delay before the first launch and between launches, in milliseconds. */
  firstLaunchMs: 1000,
  launchGapMinMs: 700,
  launchGapMaxMs: 2200,
  /** Chance that a launch is a pair fired together. */
  pairChance: 0.25,
} as const;

/** Points. */
export const SCORE = {
  warhead: 25,
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
