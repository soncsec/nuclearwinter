/** All gameplay numbers live here so they can be tuned in one place. */
/** Native resolution in game pixels (ADR-NW02). */
export const GAME_WIDTH = 384;
export const GAME_HEIGHT = 216;

/** Seed for the random number generator; override with ?seed= in the URL. */
export const DEFAULT_SEED = 1;

/** Background: night sky, stars and the distant skyline (assets/backgrounds/skyline-far-night.png). */
export const SKY = {
  /** The sky fades from `top` at the top of the screen to `horizon` at the ground. */
  top: 0x02060f,
  horizon: 0x082a3e,
  /** Game-pixel row where the top of the skyline image sits. */
  skylineTop: 72,
  /** Rows of the 192-row image shown: everything above the street. */
  skylineHeight: GAME_HEIGHT - 72,
  /** Multiplied into the skyline so it sits behind the action (approved look, M4.0). */
  skylineTint: 0x56606e,
} as const;

/**
 * Nuclear winter (M4.4): the sky as cities are lost, from the approved mock-up. Gloom runs from
 * 0 (all cities standing) to 1 (all lost); the colours below are the look at full gloom.
 */
export const GLOOM = {
  /** How fast gloom moves toward its target, per second (one city is 1/6). */
  easePerSecond: 0.25,
  top: 0x0e0b0c,
  horizon: 0x46281a,
  skylineTint: 0x3a2c26,
  /** The colours are fully changed at this gloom (3 of 6 cities lost is 0.5). */
  fullAt: 0.625,
  /** Stars are gone at this gloom. */
  starsGoneAt: 0.45,
  /** Orange glow of burning cities along the horizon, strongest at full gloom. */
  emberColor: 0xff6e28,
  emberMaxAlpha: 0.45,
  emberHeight: 70,
} as const;

/** Falling ash (M4.4): a fixed pool of flakes; more show, and more solidly, as gloom rises. */
export const ASH = {
  poolSize: 480,
  minFlakes: 30,
  maxFlakes: 480,
  alphaMin: 0.35,
  alphaMax: 0.95,
  /** Pixels per second: down, and sideways (positive is right). */
  fallMin: 6,
  fallMax: 14,
  driftMin: -3,
  driftMax: 5,
  /** Chance a flake is a 2×2 clump, or two pixels wide; the rest are single pixels. */
  clumpChance: 0.2,
  wideChance: 0.35,
  colors: [0x8c847a, 0x9c9488, 0xaaa294],
} as const;

/** Fixed star field: the same stars in every game. */
export const STARS = {
  seed: 7,
  count: 90,
  /** Stars sit above this row, clear of the skyline's lower half. */
  maxY: 120,
  color: 0xdcebff,
  /** Alpha of the dimmest star; the brightest is 1. */
  minAlpha: 0.25,
  /** Stars brighter than this get a faint cross-shaped glint. */
  glintAbove: 0.93,
  glintAlpha: 0.35,
} as const;

