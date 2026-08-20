import type { AqiForecastPoint } from './types';

export interface ForecastMetrics {
  average: number;
  peak: AqiForecastPoint;
  lowest: AqiForecastPoint;
  change: number;
}
export function getForecastMetrics(points: AqiForecastPoint[]): ForecastMetrics | null {
  if (!points.length) return null;
  const average = Math.round(points.reduce((sum, point) => sum + point.aqi, 0) / points.length);
  const peak = points.reduce((best, point) => point.aqi > best.aqi ? point : best);
  const lowest = points.reduce((best, point) => point.aqi < best.aqi ? point : best);
  const change = Math.round(points[points.length - 1].aqi - points[0].aqi);
  return { average, peak, lowest, change };
}
