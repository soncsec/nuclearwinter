import { describe, expect, it } from 'vitest';
import { BLAST, GAME_WIDTH, RAIDERS, SCORE, STEP_MS } from '../../src/config/tuning';
import { waveSpec } from '../../src/logic/waves';
import { firstWaveWith } from './mix';
import { createRng, type Rng } from '../../src/logic/rng';
import {
  createWorld,
  drainEvents,
  launchRaider,
  startNextWave,
  step,
  type World,
} from '../../src/logic/world';

/** A world with nothing scheduled, so tests control every raider. */
function quietWorld(): World {
  const w = createWorld();
  w.wave.toLaunch = 0;
  w.wave.raidersToLaunch = 0;
  return w;
}

function run(world: World, rng: Rng, ms: number): void {
  for (let t = 0; t < ms && world.phase === 'playing'; t += STEP_MS) step(world, rng, STEP_MS);
}

describe('raiders per wave', () => {
  it('wave 1 has none and wave 2 schedules them', () => {
    const w = createWorld();
    expect(w.wave.raidersToLaunch).toBe(0);
    w.wave.toLaunch = 0;
    run(w, createRng(1), STEP_MS * 2);
    expect(w.phase).toBe('waveCleared');
    startNextWave(w);
    expect(w.wave.raidersToLaunch).toBe(waveSpec(2).raiders);
    expect(waveSpec(2).raiders).toBeGreaterThan(0);
  });
});

describe('raiders', () => {
  it('cross the screen, drop their warheads over the play area, then leave', () => {
    const w = quietWorld();
    const r = launchRaider(w, 'bomber', 60, 1);
    expect(r.pos.x).toBe(-RAIDERS.offscreen);
    const crossMs = ((GAME_WIDTH + 2 * RAIDERS.offscreen) / RAIDERS.bomber.speed) * 1000;
    const rng = createRng(4);
    let dropped = 0;
    for (let t = 0; t < crossMs + 1000; t += STEP_MS) {
      const before = w.warheads.length;
      step(w, rng, STEP_MS);
      for (const h of w.warheads.slice(before)) {
        dropped++;
        expect(h.origin.x).toBeGreaterThanOrEqual(RAIDERS.dropMargin);
        expect(h.origin.x).toBeLessThanOrEqual(GAME_WIDTH - RAIDERS.dropMargin);
        expect(h.origin.y).toBe(60);
      }
      w.warheads = [];
    }
    expect(dropped).toBe(RAIDERS.bomber.drops);
    expect(w.raiders).toEqual([]);
  });

  it('fly left when launched from the right', () => {
    const w = quietWorld();
    launchRaider(w, 'satellite', 30, -1);
    run(w, createRng(1), 1000);
    const [s] = w.raiders;
    expect(s?.pos.x).toBeLessThan(GAME_WIDTH + RAIDERS.offscreen);
    expect(s?.pos.y).toBe(30);
  });

  it('are destroyed by a blast that touches them, for multiplied points and a blast', () => {
    const w = quietWorld();
    w.wave = { ...w.wave, number: 3 };
    const r = launchRaider(w, 'bomber', 60, 1);
    r.pos = { x: 100, y: 60 };
    // The blast's edge is just within the bomber's reach.
    const gap = BLAST.maxRadius + RAIDERS.bomber.hitRadius - 1;
    w.blasts.push({ id: 99, center: { x: 100 + gap, y: 60 }, ageMs: BLAST.growMs, kind: 'player' });
    step(w, createRng(1), STEP_MS);
    expect(w.raiders).toEqual([]);
    expect(w.score).toBe(SCORE.bomber * 2);
    expect(drainEvents(w)).toContainEqual(
      expect.objectContaining({ type: 'raiderDestroyed', kind: 'bomber', points: 200 }),
    );
    expect(w.blasts.some((b) => b.kind === 'chain')).toBe(true);
  });

  it('survive a blast that does not reach them', () => {
    const w = quietWorld();
    const r = launchRaider(w, 'satellite', 30, 1);
    r.pos = { x: 100, y: 30 };
    const gap = BLAST.maxRadius + RAIDERS.satellite.hitRadius + 3;
    w.blasts.push({ id: 99, center: { x: 100 + gap, y: 30 }, ageMs: BLAST.growMs, kind: 'player' });
    step(w, createRng(1), STEP_MS);
    expect(w.raiders).toHaveLength(1);
    expect(w.score).toBe(0);
  });

  it('keep the wave open until they are gone', () => {
    const w = quietWorld();
    launchRaider(w, 'bomber', 60, 1);
    run(w, createRng(1), 2000);
    expect(w.phase).toBe('playing');
    const crossMs = ((GAME_WIDTH + 2 * RAIDERS.offscreen) / RAIDERS.bomber.speed) * 1000;
    // Its dropped warheads must land or be shot down too; give them time to fall.
    run(w, createRng(1), crossMs + 30_000);
    expect(w.raiders).toEqual([]);
    expect(['waveCleared', 'gameOver']).toContain(w.phase);
  });

  it('launch on schedule: satellites only from their first wave (seeded)', () => {
    const kindsOn = (waveNumber: number): string[] => {
      const w = createWorld();
      w.wave = {
        ...w.wave,
        number: waveNumber,
        spec: waveSpec(waveNumber),
        toLaunch: 0,
        raidersToLaunch: 50,
        nextRaiderMs: 0,
      };
      const rng = createRng(9);
      const kinds: string[] = [];
      for (let i = 0; i < 50; i++) {
        w.wave.nextRaiderMs = w.timeMs;
        step(w, rng, STEP_MS);
        for (const e of drainEvents(w)) if (e.type === 'raiderLaunched') kinds.push(e.kind);
        w.raiders = [];
        w.warheads = [];
      }
      return kinds;
    };
    expect(kindsOn(firstWaveWith('satelliteChance') - 1)).not.toContain('satellite');
    const later = kindsOn(firstWaveWith('satelliteChance'));
    expect(later).toContain('satellite');
    expect(later).toContain('bomber');
  });

  it('are worth more than a warhead', () => {
    expect(SCORE.bomber).toBeGreaterThan(SCORE.warhead);
    expect(SCORE.satellite).toBeGreaterThan(SCORE.warhead);
  });
});
