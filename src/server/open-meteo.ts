import type { AqiForecastPoint } from '../lib/types';

interface OpenMeteoCurrent {
  pm2_5: number;
  us_aqi: number | null;
  time: string | null;
}

export interface OpenMeteoCurrentResponse {
  current: OpenMeteoCurrent;
}

interface OpenMeteoHourly {
  time: string[];
  us_aqi: Array<number | null>;
  pm2_5: Array<number | null>;
}

export interface OpenMeteoHourlyResponse {
  hourly: OpenMeteoHourly;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

export function parseCurrentResponses(payload: unknown): Array<OpenMeteoCurrentResponse | null> {
  const entries = Array.isArray(payload) ? payload : [payload];
  return entries.map(entry => {
    if (!isRecord(entry) || !isRecord(entry.current)) return null;
    const pm25 = finiteNumber(entry.current.pm2_5);
    if (pm25 === null || pm25 < 0) return null;
    return { current: { pm2_5: pm25, us_aqi: finiteNumber(entry.current.us_aqi), time: stringValue(entry.current.time) } };
  });
}

export function parseHourlyResponse(payload: unknown, now = Date.now()): AqiForecastPoint[] {
  if (!isRecord(payload) || !isRecord(payload.hourly)) return [];
  const times = Array.isArray(payload.hourly.time) ? payload.hourly.time : [];
  const aqiValues = Array.isArray(payload.hourly.us_aqi) ? payload.hourly.us_aqi : [];
  const pm25Values = Array.isArray(payload.hourly.pm2_5) ? payload.hourly.pm2_5 : [];
  const oneHourAgo = now - 60 * 60 * 1_000;

  return times.flatMap((rawTime, index) => {
    const time = stringValue(rawTime);
    const aqi = finiteNumber(aqiValues[index]);
    const pm25 = finiteNumber(pm25Values[index]);
    if (!time || aqi === null || pm25 === null || new Date(time).getTime() < oneHourAgo) return [];
    return [{
      time,
      aqi: Math.min(500, Math.max(0, Math.round(aqi))),
      pm25: Math.round(Math.max(0, pm25) * 10) / 10,
      label: new Date(time).toLocaleTimeString('en', { hour: 'numeric' }),
    }];
  }).slice(0, 24);
}
