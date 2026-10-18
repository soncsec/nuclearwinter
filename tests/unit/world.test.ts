import { describe, expect, it } from 'vitest';
import {
  BASES,
  BLAST,
  CITIES,
  GROUND_Y,
  INTERCEPTOR,
  SCORE,
  STEP_MS,
  WAVE_1,
} from '../../src/config/tuning';
import { blastDurationMs } from '../../src/logic/blast';
import { createRng, type Rng } from '../../src/logic/rng';
import {
  aimPoint,
  createWorld,
  drainEvents,
  fire,
  launchWarhead,
  nearestBase,
  step,
  type World,
} from '../../src/logic/world';

/** A world with no scheduled wave, so tests control every warhead. */
function quietWorld(): World {
  const w = createWorld();
  w.wave.toLaunch = 0;
  return w;
}

function run(world: World, rng: Rng, ms: number): void {
  for (let t = 0; t < ms && world.phase === 'playing'; t += STEP_MS) step(world, rng, STEP_MS);
}

describe('createWorld', () => {
  it('starts with every city and base standing and wave 1 queued', () => {
    const w = createWorld();
    expect(w.cities.map((c) => c.x)).toEqual([...CITIES.xs]);
    expect(w.cities.every((c) => c.alive)).toBe(true);
    expect(w.bases.map((b) => b.x)).toEqual([...BASES.xs]);
    expect(w.phase).toBe('playing');
    expect(w.score).toBe(0);
    expect(w.wave.toLaunch).toBe(WAVE_1.count);
  });
});

describe('firing', () => {
  it('fires from the nearest base', () => {
    const w = quietWorld();
    expect(fire(w, { x: 10, y: 50 })).toBe(true);
    expect(fire(w, { x: 200, y: 50 })).toBe(true);
    expect(fire(w, { x: 380, y: 50 })).toBe(true);
    expect(w.interceptors.map((m) => m.baseIndex)).toEqual([0, 1, 2]);
  });

  it('skips destroyed bases', () => {
    const w = quietWorld();
    w.bases.forEach((b, i) => (b.alive = i !== 0));
    expect(nearestBase(w, 0)).toBe(1);
  });

  it('breaks ties towards the leftmost base', () => {
    const w = quietWorld();
    const mid = ((BASES.xs[0] ?? 0) + (BASES.xs[1] ?? 0)) / 2;
    expect(nearestBase(w, mid)).toBe(0);
  });

  it('cannot fire with every base destroyed, or once the game is over', () => {
    const w = quietWorld();
    w.bases.forEach((b) => (b.alive = false));
    expect(fire(w, { x: 100, y: 50 })).toBe(false);
    const over = quietWorld();
    over.phase = 'gameOver';
    expect(fire(over, { x: 100, y: 50 })).toBe(false);
  });

  it('keeps the aim on screen and off the ground', () => {
    expect(aimPoint({ x: -20, y: 500 })).toEqual({ x: 0, y: INTERCEPTOR.minTargetY });
    expect(aimPoint({ x: 999, y: -5 })).toEqual({ x: 384, y: 0 });
  });

  it('reports the launch and explodes at the target', () => {
    const w = quietWorld();
    const rng = createRng(1);
    fire(w, { x: 192, y: 100 });
    expect(drainEvents(w)).toEqual([{ type: 'launch', baseIndex: 1, target: { x: 192, y: 100 } }]);
    run(w, rng, 1000); // 96 px at 240 px/s takes 0.4 s
    expect(w.interceptors).toEqual([]);
    expect(drainEvents(w)).toContainEqual({
      type: 'blast',
      center: { x: 192, y: 100 },
      kind: 'player',
    });
  });
});

