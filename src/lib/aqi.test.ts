import { describe, expect, it } from 'vitest';
import { getAqiCategory, pm25ToUsAqi } from './aqi';

describe('pm25ToUsAqi', () => {
  it.each([[0, 0], [9, 50], [9.1, 51], [35.4, 100], [35.5, 101], [55.4, 150], [55.5, 151], [325.4, 500]])('converts %s to %s', (pm25, expected) => expect(pm25ToUsAqi(pm25)).toBe(expected));
  it('handles invalid values', () => {
    expect(pm25ToUsAqi(-1)).toBe(0);
    expect(pm25ToUsAqi(Number.NaN)).toBe(0);
  });
});

describe('getAqiCategory', () => {
  it('uses inclusive category boundaries', () => {
    expect(getAqiCategory(50).label).toBe('Good');
    expect(getAqiCategory(51).label).toBe('Moderate');
    expect(getAqiCategory(301).label).toBe('Hazardous');
  });
});
