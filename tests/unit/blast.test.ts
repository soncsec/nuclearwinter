import { describe, expect, it } from 'vitest';
import { blastDurationMs, blastRadius } from '../../src/logic/blast';

const shape = { maxRadius: 10, growMs: 100, holdMs: 50, shrinkMs: 100 };

describe('blastRadius', () => {
  it('grows from nothing to full size', () => {
    expect(blastRadius(0, shape)).toBe(0);
    expect(blastRadius(50, shape)).toBe(5);
    expect(blastRadius(100, shape)).toBe(10);
  });

  it('holds at full size, then shrinks to nothing', () => {
    expect(blastRadius(149, shape)).toBe(10);
    expect(blastRadius(200, shape)).toBe(5);
    expect(blastRadius(250, shape)).toBe(0);
    expect(blastRadius(999, shape)).toBe(0);
  });

  it('is zero before it starts', () => {
    expect(blastRadius(-1, shape)).toBe(0);
  });

  it('lasts grow + hold + shrink', () => {
    expect(blastDurationMs(shape)).toBe(250);
  });
});
