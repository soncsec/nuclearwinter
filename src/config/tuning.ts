/** All gameplay numbers live here so they can be tuned in one place. */
/** Native resolution in game pixels (ADR-NW02). */
export const GAME_WIDTH = 384;
export const GAME_HEIGHT = 216;

/** The placeholder player: a box moved with the arrow keys or WASD. */
export const PLAYER = {
  size: 16,
  color: 0x2de2e6,
  /** Pixels per second. */
  speed: 120,
  /** Starting position as a fraction of the screen height. */
  startY: 0.85,
} as const;

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
