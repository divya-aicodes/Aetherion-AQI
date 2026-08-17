import { describe, expect, it } from 'vitest';
import { getForecastMetrics } from './forecast-metrics';
import type { AqiForecastPoint } from './types';

const point = (aqi: number, label: string): AqiForecastPoint => ({ time: `2026-01-01T${label}:00:00Z`, label, aqi, pm25: aqi / 3 });

describe('getForecastMetrics', () => {
  it('returns null for an empty forecast', () => {
    expect(getForecastMetrics([])).toBeNull();
  });

  it('summarizes average, extremes, and direction', () => {
    const metrics = getForecastMetrics([point(80, '09'), point(120, '10'), point(60, '11')]);
    expect(metrics).toEqual({
      average: 87,
      peak: point(120, '10'),
      lowest: point(60, '11'),
      change: -20,
    });
  });
});