/** City windows: a grid inside each building, some lit; the same in every game. */
export const CITY_WINDOWS = {
  seed: 3,
  pitchX: 2,
  pitchY: 3,
  litChance: 0.65,
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
  /**
   * Counter-missiles per base each wave. Classic Missile Command has 10; the owner's tuning
   * session (2026-10-19) found that a little short and raised it by 20%.
   */
  ammo: 12,
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

/**
 * Bombers and satellites (M3.2): they cross the sky and drop warheads while over the play
 * area. A blast that touches one destroys it. How many come each wave, and how many are
 * satellites, is part of the wave's enemy mix (`WAVES`).
 */
export const RAIDERS = {
  /** The first raider of a wave, then the gaps between them, in milliseconds. */
  firstSpawnMs: 4000,
  gapMinMs: 5000,
  gapMaxMs: 9000,
  /** Raiders start and leave this many pixels beyond the screen's edge. */
  offscreen: 16,
  /** Warheads are dropped only this far inside the screen's edges. */
  dropMargin: 24,
  dropGapMinMs: 1500,
  dropGapMaxMs: 3000,
  bomber: { yMin: 50, yMax: 80, speed: 28, drops: 3, hitRadius: 5 },
  satellite: { yMin: 24, yMax: 44, speed: 20, drops: 2, hitRadius: 4 },
} as const;

/**
 * Smart bombs (M3.3): a launched warhead may be a smart bomb (how often is part of the wave's
 * enemy mix, `WAVES`). It has no trail, and when a blast comes within `senseMargin` pixels of
 * reaching it, it steers away from the blast at `dodgeSpeed` px/s, then heads back to its
 * target. `dodgeSpeed` must stay below a blast's growth speed (BLAST.maxRadius / BLAST.growMs,
 * 40 px/s), or a smart bomb could never be caught: at 24 px/s a shot within about 5 px still
 * catches one.
 */
export const SMART_BOMB = {
  senseMargin: 10,
  dodgeSpeed: 24,
} as const;

/**
 * Splitting warheads (MIRVs, M3.1): a launched warhead may be a MIRV (how often is part of the
 * wave's enemy mix, `WAVES`). It looks like any other until it reaches its split row, then
 * becomes 2 or 3 warheads aimed at different targets. Shooting it down before the split stops
 * all of them.
 */
export const MIRV = {
  /** The split happens somewhere between these rows. */
  splitYMin: 50,
  splitYMax: 120,
  childrenMin: 2,
  childrenMax: 3,
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
  /** Enemy mix (M3.4): chance that a launched warhead is a MIRV, or a smart bomb. */
  readonly mirvChance: number;
  readonly smartBombChance: number;
  /** Bombers and satellites sent this wave, and the chance that each is a satellite. */
  readonly raiders: number;
  readonly satelliteChance: number;
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
    readonly mirvStep: number;
    readonly mirvMax: number;
    /** Smart bombs start at `smartBombFromWave` with `smartBombStart`, then rise by the step. */
    readonly smartBombFromWave: number;
    readonly smartBombStart: number;
    readonly smartBombStep: number;
    readonly smartBombMax: number;
    /** One more raider every `raiderEveryWaves` waves after the hand-set ones, up to the cap. */
    readonly raiderEveryWaves: number;
    readonly raidersMax: number;
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
      mirvChance: 0,
      smartBombChance: 0,
      raiders: 0,
      satelliteChance: 0,
    },
    {
      count: 14,
      speedMin: 16,
      speedMax: 25,
      firstLaunchMs: 1000,
      launchGapMinMs: 650,
      launchGapMaxMs: 2000,
      pairChance: 0.3,
      // Bombers arrive.
      mirvChance: 0,
      smartBombChance: 0,
      raiders: 1,
      satelliteChance: 0,
    },
    {
      count: 16,
      speedMin: 18,
      speedMax: 28,
      firstLaunchMs: 1000,
      launchGapMinMs: 600,
      launchGapMaxMs: 1800,
      pairChance: 0.35,
      // MIRVs arrive.
      mirvChance: 0.1,
      smartBombChance: 0,
      raiders: 1,
      satelliteChance: 0,
    },
    {
      count: 18,
      speedMin: 20,
      speedMax: 31,
      firstLaunchMs: 1000,
      launchGapMinMs: 550,
      launchGapMaxMs: 1600,
      pairChance: 0.4,
      // Satellites join the bombers.
      mirvChance: 0.13,
      smartBombChance: 0,
      raiders: 2,
      satelliteChance: 0.4,
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
    mirvStep: 0.03,
    mirvMax: 0.35,
    // Smart bombs arrive at wave 6.
    smartBombFromWave: 6,
    smartBombStart: 0.08,
    smartBombStep: 0.02,
    smartBombMax: 0.25,
    raiderEveryWaves: 2,
    raidersMax: 4,
  },
};

