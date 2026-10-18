import {
  BASES,
  CITIES,
  GAME_WIDTH,
  GROUND_Y,
  INTERCEPTOR,
  SCORE,
  WARHEAD,
  WAVE_1,
} from '../config/tuning';
import { blastDurationMs, blastRadius } from './blast';
import { clamp, distance, moveToward, type Point } from './geometry';
import type { Rng } from './rng';

/**
 * The whole game simulation (ADR-NW03): plain data, advanced in fixed steps by `step()`.
 * Scenes read it to draw, call `fire()` on input, and drain `events` for effects.
 */

export interface City {
  readonly x: number;
  alive: boolean;
}

export interface Base {
  readonly x: number;
  alive: boolean;
}

export interface Warhead {
  readonly id: number;
  readonly origin: Point;
  readonly target: Point;
  pos: Point;
  /** Pixels per second. */
  readonly speed: number;
}

export interface Interceptor {
  readonly id: number;
  readonly baseIndex: number;
  readonly origin: Point;
  readonly target: Point;
  pos: Point;
}

export interface Blast {
  readonly id: number;
  readonly center: Point;
  ageMs: number;
  /** 'player': a counter-missile's blast. 'chain': a destroyed warhead's blast. */
  readonly kind: 'player' | 'chain';
}

export type Phase = 'playing' | 'waveCleared' | 'gameOver';

export type GameEvent =
  | { readonly type: 'launch'; readonly baseIndex: number; readonly target: Point }
  | { readonly type: 'blast'; readonly center: Point; readonly kind: Blast['kind'] }
  | { readonly type: 'warheadDestroyed'; readonly at: Point; readonly points: number }
  | { readonly type: 'impact'; readonly at: Point }
  | { readonly type: 'cityDestroyed'; readonly index: number; readonly at: Point }
  | { readonly type: 'baseDestroyed'; readonly index: number; readonly at: Point }
  | { readonly type: 'waveCleared' }
  | { readonly type: 'gameOver' };

export interface WaveState {
  /** Warheads still to launch in this wave. */
  toLaunch: number;
  /** Game time of the next launch. */
  nextLaunchMs: number;
}

export interface World {
  timeMs: number;
  phase: Phase;
  score: number;
  readonly cities: City[];
  readonly bases: Base[];
  warheads: Warhead[];
  interceptors: Interceptor[];
  blasts: Blast[];
  readonly wave: WaveState;
  /** Things that happened since the last `drainEvents()`. */
  events: GameEvent[];
  nextId: number;
}

export function createWorld(): World {
  return {
    timeMs: 0,
    phase: 'playing',
    score: 0,
    cities: CITIES.xs.map((x) => ({ x, alive: true })),
    bases: BASES.xs.map((x) => ({ x, alive: true })),
    warheads: [],
    interceptors: [],
    blasts: [],
    wave: { toLaunch: WAVE_1.count, nextLaunchMs: WAVE_1.firstLaunchMs },
    events: [],
    nextId: 1,
  };
}

export function launchPoint(base: Base): Point {
  return { x: base.x, y: GROUND_Y - BASES.launchHeight };
}

/** Where a tap or click actually aims: on screen and never right on the ground. */
export function aimPoint(target: Point): Point {
  return {
    x: clamp(target.x, 0, GAME_WIDTH),
    y: clamp(target.y, 0, INTERCEPTOR.minTargetY),
  };
}

/** Index of the nearest surviving base to `x`, or -1 if none. Ties go to the leftmost. */
export function nearestBase(world: World, x: number): number {
  let best = -1;
  let bestDist = Infinity;
  world.bases.forEach((base, i) => {
    const d = Math.abs(base.x - x);
    if (base.alive && d < bestDist) {
      best = i;
      bestDist = d;
    }
  });
  return best;
}

/** Fires a counter-missile from the nearest base towards `target`. False if none could fire. */
export function fire(world: World, target: Point): boolean {
  if (world.phase !== 'playing') return false;
  const baseIndex = nearestBase(world, target.x);
  const base = world.bases[baseIndex];
  if (!base) return false;
  const aim = aimPoint(target);
  const origin = launchPoint(base);
  world.interceptors.push({ id: world.nextId++, baseIndex, origin, target: aim, pos: origin });
  world.events.push({ type: 'launch', baseIndex, target: aim });
  return true;
}

export function launchWarhead(world: World, origin: Point, target: Point, speed: number): Warhead {
  const warhead: Warhead = { id: world.nextId++, origin, target, pos: origin, speed };
  world.warheads.push(warhead);
  return warhead;
}

