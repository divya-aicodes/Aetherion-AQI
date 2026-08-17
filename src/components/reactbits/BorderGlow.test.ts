import { describe, expect, it } from 'vitest';
import { parseHsl } from './BorderGlow';

describe('parseHsl', () => {
  it('supports space, comma, wrapper, decimal, and optional-percent formats', () => {
    expect(parseHsl('215 90% 70%')).toEqual({ h: 215, s: 90, l: 70 });
    expect(parseHsl('hsl(400, 110%, -5%)')).toEqual({ h: 40, s: 100, l: 0 });
    expect(parseHsl('12.5 40 60')).toEqual({ h: 12.5, s: 40, l: 60 });
  });

  it('uses a safe fallback for unknown colors', () => {
    expect(parseHsl('#fff')).toEqual({ h: 215, s: 90, l: 70 });
  });
});