/** Points. */
export const SCORE = {
  /** Points for each enemy destroyed (arcade values), before the wave multiplier. */
  warhead: 25,
  smartBomb: 125,
  bomber: 100,
  satellite: 100,
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
  /** A bit darker than the first cyan, as the owner asked for the approved look (M4.0). */
  city: 0x4aa3cc,
  /** The shaded right-hand column of each building. */
  cityShade: 0x2c6f93,
  cityWindow: 0xfff3b0,
  rubble: 0x3a3030,
  rubbleDark: 0x2a2222,
  base: 0x8a7a5a,
  baseDestroyed: 0x3a3030,
  hud: '#f2e9dc',
  title: '#7ff6ff',
  dailyButton: 0x7ff6ff,
  buildText: '#6b7f8c',
  pauseIcon: 0xf2e9dc,
  ammoPip: 0x7ff6ff,
  ammoOut: '#ff5a3c',
  messagePanel: 0x02121e,
  warheadTrail: 0xff5a3c,
  bomber: 0xd0d6dc,
  satellite: 0xc8b0ff,
  satellitePanel: 0x5a7cff,
  warheadHead: 0xffffff,
  smartBomb: 0xffe066,
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
  /** Darker chunks on a destroyed city's rubble: [x offset, y offset from the ground, width, height]. */
  rubbleChunks: [
    [-6, -4, 3, 2],
    [2, -3, 4, 1],
  ],
  baseHalfWidth: 12,
  baseHeight: 8,
  /** Bomber: [x offset, y offset, width, height] rectangles, drawn facing right (mirrored left). */
  bomber: [
    [-5, -1, 10, 2],
    [-1, -4, 3, 8],
    [-5, -3, 2, 2],
  ],
  /** Satellite: a body with a panel on each side, as [x offset, y offset, width, height]. */
  satelliteBody: [-2, -2, 4, 4],
  satellitePanels: [
    [-7, -1, 4, 2],
    [3, -1, 4, 2],
  ],
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
  /** The daily challenge's best, saved as "YYYY-MM-DD:score" (approved 2026-10-18). */
  dailyStorageKey: 'nuclearwinter.dailyBest',
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

/**
 * Glow (M4.2, ADR-NW04): soft halos drawn with additive blending under the sharp trails and
 * blasts. Each halo is a wider line, or a bigger circle, at low alpha.
 */
export const GLOW = {
  trailHalos: [
    { width: 5, alpha: 0.1 },
    { width: 3, alpha: 0.22 },
  ],
  blastHalos: [
    { scale: 1.7, alpha: 0.05 },
    { scale: 1.45, alpha: 0.09 },
    { scale: 1.2, alpha: 0.16 },
  ],
} as const;

/**
 * City-hit flash (M4.3): a short warm wash over the screen when a city or base is destroyed.
 * Never more than `maxPerSecond` flashes start in any second (photosensitive-safe limit).
 */
export const FLASH = {
  color: 0xffd6aa,
  peakAlpha: 0.32,
  durationMs: 120,
  maxPerSecond: 3,
} as const;

/** Screen shake (M4.3) when a city or base is destroyed: whole-pixel jolts that die away. */
export const SHAKE = {
  amplitude: 2,
  durationMs: 250,
} as const;

/**
 * Optional bloom (M4.7, ADR-NW04): bright pixels (trails, blasts, fire) bleed a soft light. On
 * where WebGL is available; switched off for the rest of the game when the frame rate stays low.
 */
export const BLOOM = {
  /** Only pixels brighter than this (0..1) glow. */
  threshold: 0.6,
  blurRadius: 2,
  blurSteps: 4,
  /** How much of the glow is added back (0..1). */
  amount: 0.6,
  /** Watchdog: ignore the first 2 s, then switch off after 3 s averaging under 50 fps. */
  warmupMs: 2000,
  slowFrameMs: 20,
  slowForMs: 3000,
  smoothing: 0.05,
} as const;

/** Phone vibration (M4.8): on/off pattern in milliseconds when a city or base is destroyed. */
export const VIBRATION = {
  cityHit: [90, 50, 60],
} as const;

const SPARK_COLORS = [0xffb347, 0xfff3d0, 0xff7a2a] as const;

/** Spark particles (M4.2): one fixed pool, a burst for each kind of explosion. */
export const PARTICLES = {
  poolSize: 256,
  /** Pull on falling sparks, pixels per second squared. */
  gravity: 70,
  /** A warhead or smart bomb destroyed in the air: sparks in every direction. */
  kill: {
    count: 10,
    speedMin: 20,
    speedMax: 60,
    lifeMin: 300,
    lifeMax: 700,
    angleMin: -Math.PI,
    angleMax: Math.PI,
    colors: SPARK_COLORS,
  },
  /** A warhead hitting open ground: sparks thrown upwards. */
  impact: {
    count: 12,
    speedMin: 30,
    speedMax: 80,
    lifeMin: 300,
    lifeMax: 800,
    angleMin: -Math.PI,
    angleMax: 0,
    colors: [0xff7a2a, 0xffb347, 0x8a7a5a],
  },
  /** A city or base destroyed: a bigger, longer shower. */
  city: {
    count: 28,
    speedMin: 30,
    speedMax: 110,
    lifeMin: 500,
    lifeMax: 1300,
    angleMin: -Math.PI,
    angleMax: 0,
    colors: [0xff5a1e, 0xffb347, 0xfff3d0],
  },
  /** A bomber or satellite shot down. */
  raider: {
    count: 18,
    speedMin: 25,
    speedMax: 75,
    lifeMin: 400,
    lifeMax: 900,
    angleMin: -Math.PI,
    angleMax: Math.PI,
    colors: [0xd0d6dc, 0xffb347, 0xfff3d0],
  },
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
  /** The daily challenge button: its row, and how far above and below it a tap still counts. */
  dailyY: 170,
  /** The build number, small and dim in the ground strip at the bottom right. */
  buildY: 206,
  dailyTapHalfHeight: 9,
  dailyPanelWidth: 260,
  dailyPanelHeight: 16,
  /** The settings button, under the daily challenge. */
  settingsY: 188,
  settingsTapHalfHeight: 7,
  settingsPanelWidth: 120,
  settingsPanelHeight: 14,
} as const;

/** The settings screen (M4.5): its rows, and the keys that toggle them on desktop. */
export const SETTINGS = {
  /** localStorage key; approved 2026-10-18 for reduce flashing and vibration only. */
  storageKey: 'nuclearwinter.settings',
  titleY: 36,
  /** Each option's row, and the hint line under it. */
  rowYs: [84, 120],
  hintGap: 15,
  backY: 170,
  rowTapHalfHeight: 10,
  panelWidth: 300,
  panelHeight: 16,
  backPanelWidth: 120,
  /** Keys: 1 and 2 toggle the options; Escape, Backspace or B go back. */
  toggleKeys: ['1', '2'],
  backKeys: ['escape', 'backspace', 'b'],
} as const;

/** Desktop key that starts the daily challenge from the title screen. */
export const DAILY_KEY = 'd';
/** Opens the settings screen from the title. */
export const SETTINGS_KEY = 's';

/** The pause button: a tap target in the HUD's top-right corner, with a two-bar icon. */
export const PAUSE = {
  width: 20,
  height: 14,
  barWidth: 2,
  barHeight: 6,
  barGap: 2,
} as const;

/** The debug overlay (M2.7): frame rate and counts. Production loads it only with ?debug. */
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
