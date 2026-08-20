import { describe, expect, it } from 'vitest';
import { getAqiCategory, pm25ToUsAqi } from './aqi';

describe('pm25ToUsAqi', () => {
  it.each([
    [0, 0], [9, 50], [9.1, 51], [35.4, 100], [35.5, 101], [55.4, 150],
    [55.5, 151], [125.4, 200], [125.5, 201], [225.4, 300], [225.5, 301],
    [325.4, 500], [325.5, 500], [999, 500],
  ])('converts %s to %s', (pm25, expected) => expect(pm25ToUsAqi(pm25)).toBe(expected));
  it('handles invalid values', () => {
    expect(pm25ToUsAqi(-1)).toBe(0);
    expect(pm25ToUsAqi(Number.NaN)).toBe(0);
    expect(pm25ToUsAqi(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('getAqiCategory', () => {
  it.each([
    [0, 'Good'], [50, 'Good'], [51, 'Moderate'], [100, 'Moderate'],
    [101, 'Unhealthy for Sensitive Groups'], [150, 'Unhealthy for Sensitive Groups'],
    [151, 'Unhealthy'], [200, 'Unhealthy'], [201, 'Very Unhealthy'],
    [300, 'Very Unhealthy'], [301, 'Hazardous'],
  ])('categorizes %s as %s', (aqi, expected) => expect(getAqiCategory(aqi).label).toBe(expected));
});
