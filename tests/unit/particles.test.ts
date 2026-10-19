import { describe, expect, it } from 'vitest';
import { PARTICLES } from '../../src/config/tuning';
import {
  burst,
  clearParticles,
  createParticlePool,
  liveCount,
  particleFade,
  stepParticles,
  type BurstSpec,
} from '../../src/logic/particles';
import { createRng } from '../../src/logic/rng';

const spec: BurstSpec = {
  count: 5,
  speedMin: 10,
  speedMax: 10,
  lifeMin: 100,
  lifeMax: 100,
  angleMin: -Math.PI / 2,
  angleMax: -Math.PI / 2,
  colors: [0xff0000],
};

describe('particles', () => {
  it('starts the requested sparks at the point', () => {
    const pool = createParticlePool(8);
    expect(burst(pool, { x: 50, y: 60 }, spec, createRng(1))).toBe(5);
    expect(liveCount(pool)).toBe(5);
    for (const p of pool.particles.filter((q) => q.alive)) {
      expect(p).toMatchObject({ x: 50, y: 60, color: 0xff0000, ageMs: 0, lifeMs: 100 });
    }
  });

  it('never grows the pool: a full pool skips the extra sparks', () => {
    const pool = createParticlePool(8);
    const rng = createRng(1);
    burst(pool, { x: 0, y: 0 }, spec, rng);
    expect(burst(pool, { x: 0, y: 0 }, spec, rng)).toBe(3);
    expect(burst(pool, { x: 0, y: 0 }, spec, rng)).toBe(0);
    expect(pool.particles).toHaveLength(8);
  });

  it('moves sparks along their launch direction, pulled down by gravity', () => {
    const pool = createParticlePool(1);
    burst(pool, { x: 10, y: 100 }, spec, createRng(1));
    stepParticles(pool, 50, 0);
    const [p] = pool.particles;
    if (!p) throw new Error('empty pool');
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(99.5);
    stepParticles(pool, 20, 1000);
    expect(p.vy).toBeGreaterThan(0);
  });

  it('fades out and dies at the end of its life, freeing the slot', () => {
    const pool = createParticlePool(1);
    burst(pool, { x: 0, y: 0 }, spec, createRng(1));
    const [p] = pool.particles;
    if (!p) throw new Error('empty pool');
    expect(particleFade(p)).toBe(1);
    stepParticles(pool, 50, 0);
    expect(particleFade(p)).toBeCloseTo(0.5);
    stepParticles(pool, 50, 0);
    expect(p.alive).toBe(false);
    expect(burst(pool, { x: 0, y: 0 }, spec, createRng(1))).toBe(1);
  });

  it('is the same for the same random stream', () => {
    const a = createParticlePool(32);
    const b = createParticlePool(32);
    burst(a, { x: 5, y: 5 }, PARTICLES.city, createRng(9));
    burst(b, { x: 5, y: 5 }, PARTICLES.city, createRng(9));
    expect(a).toEqual(b);
  });

  it('keeps every tuned burst inside its ranges and the pool', () => {
    for (const s of [PARTICLES.kill, PARTICLES.impact, PARTICLES.city, PARTICLES.raider]) {
      const pool = createParticlePool(PARTICLES.poolSize);
      expect(burst(pool, { x: 0, y: 0 }, s, createRng(3))).toBe(s.count);
      for (const p of pool.particles.filter((q) => q.alive)) {
        expect(p.lifeMs).toBeGreaterThanOrEqual(s.lifeMin);
        expect(p.lifeMs).toBeLessThan(s.lifeMax);
        expect(Math.hypot(p.vx, p.vy)).toBeLessThan(s.speedMax);
        expect(s.colors).toContain(p.color);
      }
    }
  });

  it('clears every spark', () => {
    const pool = createParticlePool(8);
    burst(pool, { x: 0, y: 0 }, spec, createRng(1));
    clearParticles(pool);
    expect(liveCount(pool)).toBe(0);
  });
});
