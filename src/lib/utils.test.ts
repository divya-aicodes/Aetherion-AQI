import { describe, expect, it } from 'vitest';
import { statsUtils } from './utils';

describe('statsUtils', () => {
  const sample = [1, 2, 3, 4, 5];
  it('calculates descriptive statistics', () => {
    expect(statsUtils.mean(sample)).toBe(3);
    expect(statsUtils.median(sample)).toBe(3);
    expect(statsUtils.range(sample)).toBe(4);
    expect(statsUtils.variance(sample)).toBe(2);
  });
  it('handles empty and constant data', () => {
    expect(statsUtils.mean([])).toBe(0);
    expect(statsUtils.skewness([4, 4, 4])).toBe(0);
    expect(statsUtils.kurtosis([4, 4, 4])).toBe(0);
  });
});
