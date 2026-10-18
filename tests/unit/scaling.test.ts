import { describe, expect, it } from 'vitest';
import { deviceZoom, integerZoom } from '../../src/logic/scaling';

describe('integerZoom', () => {
  it('picks the largest whole zoom that fits', () => {
    expect(integerZoom(1920, 1080, 256, 320)).toBe(3); // height limits: 1080 / 320 = 3.375
    expect(integerZoom(2560, 1440, 256, 320)).toBe(4); // 1440 / 320 = 4.5
    expect(integerZoom(800, 600, 256, 320)).toBe(1); // 600 / 320 = 1.875
  });

  it('uses the tighter of width and height', () => {
    expect(integerZoom(600, 2000, 256, 320)).toBe(2); // width limits: 600 / 256 = 2.34
  });

  it('returns exact multiples unchanged', () => {
    expect(integerZoom(512, 640, 256, 320)).toBe(2);
  });

  it('never goes below 1 for tiny or empty windows', () => {
    expect(integerZoom(100, 100, 256, 320)).toBe(1);
    expect(integerZoom(0, 0, 256, 320)).toBe(1);
    expect(integerZoom(Number.NaN, 600, 256, 320)).toBe(1);
  });

  it('rejects a non-positive game size', () => {
    expect(() => integerZoom(800, 600, 0, 320)).toThrow(RangeError);
    expect(() => integerZoom(800, 600, 256, -1)).toThrow(RangeError);
  });
});

describe('deviceZoom', () => {
  it('zooms in device pixels so phones get a large whole zoom', () => {
    // A landscape phone: 844x390 CSS pixels at 3x is 2532x1170 device pixels.
    expect(deviceZoom(844, 390, 3, 384, 216)).toEqual({ devicePixels: 5, cssZoom: 5 / 3 });
  });

  it('matches the CSS zoom on a 1x desktop screen', () => {
    expect(deviceZoom(1920, 1080, 1, 384, 216)).toEqual({ devicePixels: 5, cssZoom: 5 });
    expect(deviceZoom(1280, 720, 1, 384, 216)).toEqual({ devicePixels: 3, cssZoom: 3 });
  });

  it('handles fractional pixel ratios', () => {
    // 1536x864 CSS at 1.25x is 1920x1080 device pixels.
    expect(deviceZoom(1536, 864, 1.25, 384, 216)).toEqual({ devicePixels: 5, cssZoom: 4 });
  });

  it('treats a missing or invalid pixel ratio as 1', () => {
    expect(deviceZoom(1280, 720, 0, 384, 216).devicePixels).toBe(3);
    expect(deviceZoom(1280, 720, Number.NaN, 384, 216).devicePixels).toBe(3);
  });

  it('never goes below one device pixel per game pixel', () => {
    expect(deviceZoom(200, 100, 1, 384, 216)).toEqual({ devicePixels: 1, cssZoom: 1 });
  });
});
