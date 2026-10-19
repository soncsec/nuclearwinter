import { describe, expect, it } from 'vitest';
import { ASH, GLOOM, SKY } from '../../src/config/tuning';
import { ashAlpha, createAsh, stepAsh, visibleFlakes } from '../../src/logic/ash';
import { easeToward, gloomTarget, lerpColor, skyLook } from '../../src/logic/gloom';
import { createRng } from '../../src/logic/rng';

describe('gloom', () => {
  it('rises with each city lost, from 0 to 1', () => {
    expect(gloomTarget(0, 6)).toBe(0);
    expect(gloomTarget(3, 6)).toBe(0.5);
    expect(gloomTarget(6, 6)).toBe(1);
    expect(gloomTarget(0, 0)).toBe(0);
  });

  it('eases toward its target instead of jumping, both ways', () => {
    expect(easeToward(0, 1, 1000, 0.25)).toBeCloseTo(0.25);
    expect(easeToward(0.9, 1, 1000, 0.25)).toBe(1);
    expect(easeToward(0.5, 1 / 3, 100, 0.25)).toBeCloseTo(0.475);
  });

  it('blends colours channel by channel', () => {
    expect(lerpColor(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(lerpColor(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(lerpColor(0x000000, 0x204060, 0.5)).toBe(0x102030);
    expect(lerpColor(0x102030, 0x405060, 2)).toBe(0x405060);
  });

  it('is the clear night at 0 and the full nuclear-winter sky by fullAt', () => {
    const clear = skyLook(0, SKY);
    expect(clear).toEqual({
      top: SKY.top,
      horizon: SKY.horizon,
      skylineTint: SKY.skylineTint,
      starAlpha: 1,
      emberAlpha: 0,
    });
    const grim = skyLook(GLOOM.fullAt, SKY);
    expect(grim.top).toBe(GLOOM.top);
    expect(grim.horizon).toBe(GLOOM.horizon);
    expect(grim.skylineTint).toBe(GLOOM.skylineTint);
    expect(skyLook(GLOOM.starsGoneAt, SKY).starAlpha).toBe(0);
    expect(skyLook(1, SKY).emberAlpha).toBeCloseTo(GLOOM.emberMaxAlpha);
  });
});

describe('ash', () => {
  it('thickens from a few faint flakes to the whole pool, more solid', () => {
    expect(visibleFlakes(0)).toBe(ASH.minFlakes);
    expect(visibleFlakes(1)).toBe(ASH.maxFlakes);
    expect(visibleFlakes(0.5)).toBeGreaterThan(visibleFlakes(1 / 6));
    expect(ASH.maxFlakes).toBeLessThanOrEqual(ASH.poolSize);
    expect(ashAlpha(0)).toBe(ASH.alphaMin);
    expect(ashAlpha(1)).toBe(ASH.alphaMax);
  });

  it('starts every flake inside the area with tuned speeds', () => {
    const flakes = createAsh(ASH.poolSize, createRng(1), 384, 204);
    expect(flakes).toHaveLength(ASH.poolSize);
    for (const f of flakes) {
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.x).toBeLessThan(384);
      expect(f.y).toBeGreaterThanOrEqual(0);
      expect(f.y).toBeLessThan(204);
      expect(f.vy).toBeGreaterThanOrEqual(ASH.fallMin);
      expect(f.vy).toBeLessThan(ASH.fallMax);
      expect(ASH.colors).toContain(f.color);
    }
  });

  it('falls, and wraps flakes back into the area at both edges and the bottom', () => {
    const rng = createRng(2);
    const flakes = createAsh(50, rng, 384, 204);
    const firstY = flakes.map((f) => f.y);
    stepAsh(flakes, 100, rng, 384, 204);
    expect(flakes.some((f, i) => f.y !== firstY[i])).toBe(true);
    for (let i = 0; i < 400; i++) stepAsh(flakes, 250, rng, 384, 204);
    for (const f of flakes) {
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.x).toBeLessThan(384);
      expect(f.y).toBeGreaterThanOrEqual(0);
      expect(f.y).toBeLessThan(204);
    }
  });
});
