/**
 * Seeded pseudo-random number generator (mulberry32).
 * Gameplay randomness goes through this so tests can replay a run exactly (ADR-006).
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** One element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
        throw new RangeError(`invalid int range [${min}, ${max}]`);
      }
      return min + Math.floor(next() * (max - min + 1));
    },
    range(min, max) {
      if (max < min) throw new RangeError(`invalid range [${min}, ${max})`);
      return min + next() * (max - min);
    },
    pick(items) {
      if (items.length === 0) throw new RangeError('cannot pick from an empty array');
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
  };
}

/**
 * The game's random streams (ADR-NW08), all from one seed but independent of each other:
 * - `spawn`: the launch schedule (when, where from, how fast, which enemy). Every launch draws
 *   the same amount from it whatever the player does, so a seed (and the daily challenge)
 *   always sends the same waves.
 * - `aim`: choices that depend on how the game is going (targets of MIRV warheads and bomber
 *   drops). Only the rules in `src/logic/` use these two.
 * - `visual`: effects such as particles and screen shake. The rules never read it, so the look
 *   can change without changing the game.
 */
export interface RandomStreams {
  readonly spawn: Rng;
  readonly aim: Rng;
  readonly visual: Rng;
}

export function createStreams(seed: number): RandomStreams {
  return {
    spawn: createRng(deriveSeed(seed, 1)),
    aim: createRng(deriveSeed(seed, 2)),
    visual: createRng(deriveSeed(seed, 3)),
  };
}

/** A well-mixed seed for stream `salt`, so the streams share no sequence (murmur3 finaliser). */
export function deriveSeed(seed: number, salt: number): number {
  let h = (seed ^ Math.imul(salt, 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
