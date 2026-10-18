import { describe, expect, it } from 'vitest';
import { clamp, distance, moveToward } from '../../src/logic/geometry';

describe('geometry', () => {
  it('measures straight-line distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('clamps to a range', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('moves part of the way when the target is far', () => {
    const r = moveToward({ x: 0, y: 0 }, { x: 10, y: 0 }, 4);
    expect(r).toEqual({ pos: { x: 4, y: 0 }, arrived: false });
  });

  it('stops exactly on the target instead of overshooting', () => {
    const r = moveToward({ x: 0, y: 0 }, { x: 3, y: 4 }, 100);
    expect(r).toEqual({ pos: { x: 3, y: 4 }, arrived: true });
  });

  it('counts as arrived when already there', () => {
    expect(moveToward({ x: 2, y: 2 }, { x: 2, y: 2 }, 0).arrived).toBe(true);
  });
});
