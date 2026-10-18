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
