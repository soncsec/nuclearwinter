/** Every image the game loads, with its frame size for sprite sheets. Listed in CREDITS.md. */
export const IMAGES = {
  skylineNight: 'assets/backgrounds/skyline-far-night.png',
} as const;

export const SHEETS = {
  /** Warhead hitting the ground: 8 frames of 32×32. */
  impact: { path: 'assets/fx/explosion-1-a.png', frameWidth: 32, frameHeight: 32, frames: 8 },
  /** A city or base being destroyed: 8 frames of 64×64. */
  cityHit: { path: 'assets/fx/explosion-1-b.png', frameWidth: 64, frameHeight: 64, frames: 8 },
} as const;

export const FONT_FAMILY = '"Press Start 2P"';
