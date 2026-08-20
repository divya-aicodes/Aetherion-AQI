import { describe, expect, it } from 'vitest';
import { matchesLocation, normalizeLocationSearch } from './location-search';

describe('location search', () => {
  it('normalizes case, whitespace, and diacritics', () => {
    expect(normalizeLocationSearch('  SÃO Paulo  ')).toBe('sao paulo');
  });

  it('matches live city and country fields', () => {
    const location = { city: 'São Paulo', country: 'Brazil' };
    expect(matchesLocation(location, 'sao')).toBe(true);
    expect(matchesLocation(location, 'brazil')).toBe(true);
    expect(matchesLocation(location, '')).toBe(true);
    expect(matchesLocation(location, 'Tokyo')).toBe(false);
  });
});
