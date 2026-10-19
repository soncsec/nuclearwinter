import { describe, expect, it } from 'vitest';
import { BLAST, GAME_WIDTH, GROUND_Y, SMART_BOMB, STEP_MS } from '../../src/config/tuning';
import { createRng } from '../../src/logic/rng';
import {
  createWorld,
  drainEvents,
  fire,
  launchWarhead,
  smartBombChance,
  smartStep,
  step,
  type World,
} from '../../src/logic/world';

function quietWorld(): World {
  const w = createWorld();
  w.wave.toLaunch = 0;
  w.wave.raidersToLaunch = 0;
  return w;
}

describe('smart bomb chance', () => {
  it('starts at SMART_BOMB.firstWave, rises each wave, and stops at the cap', () => {
    expect(smartBombChance(1)).toBe(0);
    expect(smartBombChance(SMART_BOMB.firstWave - 1)).toBe(0);
    expect(smartBombChance(SMART_BOMB.firstWave)).toBe(SMART_BOMB.chance);
    expect(smartBombChance(1000)).toBe(SMART_BOMB.chanceMax);
  });
});

describe('smartStep', () => {
  const target = { x: 100, y: GROUND_Y };

  it('flies straight at its target when no blast is near', () => {
    const { pos, arrived } = smartStep({ x: 100, y: 0 }, target, 60, [], 1000);
    expect(arrived).toBe(false);
    expect(pos).toEqual({ x: 100, y: 60 });
  });

  it('arrives exactly on its target', () => {
    expect(smartStep({ x: 100, y: GROUND_Y - 1 }, target, 60, [], 1000)).toEqual({
      pos: target,
      arrived: true,
    });
  });

  it('ignores a blast whose edge is beyond the sense margin', () => {
    const far = { center: { x: 100 + 10 + SMART_BOMB.senseMargin + 1, y: 50 }, radius: 10 };
    const { pos } = smartStep({ x: 100, y: 50 }, target, 0.001, [far], 1000);
    expect(pos.x).toBeCloseTo(100, 2);
  });

  it('steers away from a blast close to it', () => {
    const near = { center: { x: 110, y: 50 }, radius: 5 };
    const { pos } = smartStep({ x: 100, y: 50 }, target, 0.001, [near], 100);
    expect(pos.x).toBeLessThan(100);
  });

  it('slips sideways from a blast directly on top of it', () => {
    const on = { center: { x: 100, y: 50 }, radius: 3 };
    const { pos } = smartStep({ x: 100, y: 50 }, target, 0.001, [on], 100);
    expect(pos.x).not.toBe(100);
  });

  it('never leaves the screen sideways', () => {
    const push = { center: { x: 5, y: 50 }, radius: 4 };
    const { pos } = smartStep({ x: 0, y: 50 }, { x: 0, y: GROUND_Y }, 0.001, [push], 1000);
    expect(pos.x).toBeGreaterThanOrEqual(0);
    const pushR = { center: { x: GAME_WIDTH - 5, y: 50 }, radius: 4 };
    const right = smartStep(
      { x: GAME_WIDTH, y: 50 },
      { x: GAME_WIDTH, y: GROUND_Y },
      0.001,
      [pushR],
      1000,
    );
    expect(right.pos.x).toBeLessThanOrEqual(GAME_WIDTH);
  });
});

describe('smart bombs in the world', () => {
  /** A slow warhead at (120, 60) and a shot at `shotX`: whether it survived, and kill points. */
  function survives(smart: boolean, shotX: number): { alive: boolean; score: number } {
    const w = quietWorld();
    launchWarhead(w, { x: 120, y: 60 }, { x: 120, y: GROUND_Y }, 1, smart ? { smart } : {});
    fire(w, { x: shotX, y: 60 });
    const rng = createRng(1);
    let kills = 0;
    for (let t = 0; t < 4000; t += STEP_MS) {
      step(w, rng, STEP_MS);
      // Kill points only: an empty sky also clears the wave, which adds its bonus.
      for (const e of drainEvents(w)) if (e.type === 'warheadDestroyed') kills += e.points;
    }
    return { alive: w.warheads.length > 0, score: kills };
  }

  it('dodge a blast that would catch a plain warhead', () => {
    expect(survives(false, 130).alive).toBe(false);
    expect(survives(true, 130).alive).toBe(true);
  });

  it('can always be caught: they dodge more slowly than a blast grows', () => {
    expect(SMART_BOMB.dodgeSpeed).toBeLessThan((BLAST.maxRadius / BLAST.growMs) * 1000);
  });

  it('are caught by a shot within a few pixels', () => {
    expect(survives(true, 124).alive).toBe(false);
  });

  it('are caught by a blast that starts on top of them, for 125 points', () => {
    const r = survives(true, 120);
    expect(r.alive).toBe(false);
    expect(r.score).toBe(SMART_BOMB.points);
  });

  it('are worth multiplied points on later waves', () => {
    const w = quietWorld();
    w.wave = { ...w.wave, number: 3 };
    launchWarhead(w, { x: 192, y: 100 }, { x: 192, y: GROUND_Y }, 0.001, { smart: true });
    w.blasts.push({ id: 99, center: { x: 192, y: 100 }, ageMs: BLAST.growMs, kind: 'player' });
    step(w, createRng(1), STEP_MS);
    expect(w.score).toBe(SMART_BOMB.points * 2);
    expect(drainEvents(w)).toContainEqual(
      expect.objectContaining({ type: 'warheadDestroyed', points: SMART_BOMB.points * 2 }),
    );
  });

  it('launch only from SMART_BOMB.firstWave (seeded), and never as MIRVs', () => {
    const launched = (waveNumber: number): { smart: number; both: number } => {
      const w = createWorld();
      w.wave = {
        ...w.wave,
        number: waveNumber,
        toLaunch: 300,
        nextLaunchMs: 0,
        raidersToLaunch: 0,
      };
      const rng = createRng(13);
      let smart = 0;
      let both = 0;
      for (let i = 0; i < 6000 && w.wave.toLaunch > 0; i++) {
        const before = w.warheads.length;
        step(w, rng, STEP_MS);
        for (const h of w.warheads.slice(before)) {
          if (h.smart) smart++;
          if (h.smart && h.split) both++;
        }
        w.warheads = [];
      }
      return { smart, both };
    };
    expect(launched(SMART_BOMB.firstWave - 1).smart).toBe(0);
    const later = launched(SMART_BOMB.firstWave + 5);
    expect(later.smart).toBeGreaterThan(0);
    expect(later.both).toBe(0);
  });
});