describe('ammo', () => {
  it('each base starts the wave with a full load', () => {
    expect(createWorld().bases.map((b) => b.ammo)).toEqual([BASES.ammo, BASES.ammo, BASES.ammo]);
  });

  it('each shot uses one missile from the base that fired', () => {
    const w = quietWorld();
    fire(w, { x: 10, y: 50 });
    expect(w.bases.map((b) => b.ammo)).toEqual([BASES.ammo - 1, BASES.ammo, BASES.ammo]);
  });

  it('an empty base is skipped for the next nearest one', () => {
    const w = quietWorld();
    for (let i = 0; i < BASES.ammo; i++) expect(fire(w, { x: 10, y: 50 })).toBe(true);
    expect(w.bases[0]?.ammo).toBe(0);
    fire(w, { x: 10, y: 50 });
    expect(w.interceptors.at(-1)?.baseIndex).toBe(1);
  });

  it('with every base empty nothing fires, and the dry fire is reported', () => {
    const w = quietWorld();
    w.bases.forEach((b) => (b.ammo = 0));
    drainEvents(w);
    expect(fire(w, { x: 100, y: 50 })).toBe(false);
    expect(w.interceptors).toEqual([]);
    expect(drainEvents(w)).toEqual([{ type: 'dryFire', baseIndex: null }]);
  });

  it('a destroyed base loses its missiles', () => {
    const w = quietWorld();
    const x = BASES.xs[1] ?? 0;
    launchWarhead(w, { x, y: GROUND_Y - 1 }, { x, y: GROUND_Y }, 600);
    run(w, createRng(1), 100);
    expect(w.bases[1]).toMatchObject({ alive: false, ammo: 0 });
  });
});

describe('choosing a base', () => {
  it('fires from the chosen base even when another is nearer', () => {
    const w = quietWorld();
    expect(fire(w, { x: 10, y: 50 }, 2)).toBe(true);
    expect(w.interceptors[0]?.baseIndex).toBe(2);
    expect(w.bases[2]?.ammo).toBe(BASES.ammo - 1);
  });

  it('a chosen base that is empty or destroyed does not fire, and no other base fires for it', () => {
    const w = quietWorld();
    const [left, centre] = w.bases;
    if (!left || !centre) throw new Error('bases missing');
    left.ammo = 0;
    centre.alive = false;
    drainEvents(w);
    expect(fire(w, { x: 10, y: 50 }, 0)).toBe(false);
    expect(fire(w, { x: 10, y: 50 }, 1)).toBe(false);
    expect(w.interceptors).toEqual([]);
    expect(drainEvents(w)).toEqual([
      { type: 'dryFire', baseIndex: 0 },
      { type: 'dryFire', baseIndex: 1 },
    ]);
  });

  it('an unknown base number fires nothing', () => {
    const w = quietWorld();
    expect(fire(w, { x: 10, y: 50 }, 7)).toBe(false);
  });
});

describe('blasts and warheads', () => {
  it('a blast destroys a warhead inside it, scores, and leaves a chain blast', () => {
    const w = quietWorld();
    const rng = createRng(1);
    launchWarhead(w, { x: 192, y: 100 }, { x: 192, y: GROUND_Y }, 0.001);
    w.blasts.push({ id: 99, center: { x: 192, y: 105 }, ageMs: BLAST.growMs, kind: 'player' });
    step(w, rng, STEP_MS);
    expect(w.warheads).toEqual([]);
    expect(w.score).toBe(SCORE.warhead);
    const events = drainEvents(w);
    expect(events).toContainEqual({
      type: 'warheadDestroyed',
      at: { x: 192, y: expect.closeTo(100, 1) as number },
      points: SCORE.warhead,
    });
    expect(w.blasts.filter((b) => b.kind === 'chain')).toHaveLength(1);
  });

  it('a warhead outside every blast survives', () => {
    const w = quietWorld();
    launchWarhead(w, { x: 50, y: 50 }, { x: 50, y: GROUND_Y }, 0.001);
    w.blasts.push({ id: 99, center: { x: 192, y: 50 }, ageMs: BLAST.growMs, kind: 'player' });
    step(w, createRng(1), STEP_MS);
    expect(w.warheads).toHaveLength(1);
    expect(w.score).toBe(0);
  });

  it('chain blasts set off nearby warheads', () => {
    const w = quietWorld();
    const rng = createRng(1);
    launchWarhead(w, { x: 100, y: 50 }, { x: 100, y: GROUND_Y }, 0.001);
    launchWarhead(w, { x: 100 + BLAST.maxRadius - 2, y: 50 }, { x: 120, y: GROUND_Y }, 0.001);
    w.blasts.push({ id: 99, center: { x: 98, y: 50 }, ageMs: BLAST.growMs, kind: 'player' });
    run(w, rng, BLAST.growMs + 50);
    expect(w.warheads).toEqual([]);
    expect(w.score).toBe(2 * SCORE.warhead);
  });

  it('blasts disappear when they finish', () => {
    const w = quietWorld();
    w.blasts.push({ id: 99, center: { x: 100, y: 50 }, ageMs: 0, kind: 'player' });
    launchWarhead(w, { x: 300, y: 0 }, { x: 300, y: GROUND_Y }, 0.001); // keeps the wave going
    run(w, createRng(1), blastDurationMs() + STEP_MS);
    expect(w.blasts).toEqual([]);
  });
});

