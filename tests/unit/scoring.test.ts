import { describe, expect, it } from 'vitest';
import { formatScore } from '../../src/logic/scoring';

describe('formatScore', () => {
  it('pads to the given number of digits', () => {
    expect(formatScore(0, 6)).toBe('000000');
    expect(formatScore(25, 6)).toBe('000025');
  });

  it('caps at all nines instead of growing wider', () => {
    expect(formatScore(1_234_567, 6)).toBe('999999');
  });

  it('never shows negatives or fractions', () => {
    expect(formatScore(-5, 4)).toBe('0000');
    expect(formatScore(99.9, 4)).toBe('0099');
  });
});
