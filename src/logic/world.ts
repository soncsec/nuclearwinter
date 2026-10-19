import {
  BASES,
  CITIES,
  GAME_WIDTH,
  GROUND_Y,
  INTERCEPTOR,
  MIRV,
  RAIDERS,
  SCORE,
  SMART_BOMB,
  WARHEAD,
  type WaveSpec,
} from '../config/tuning';
import { blastDurationMs, blastRadius } from './blast';
import { clamp, distance, moveToward, type Point } from './geometry';
import type { Rng } from './rng';
import { bonusCitiesEarned, waveBonus, waveMultiplier, type WaveBonus } from './scoring';
import { waveSpec } from './waves';

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
  /** Counter-missiles left this wave. */
  ammo: number;
}

export interface Warhead {
  readonly id: number;
  readonly origin: Point;
  readonly target: Point;
  pos: Point;
  /** Pixels per second. */
  readonly speed: number;
  /** A MIRV: splits into `count` warheads when it reaches row `atY`. */
  readonly split?: { readonly atY: number; readonly count: number };
  /** For a warhead born from a split: where the parent's trail began, so it stays drawn. */
  readonly stemFrom?: Point;
  /** A smart bomb: steers around blasts (M3.3). */
  readonly smart?: boolean;
}

export type RaiderKind = 'bomber' | 'satellite';

/** A bomber or satellite crossing the sky and dropping warheads (M3.2). */
export interface Raider {
  readonly id: number;
  readonly kind: RaiderKind;
  pos: Point;
  /** 1 flies right, -1 flies left. */
  readonly dir: 1 | -1;
  /** Pixels per second. */
  readonly speed: number;
  dropsLeft: number;
  nextDropMs: number;
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
  /** A shot was asked for but no base (or not the chosen base) could fire. */
  | { readonly type: 'dryFire'; readonly baseIndex: number | null }
  | { readonly type: 'blast'; readonly center: Point; readonly kind: Blast['kind'] }
  | { readonly type: 'warheadDestroyed'; readonly at: Point; readonly points: number }
  | { readonly type: 'impact'; readonly at: Point }
  /** A MIRV split into `count` warheads at `at`. */
  | { readonly type: 'warheadSplit'; readonly at: Point; readonly count: number }
  | { readonly type: 'cityDestroyed'; readonly index: number; readonly at: Point }
  | { readonly type: 'baseDestroyed'; readonly index: number; readonly at: Point }
  | { readonly type: 'waveCleared'; readonly number: number; readonly bonus: WaveBonus }
  | { readonly type: 'waveStarted'; readonly number: number }
  /** New bonus cities were earned (`count`), banked until a city needs rebuilding. */
  | { readonly type: 'bonusCity'; readonly count: number }
  | { readonly type: 'cityRebuilt'; readonly index: number }
  | { readonly type: 'raiderLaunched'; readonly kind: RaiderKind }
  | {
      readonly type: 'raiderDestroyed';
      readonly kind: RaiderKind;
      readonly at: Point;
      readonly points: number;
    }
  | { readonly type: 'gameOver' };

export interface WaveState {
  /** 1 for the first wave. */
  readonly number: number;
  /** How this wave launches its warheads. */
  readonly spec: WaveSpec;
  /** Warheads still to launch in this wave. */
  toLaunch: number;
  /** Game time of the next launch. */
  nextLaunchMs: number;
  /** Bombers and satellites still to come this wave, and when the next one does. */
  raidersToLaunch: number;
  nextRaiderMs: number;
}

export interface World {
  timeMs: number;
  phase: Phase;
  score: number;
  readonly cities: City[];
  readonly bases: Base[];
  warheads: Warhead[];
  raiders: Raider[];
  interceptors: Interceptor[];
  blasts: Blast[];
  wave: WaveState;
  /** Bonus cities credited so far (one per `SCORE.bonusCityEvery` points). */
  bonusCitiesAwarded: number;
  /** Bonus cities earned but not yet needed; each rebuilds a lost city at the next wave. */
  spareCities: number;
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
    bases: BASES.xs.map((x) => ({ x, alive: true, ammo: BASES.ammo })),
    warheads: [],
    raiders: [],
    interceptors: [],
    blasts: [],
    wave: newWave(1, 0),
    bonusCitiesAwarded: 0,
    spareCities: 0,
    events: [],
    nextId: 1,
  };
}

