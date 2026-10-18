/**
 * Largest whole-number zoom at which the game still fits the window.
 * Whole numbers keep every art pixel the same size on screen (no blurry or uneven pixels).
 * Never below 1, even if the window is smaller than the game.
 */
export function integerZoom(
  viewWidth: number,
  viewHeight: number,
  gameWidth: number,
  gameHeight: number,
): number {
  if (gameWidth <= 0 || gameHeight <= 0) throw new RangeError('game size must be positive');
  const fit = Math.min(viewWidth / gameWidth, viewHeight / gameHeight);
  return Number.isFinite(fit) ? Math.max(1, Math.floor(fit)) : 1;
}

export interface DeviceZoom {
  /** Device pixels per game pixel: always a whole number. */
  devicePixels: number;
  /** The zoom to give Phaser, in CSS pixels per game pixel (devicePixels / pixelRatio). */
  cssZoom: number;
}

/**
 * Whole-number zoom measured in device pixels (ADR-NW02).
 * A landscape phone is only about 390 CSS pixels tall but over 1000 device pixels,
 * so zooming in device pixels lets small screens use a zoom of 4 or 5 instead of 1.
 */
export function deviceZoom(
  cssWidth: number,
  cssHeight: number,
  pixelRatio: number,
  gameWidth: number,
  gameHeight: number,
): DeviceZoom {
  const ratio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const devicePixels = integerZoom(cssWidth * ratio, cssHeight * ratio, gameWidth, gameHeight);
  return { devicePixels, cssZoom: devicePixels / ratio };
}
