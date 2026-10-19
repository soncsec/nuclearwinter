import type { WaveSpec } from '../../src/config/tuning';
import { waveSpec } from '../../src/logic/waves';

type MixKey = 'mirvChance' | 'smartBombChance' | 'raiders' | 'satelliteChance';

/** The first wave whose enemy mix includes `key`. */
export function firstWaveWith(key: MixKey): number {
  for (let n = 1; n <= 100; n++) if ((waveSpec(n) as WaveSpec)[key] > 0) return n;
  throw new Error(`no wave up to 100 has ${key}`);
}