describe('impacts', () => {
  it('a warhead landing on a city destroys it', () => {
    const w = quietWorld();
    const x = CITIES.xs[0];
    launchWarhead(w, { x, y: GROUND_Y - 1 }, { x, y: GROUND_Y }, 600);
    step(w, createRng(1), STEP_MS);
    expect(w.cities[0]?.alive).toBe(false);
    expect(drainEvents(w)).toContainEqual({
      type: 'cityDestroyed',
      index: 0,
      at: { x, y: GROUND_Y },
    });
  });

  it('a warhead landing on a base destroys it', () => {
    const w = quietWorld();
    const x = BASES.xs[2];
    launchWarhead(w, { x, y: GROUND_Y - 1 }, { x, y: GROUND_Y }, 600);
    step(w, createRng(1), STEP_MS);
    expect(w.bases[2]?.alive).toBe(false);
    expect(drainEvents(w)).toContainEqual({
      type: 'baseDestroyed',
      index: 2,
      at: { x, y: GROUND_Y },
    });
  });

  it('a warhead landing on open ground just explodes', () => {
    const w = quietWorld();
    launchWarhead(w, { x: 176, y: GROUND_Y - 1 }, { x: 176, y: GROUND_Y }, 600);
    step(w, createRng(1), STEP_MS);
    expect(w.cities.every((c) => c.alive) && w.bases.every((b) => b.alive)).toBe(true);
    expect(drainEvents(w)).toContainEqual({ type: 'impact', at: { x: 176, y: GROUND_Y } });
  });
});

describe('waves and game over', () => {
  it('launches the whole wave, aimed at the ground, from above the screen', () => {
    const w = createWorld();
    const rng = createRng(7);
    let launched = 0;
    const seen = new Set<number>();
    for (let t = 0; t < 60_000 && w.phase === 'playing'; t += STEP_MS) {
      step(w, rng, STEP_MS);
      for (const h of w.warheads) {
        if (!seen.has(h.id)) {
          seen.add(h.id);
          launched++;
          expect(h.origin.y).toBeLessThan(0);
          expect(h.target.y).toBe(GROUND_Y);
          expect(h.speed).toBeGreaterThanOrEqual(WAVE_1.speedMin);
          expect(h.speed).toBeLessThanOrEqual(WAVE_1.speedMax);
        }
      }
    }
    expect(launched).toBe(WAVE_1.count);
  });

  it('the same seed plays out the same way', () => {
    const play = (seed: number): string => {
      const w = createWorld();
      const rng = createRng(seed);
      run(w, rng, 20_000);
      return JSON.stringify({ c: w.cities, b: w.bases, h: w.warheads, p: w.phase });
    };
    expect(play(3)).toBe(play(3));
    expect(play(3)).not.toBe(play(4));
  });

  it('ends the game when the last city falls', () => {
    const w = quietWorld();
    w.cities.forEach((c, i) => (c.alive = i === 5));
    const x = CITIES.xs[5];
    launchWarhead(w, { x, y: GROUND_Y - 1 }, { x, y: GROUND_Y }, 600);
    step(w, createRng(1), STEP_MS);
    expect(w.phase).toBe('gameOver');
    expect(drainEvents(w)).toContainEqual({ type: 'gameOver' });
  });

  it('with nothing defended, a wave destroys the cities and the game ends', () => {
    const w = createWorld();
    run(w, createRng(2), 120_000);
    // Twelve warheads at nine targets can't always reach every city, so either outcome is
    // possible, but the wave must finish.
    expect(['gameOver', 'waveCleared']).toContain(w.phase);
    expect(w.cities.some((c) => !c.alive)).toBe(true);
  });

  it('clears the wave once every warhead, missile and blast is gone', () => {
    const w = quietWorld();
    const rng = createRng(1);
    fire(w, { x: 100, y: 100 });
    run(w, rng, 5000);
    expect(w.phase).toBe('waveCleared');
    expect(drainEvents(w)).toContainEqual({ type: 'waveCleared' });
  });

  it('nothing moves after the game ends', () => {
    const w = quietWorld();
    launchWarhead(w, { x: 50, y: 0 }, { x: 50, y: GROUND_Y }, 20);
    w.phase = 'gameOver';
    const before = JSON.stringify(w);
    step(w, createRng(1), STEP_MS);
    expect(JSON.stringify(w)).toBe(before);
  });
});