function newWave(number: number, timeMs: number): WaveState {
  const spec = waveSpec(number);
  return {
    number,
    spec,
    toLaunch: spec.count,
    nextLaunchMs: timeMs + spec.firstLaunchMs,
    raidersToLaunch: spec.raiders,
    nextRaiderMs: timeMs + RAIDERS.firstSpawnMs,
  };
}

/**
 * Sends a bomber or satellite across the sky at row `y`, from the left edge when `dir` is 1
 * and from the right when it is -1. Its first drop comes once it is over the play area.
 */
export function launchRaider(world: World, kind: RaiderKind, y: number, dir: 1 | -1): Raider {
  const spec = RAIDERS[kind];
  const x = dir === 1 ? -RAIDERS.offscreen : GAME_WIDTH + RAIDERS.offscreen;
  const raider: Raider = {
    id: world.nextId++,
    kind,
    pos: { x, y },
    dir,
    speed: spec.speed,
    dropsLeft: spec.drops,
    nextDropMs: world.timeMs,
  };
  world.raiders.push(raider);
  world.events.push({ type: 'raiderLaunched', kind });
  return raider;
}

/**
 * Starts the next wave after one is cleared: harder launches, every base rebuilt and reloaded,
 * and bonus cities (one per `SCORE.bonusCityEvery` points) rebuilding lost cities, leftmost
 * first. Bonus cities not needed yet are kept for later waves.
 * Returns false (and changes nothing) unless the wave has just been cleared.
 */