/** Returns and clears the events since the last call. */
export function drainEvents(world: World): GameEvent[] {
  const events = world.events;
  world.events = [];
  return events;
}

/** Advances the game by `dtMs` milliseconds. */
export function step(world: World, rng: Rng, dtMs: number): void {
  if (world.phase !== 'playing') return;
  world.timeMs += dtMs;
  launchDueWarheads(world, rng);
  moveInterceptors(world, dtMs);
  moveWarheads(world, dtMs);
  ageBlasts(world, dtMs);
  destroyWarheadsInBlasts(world);
  updatePhase(world);
}

function launchDueWarheads(world: World, rng: Rng): void {
  const wave = world.wave;
  while (wave.toLaunch > 0 && world.timeMs >= wave.nextLaunchMs) {
    const count = wave.toLaunch >= 2 && rng.next() < WAVE_1.pairChance ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const origin = { x: rng.range(0, GAME_WIDTH), y: WARHEAD.spawnY };
      launchWarhead(
        world,
        origin,
        pickTarget(world, rng),
        rng.range(WAVE_1.speedMin, WAVE_1.speedMax),
      );
    }
    wave.toLaunch -= count;
    wave.nextLaunchMs += rng.range(WAVE_1.launchGapMinMs, WAVE_1.launchGapMaxMs);
  }
}

/** Warheads aim at a surviving city or base; with none left, anywhere on the ground. */
function pickTarget(world: World, rng: Rng): Point {
  const xs = [
    ...world.cities.filter((c) => c.alive).map((c) => c.x),
    ...world.bases.filter((b) => b.alive).map((b) => b.x),
  ];
  const x = xs.length > 0 ? rng.pick(xs) : rng.range(0, GAME_WIDTH);
  return { x, y: GROUND_Y };
}

function moveInterceptors(world: World, dtMs: number): void {
  const step = (INTERCEPTOR.speed * dtMs) / 1000;
  world.interceptors = world.interceptors.filter((m) => {
    const { pos, arrived } = moveToward(m.pos, m.target, step);
    m.pos = pos;
    if (arrived) addBlast(world, m.target, 'player');
    return !arrived;
  });
}

function moveWarheads(world: World, dtMs: number): void {
  world.warheads = world.warheads.filter((w) => {
    const { pos, arrived } = moveToward(w.pos, w.target, (w.speed * dtMs) / 1000);
    w.pos = pos;
    if (arrived) hitGround(world, pos);
    return !arrived;
  });
}

function hitGround(world: World, at: Point): void {
  const cityIndex = world.cities.findIndex(
    (c) => c.alive && Math.abs(c.x - at.x) <= CITIES.halfWidth,
  );
  const city = world.cities[cityIndex];
  if (city) {
    city.alive = false;
    world.events.push({ type: 'cityDestroyed', index: cityIndex, at });
    return;
  }
  const baseIndex = world.bases.findIndex(
    (b) => b.alive && Math.abs(b.x - at.x) <= BASES.halfWidth,
  );
  const base = world.bases[baseIndex];
  if (base) {
    base.alive = false;
    world.events.push({ type: 'baseDestroyed', index: baseIndex, at });
    return;
  }
  world.events.push({ type: 'impact', at });
}

function addBlast(world: World, center: Point, kind: Blast['kind']): void {
  world.blasts.push({ id: world.nextId++, center, ageMs: 0, kind });
  world.events.push({ type: 'blast', center, kind });
}

function ageBlasts(world: World, dtMs: number): void {
  const duration = blastDurationMs();
  for (const b of world.blasts) b.ageMs += dtMs;
  world.blasts = world.blasts.filter((b) => b.ageMs < duration);
}

function destroyWarheadsInBlasts(world: World): void {
  world.warheads = world.warheads.filter((w) => {
    const caught = world.blasts.some((b) => distance(b.center, w.pos) <= blastRadius(b.ageMs));
    if (caught) {
      world.score += SCORE.warhead;
      world.events.push({ type: 'warheadDestroyed', at: w.pos, points: SCORE.warhead });
      addBlast(world, w.pos, 'chain');
    }
    return !caught;
  });
}

function updatePhase(world: World): void {
  if (!world.cities.some((c) => c.alive)) {
    world.phase = 'gameOver';
    world.events.push({ type: 'gameOver' });
    return;
  }
  const quiet =
    world.wave.toLaunch === 0 &&
    world.warheads.length === 0 &&
    world.interceptors.length === 0 &&
    world.blasts.length === 0;
  if (quiet) {
    world.phase = 'waveCleared';
    world.events.push({ type: 'waveCleared' });
  }
}
