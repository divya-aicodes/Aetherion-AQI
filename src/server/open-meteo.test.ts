import { describe, expect, it } from 'vitest';
import { parseCurrentResponses, parseHourlyResponse } from './open-meteo';

describe('Open-Meteo response guards', () => {
  it('accepts typed current responses and rejects invalid entries', () => {
    expect(parseCurrentResponses({ current: { pm2_5: 12.4, us_aqi: 52, time: '2026-01-01T00:00' } })).toEqual([
      { current: { pm2_5: 12.4, us_aqi: 52, time: '2026-01-01T00:00' } },
    ]);
    expect(parseCurrentResponses([{ current: { pm2_5: -1 } }, null, { current: { pm2_5: 4, us_aqi: 'bad' } }])).toEqual([
      null,
      null,
      { current: { pm2_5: 4, us_aqi: null, time: null } },
    ]);
  });

  it('builds a bounded 24-hour forecast from valid points', () => {
    const now = new Date('2026-01-01T01:00:00Z').getTime();
    const payload = { hourly: {
      time: ['2025-12-31T23:00:00Z', '2026-01-01T00:30:00Z', '2026-01-01T02:00:00Z'],
      us_aqi: [40, 520, 'bad'],
      pm2_5: [5, -2, 10],
    } };
    const result = parseHourlyResponse(payload, now);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ aqi: 500, pm25: 0, time: '2026-01-01T00:30:00Z' });
    expect(parseHourlyResponse({}, now)).toEqual([]);
  });
});