export function startNextWave(world: World): boolean {
  if (world.phase !== 'waveCleared') return false;
  world.wave = newWave(world.wave.number + 1, world.timeMs);
  for (const b of world.bases) {
    b.alive = true;
    b.ammo = BASES.ammo;
  }
  world.phase = 'playing';
  world.events.push({ type: 'waveStarted', number: world.wave.number });

  const earned = bonusCitiesEarned(world.score) - world.bonusCitiesAwarded;
  if (earned > 0) {
    world.bonusCitiesAwarded += earned;
    world.spareCities += earned;
    world.events.push({ type: 'bonusCity', count: earned });
  }
  world.cities.forEach((city, index) => {
    if (city.alive || world.spareCities === 0) return;
    city.alive = true;
    world.spareCities--;
    world.events.push({ type: 'cityRebuilt', index });
  });
  return true;
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

/** Whether a base can fire: standing, with ammo left. */
export function canFire(base: Base): boolean {
  return base.alive && base.ammo > 0;
}

/** Index of the nearest base that can fire, or -1 if none. Ties go to the leftmost. */
export function nearestBase(world: World, x: number): number {
  let best = -1;
  let bestDist = Infinity;
  world.bases.forEach((base, i) => {
    const d = Math.abs(base.x - x);
    if (canFire(base) && d < bestDist) {
      best = i;
      bestDist = d;
    }
  });
  return best;
}

/**
 * Fires a counter-missile towards `target`, from the chosen base or else the nearest one that
 * can fire. A chosen base that is destroyed or empty does not fire (as in the arcade game).
 * Returns false if nothing fired.
 */
export function fire(world: World, target: Point, chosenBase?: number): boolean {
  if (world.phase !== 'playing') return false;
  const baseIndex = chosenBase ?? nearestBase(world, target.x);
  const base = world.bases[baseIndex];
  if (!base || !canFire(base)) {
    world.events.push({ type: 'dryFire', baseIndex: chosenBase ?? null });
    return false;
  }
  base.ammo--;
  const aim = aimPoint(target);
  const origin = launchPoint(base);
  world.interceptors.push({ id: world.nextId++, baseIndex, origin, target: aim, pos: origin });
  world.events.push({ type: 'launch', baseIndex, target: aim });
  return true;
}

export function launchWarhead(
  world: World,
  origin: Point,
  target: Point,
  speed: number,
  extra: Pick<Warhead, 'split' | 'stemFrom' | 'smart'> = {},
): Warhead {
  const warhead: Warhead = { id: world.nextId++, origin, target, pos: origin, speed, ...extra };
  world.warheads.push(warhead);
  return warhead;
}

/**
 * One step of a smart bomb: towards its target at `speed`, pushed away at `dodgeSpeed` from
 * every blast that is within `senseMargin` of reaching it. Stays on screen.
 */
export function smartStep(
  pos: Point,
  target: Point,
  speed: number,
  blasts: readonly { center: Point; radius: number }[],
  dtMs: number,
  rule: { senseMargin: number; dodgeSpeed: number } = SMART_BOMB,
): { pos: Point; arrived: boolean } {
  const dt = dtMs / 1000;
  const toTarget = distance(pos, target);
  if (toTarget <= speed * dt) return { pos: { x: target.x, y: target.y }, arrived: true };
  let vx = ((target.x - pos.x) / toTarget) * speed;
  let vy = ((target.y - pos.y) / toTarget) * speed;
  for (const b of blasts) {
    const d = distance(b.center, pos);
    const gap = d - b.radius;
    if (gap >= rule.senseMargin) continue;
    // Straight below or above a blast's centre, slip sideways rather than stall.
    const ax = d > 0.001 ? (pos.x - b.center.x) / d : 1;
    const ay = d > 0.001 ? (pos.y - b.center.y) / d : 0;
    vx += ax * rule.dodgeSpeed;
    vy += ay * rule.dodgeSpeed;
  }
  const next = { x: clamp(pos.x + vx * dt, 0, GAME_WIDTH), y: pos.y + vy * dt };
  return { pos: next, arrived: false };
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
  launchDueRaiders(world, rng);
  moveInterceptors(world, dtMs);
  moveWarheads(world, dtMs);
  splitWarheads(world, rng);
  moveRaiders(world, rng, dtMs);
  ageBlasts(world, dtMs);
  destroyWarheadsInBlasts(world);
  destroyRaidersInBlasts(world);
  updatePhase(world);
}

function launchDueWarheads(world: World, rng: Rng): void {
  const wave = world.wave;
  const spec = wave.spec;
  while (wave.toLaunch > 0 && world.timeMs >= wave.nextLaunchMs) {
    const count = wave.toLaunch >= 2 && rng.next() < spec.pairChance ? 2 : 1;
    // MIRVs and smart bombs draw on the RNG only from their first waves, so earlier waves
    // replay unchanged.
    const chance = spec.mirvChance;
    const smartChance = spec.smartBombChance;
    for (let i = 0; i < count; i++) {
      const origin = { x: rng.range(0, GAME_WIDTH), y: WARHEAD.spawnY };
      const target = pickTarget(world, rng);
      const speed = rng.range(spec.speedMin, spec.speedMax);
      const split =
        chance > 0 && rng.next() < chance
          ? {
              atY: rng.range(MIRV.splitYMin, MIRV.splitYMax),
              count: rng.int(MIRV.childrenMin, MIRV.childrenMax),
            }
          : undefined;
      const smart = !split && smartChance > 0 && rng.next() < smartChance;
      launchWarhead(world, origin, target, speed, split ? { split } : smart ? { smart } : {});
    }
    wave.toLaunch -= count;
    wave.nextLaunchMs += rng.range(spec.launchGapMinMs, spec.launchGapMaxMs);
  }
}

/**
 * Warheads aim at a surviving city or base; with none left, anywhere on the ground.
 * Targets in `avoid` are skipped while others remain, so a MIRV's warheads fan out.
 */
function pickTarget(world: World, rng: Rng, avoid: readonly number[] = []): Point {
  const xs = [
    ...world.cities.filter((c) => c.alive).map((c) => c.x),
    ...world.bases.filter((b) => b.alive).map((b) => b.x),
  ];
  const fresh = xs.filter((x) => !avoid.includes(x));
  const choices = fresh.length > 0 ? fresh : xs;
  const x = choices.length > 0 ? rng.pick(choices) : rng.range(0, GAME_WIDTH);
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
  const blasts = world.blasts.map((b) => ({ center: b.center, radius: blastRadius(b.ageMs) }));
  world.warheads = world.warheads.filter((w) => {
    const { pos, arrived } = w.smart
      ? smartStep(w.pos, w.target, w.speed, blasts, dtMs)
      : moveToward(w.pos, w.target, (w.speed * dtMs) / 1000);
    w.pos = pos;
    if (arrived) hitGround(world, pos);
    return !arrived;
  });
}

/** Raiders draw on the RNG only from their first wave, so wave 1 replays unchanged. */
function launchDueRaiders(world: World, rng: Rng): void {
  const wave = world.wave;
  while (wave.raidersToLaunch > 0 && world.timeMs >= wave.nextRaiderMs) {
    const satChance = wave.spec.satelliteChance;
    const kind: RaiderKind = satChance > 0 && rng.next() < satChance ? 'satellite' : 'bomber';
    const spec = RAIDERS[kind];
    const dir = rng.next() < 0.5 ? 1 : -1;
    launchRaider(world, kind, rng.range(spec.yMin, spec.yMax), dir);
    wave.raidersToLaunch--;
    wave.nextRaiderMs += rng.range(RAIDERS.gapMinMs, RAIDERS.gapMaxMs);
  }
}

/** Raiders fly straight across, drop warheads over the play area, and leave at the far side. */
function moveRaiders(world: World, rng: Rng, dtMs: number): void {
  const spec = world.wave.spec;
  world.raiders = world.raiders.filter((r) => {
    r.pos = { x: r.pos.x + (r.dir * r.speed * dtMs) / 1000, y: r.pos.y };
    const over = r.pos.x >= RAIDERS.dropMargin && r.pos.x <= GAME_WIDTH - RAIDERS.dropMargin;
    if (over && r.dropsLeft > 0 && world.timeMs >= r.nextDropMs) {
      launchWarhead(
        world,
        { ...r.pos },
        pickTarget(world, rng),
        rng.range(spec.speedMin, spec.speedMax),
      );
      r.dropsLeft--;
      r.nextDropMs = world.timeMs + rng.range(RAIDERS.dropGapMinMs, RAIDERS.dropGapMaxMs);
    }
    const gone =
      r.dir === 1 ? r.pos.x > GAME_WIDTH + RAIDERS.offscreen : r.pos.x < -RAIDERS.offscreen;
    return !gone;
  });
}

/** A blast that touches a raider destroys it, for points and a blast of its own. */
function destroyRaidersInBlasts(world: World): void {
  world.raiders = world.raiders.filter((r) => {
    const reach = RAIDERS[r.kind].hitRadius;
    const caught = world.blasts.some(
      (b) => distance(b.center, r.pos) <= blastRadius(b.ageMs) + reach,
    );
    if (caught) {
      const points = SCORE[r.kind] * waveMultiplier(world.wave.number);
      world.score += points;
      const at = { ...r.pos };
      world.events.push({ type: 'raiderDestroyed', kind: r.kind, at, points });
      addBlast(world, at, 'chain');
    }
    return !caught;
  });
}

/** MIRVs that have reached their split row become several warheads, each aimed anew. */
function splitWarheads(world: World, rng: Rng): void {
  const splitting = world.warheads.filter((w) => w.split && w.pos.y >= w.split.atY);
  if (splitting.length === 0) return;
  world.warheads = world.warheads.filter((w) => !splitting.includes(w));
  for (const parent of splitting) {
    const count = parent.split?.count ?? 0;
    const at = { ...parent.pos };
    const aimed: number[] = [];
    for (let i = 0; i < count; i++) {
      const target = pickTarget(world, rng, aimed);
      aimed.push(target.x);
      launchWarhead(world, at, target, parent.speed, {
        stemFrom: parent.stemFrom ?? parent.origin,
      });
    }
    world.events.push({ type: 'warheadSplit', at, count });
  }
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
    base.ammo = 0;
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
      const base = w.smart ? SCORE.smartBomb : SCORE.warhead;
      const points = base * waveMultiplier(world.wave.number);
      world.score += points;
      world.events.push({ type: 'warheadDestroyed', at: w.pos, points });
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
    world.wave.raidersToLaunch === 0 &&
    world.raiders.length === 0 &&
    world.warheads.length === 0 &&
    world.interceptors.length === 0 &&
    world.blasts.length === 0;
  if (quiet) {
    const bonus = waveBonus(
      world.cities.filter((c) => c.alive).length,
      world.bases.reduce((sum, b) => sum + (b.alive ? b.ammo : 0), 0),
      waveMultiplier(world.wave.number),
    );
    world.score += bonus.total;
    world.phase = 'waveCleared';
    world.events.push({ type: 'waveCleared', number: world.wave.number, bonus });
  }
}
