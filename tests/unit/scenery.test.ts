import { describe, expect, it } from 'vitest';
import { CITY_WINDOWS, GAME_WIDTH, SHAPES, STARS } from '../../src/config/tuning';
import { litWindows, starField } from '../../src/logic/scenery';

describe('starField', () => {
  it('gives the same stars for the same seed', () => {
    expect(starField(7, 20, 384, 120)).toEqual(starField(7, 20, 384, 120));
    expect(starField(7, 20, 384, 120)).not.toEqual(starField(8, 20, 384, 120));
  });

  it('places every star on a whole pixel inside the area', () => {
    const stars = starField(STARS.seed, STARS.count, GAME_WIDTH, STARS.maxY);
    expect(stars).toHaveLength(STARS.count);
    for (const s of stars) {
      expect(Number.isInteger(s.x) && Number.isInteger(s.y)).toBe(true);
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThan(GAME_WIDTH);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThan(STARS.maxY);
      expect(s.brightness).toBeGreaterThanOrEqual(0);
      expect(s.brightness).toBeLessThan(1);
    }
  });
});

describe('litWindows', () => {
  const blocks = SHAPES.cityBlocks;
  const lit = (chance: number, seed = CITY_WINDOWS.seed) =>
    litWindows(seed, blocks, CITY_WINDOWS.pitchX, CITY_WINDOWS.pitchY, chance);

  it('lights every spot at chance 1 and none at chance 0', () => {
    expect(lit(0)).toEqual([]);
    expect(lit(1).length).toBeGreaterThan(0);
  });

  it('keeps every window inside its building, clear of the edges and the ground', () => {
    for (const w of lit(1)) {
      const inside = blocks.some(
        ([dx, bw, h]) => w.dx > dx - 1 && w.dx < dx + bw - 1 && w.dy >= -h + 2 && w.dy < -1,
      );
      expect(inside).toBe(true);
    }
  });

  it('is the same for the same seed and lights a subset at the tuned chance', () => {
    expect(lit(CITY_WINDOWS.litChance)).toEqual(lit(CITY_WINDOWS.litChance));
    const all = lit(1);
    for (const w of lit(CITY_WINDOWS.litChance)) expect(all).toContainEqual(w);
  });
});
