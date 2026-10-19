import { WAVES, type WaveSpec } from '../config/tuning';

/**
 * Wave number (1, 2, 3, ...) to the wave's launch plan and enemy mix (ADR-NW05). The first
 * waves come from `WAVES.handSet`; later ones step up from the last hand-set wave by
 * `WAVES.formula`, up to its caps, so the game is endless and never gets impossibly fast.
 */
export function waveSpec(waveNumber: number, waves: typeof WAVES = WAVES): WaveSpec {
  const n = Math.max(1, Math.floor(waveNumber));
  const handSet = waves.handSet[n - 1];
  if (handSet) return handSet;

  const last = waves.handSet[waves.handSet.length - 1];
  if (!last) throw new Error('WAVES.handSet must have at least one wave');
  const f = waves.formula;
  const k = n - waves.handSet.length;
  return {
    count: Math.min(f.countMax, last.count + f.countStep * k),
    speedMin: Math.min(f.speedMinCap, last.speedMin + f.speedStep * k),
    speedMax: Math.min(f.speedMaxCap, last.speedMax + f.speedStep * k),
    firstLaunchMs: last.firstLaunchMs,
    launchGapMinMs: Math.max(f.gapMinFloorMs, last.launchGapMinMs - f.gapStepMs * k),
    launchGapMaxMs: Math.max(f.gapMaxFloorMs, last.launchGapMaxMs - f.gapStepMs * k),
    pairChance: Math.min(f.pairMax, last.pairChance + f.pairStep * k),
    mirvChance: Math.min(f.mirvMax, last.mirvChance + f.mirvStep * k),
    smartBombChance:
      n < f.smartBombFromWave
        ? last.smartBombChance
        : Math.min(f.smartBombMax, f.smartBombStart + f.smartBombStep * (n - f.smartBombFromWave)),
    raiders: Math.min(f.raidersMax, last.raiders + Math.floor(k / f.raiderEveryWaves)),
    satelliteChance: last.satelliteChance,
  };
}
