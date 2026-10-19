/**
 * Spark particles for explosions (M4.2). A fixed-size pool: nothing is allocated during play, and
 * when every particle is busy new sparks are skipped. Randomness comes from the visual stream
 * (ADR-NW08), so sparks never change the game.
 */
import type { Point } from './geometry';
import type { Rng } from './rng';

export interface Particle {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Milliseconds lived, and the total it lives for. */
  ageMs: number;
  lifeMs: number;
  color: number;
}

export interface ParticlePool {
  readonly particles: Particle[];
}

/** How one burst of sparks looks. */
export interface BurstSpec {
  count: number;
  /** Launch speed range, pixels per second. */
  speedMin: number;
  speedMax: number;
  /** Life range, milliseconds. */
  lifeMin: number;
  lifeMax: number;
  /** Launch angles in radians (0 = right, -π/2 = up); sparks go in any direction within it. */
  angleMin: number;
  angleMax: number;
  /** Colours picked at random per spark. */
  colors: readonly number[];
}

export function createParticlePool(size: number): ParticlePool {
  const particles: Particle[] = [];
  for (let i = 0; i < size; i++) {
    particles.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, ageMs: 0, lifeMs: 1, color: 0 });
  }
  return { particles };
}

/** Starts up to `spec.count` sparks at `at`. Returns how many started. */
export function burst(pool: ParticlePool, at: Point, spec: BurstSpec, rng: Rng): number {
  let started = 0;
  for (const p of pool.particles) {
    if (started >= spec.count) break;
    if (p.alive) continue;
    const angle = rng.range(spec.angleMin, spec.angleMax);
    const speed = rng.range(spec.speedMin, spec.speedMax);
    p.alive = true;
    p.x = at.x;
    p.y = at.y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.ageMs = 0;
    p.lifeMs = rng.range(spec.lifeMin, spec.lifeMax);
    p.color = rng.pick(spec.colors);
    started++;
  }
  return started;
}

/** Moves every live spark by `dtMs`, pulling it down by `gravity` (px/s²); old sparks die. */
export function stepParticles(pool: ParticlePool, dtMs: number, gravity: number): void {
  const dt = dtMs / 1000;
  for (const p of pool.particles) {
    if (!p.alive) continue;
    p.ageMs += dtMs;
    if (p.ageMs >= p.lifeMs) {
      p.alive = false;
      continue;
    }
    p.vy += gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

/** 1 when a spark is new, falling to 0 as it dies. */
export function particleFade(p: Particle): number {
  return Math.max(0, 1 - p.ageMs / p.lifeMs);
}

export function liveCount(pool: ParticlePool): number {
  let n = 0;
  for (const p of pool.particles) if (p.alive) n++;
  return n;
}

/** Stops every spark (used on restart). */
export function clearParticles(pool: ParticlePool): void {
  for (const p of pool.particles) p.alive = false;
}
