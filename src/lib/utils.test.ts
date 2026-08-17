import { describe, expect, it } from 'vitest';
import { statsUtils } from './utils';

describe('statsUtils', () => {
  const sample = [1, 2, 3, 4, 5];
  it('calculates descriptive statistics', () => {
    expect(statsUtils.min(sample)).toBe(1);
    expect(statsUtils.max(sample)).toBe(5);
    expect(statsUtils.mean(sample)).toBe(3);
    expect(statsUtils.median(sample)).toBe(3);
    expect(statsUtils.median([1, 2, 3, 4])).toBe(2.5);
    expect(statsUtils.mode([1, 2, 2, 3])).toBe(2);
    expect(statsUtils.range(sample)).toBe(4);
    expect(statsUtils.variance(sample)).toBe(2);
    expect(statsUtils.stdDev(sample)).toBeCloseTo(Math.sqrt(2));
    expect(statsUtils.quartile(sample, 1)).toBe(2);
    expect(statsUtils.quartile(sample, 2)).toBe(3);
    expect(statsUtils.quartile(sample, 3)).toBe(4);
    expect(statsUtils.moment(sample, 2)).toBe(2);
    expect(statsUtils.skewness(sample)).toBe(0);
    expect(statsUtils.kurtosis(sample)).toBeCloseTo(1.7);
  });
  it('handles empty and constant data', () => {
    expect(statsUtils.min([])).toBe(0);
    expect(statsUtils.max([])).toBe(0);
    expect(statsUtils.mean([])).toBe(0);
    expect(statsUtils.median([])).toBe(0);
    expect(statsUtils.mode([])).toBe(0);
    expect(statsUtils.range([])).toBe(0);
    expect(statsUtils.variance([])).toBe(0);
    expect(statsUtils.quartile([], 1)).toBe(0);
    expect(statsUtils.skewness([4, 4, 4])).toBe(0);
    expect(statsUtils.kurtosis([4, 4, 4])).toBe(0);
  });
});
