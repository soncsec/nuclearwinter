import { describe, expect, it } from 'vitest';
import { BLOOM, STEP_MS } from '../../src/config/tuning';
import { createBloomGovernor, observeFrame } from '../../src/logic/quality';

const feed = (gov: ReturnType<typeof createBloomGovernor>, frameMs: number, totalMs: number) => {
  let switchedOff = false;
  for (let t = 0; t < totalMs; t += frameMs)
    switchedOff = observeFrame(gov, frameMs, BLOOM) || switchedOff;
  return switchedOff;
};

describe('bloom watchdog', () => {
  it('starts on only where the renderer supports it', () => {
    expect(createBloomGovernor(true, STEP_MS).on).toBe(true);
    expect(createBloomGovernor(false, STEP_MS).on).toBe(false);
  });

  it('stays on at 60 fps for a long game', () => {
    const gov = createBloomGovernor(true, STEP_MS);
    expect(feed(gov, STEP_MS, 10 * 60_000)).toBe(false);
    expect(gov.on).toBe(true);
  });

  it('ignores a slow start while the game warms up', () => {
    const gov = createBloomGovernor(true, STEP_MS);
    feed(gov, 100, BLOOM.warmupMs);
    feed(gov, STEP_MS, 5000);
    expect(gov.on).toBe(true);
  });

  it('switches off after a few seconds at 30 fps, and reports that once', () => {
    const gov = createBloomGovernor(true, STEP_MS);
    feed(gov, STEP_MS, BLOOM.warmupMs + 100);
    expect(feed(gov, 1000 / 30, 10_000)).toBe(true);
    expect(gov.on).toBe(false);
    expect(observeFrame(gov, 1000 / 30, BLOOM)).toBe(false);
  });

  it('shrugs off one long hitch', () => {
    const gov = createBloomGovernor(true, STEP_MS);
    feed(gov, STEP_MS, BLOOM.warmupMs + 100);
    observeFrame(gov, 500, BLOOM);
    feed(gov, STEP_MS, 10_000);
    expect(gov.on).toBe(true);
  });

  it('never switches back on once off', () => {
    const gov = createBloomGovernor(true, STEP_MS);
    feed(gov, STEP_MS, BLOOM.warmupMs + 100);
    feed(gov, 50, 10_000);
    feed(gov, STEP_MS, 60_000);
    expect(gov.on).toBe(false);
  });
});
