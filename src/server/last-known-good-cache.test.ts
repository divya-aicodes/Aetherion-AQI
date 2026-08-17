import { describe, expect, it, vi } from 'vitest';
import { LastKnownGoodCache, loadWithLastKnownGood } from './last-known-good-cache';

describe('LastKnownGoodCache', () => {
  it('tracks fresh and stale ages and can be cleared', () => {
    const cache = new LastKnownGoodCache<string>(1_000);
    expect(cache.read(0)).toBeNull();
    expect(cache.store('live', 100)).toMatchObject({ value: 'live', stale: false, ageMs: 0 });
    expect(cache.readFresh(1_099)).toMatchObject({ value: 'live', stale: false, ageMs: 999 });
    expect(cache.readFresh(1_100)).toBeNull();
    expect(cache.read(1_200)).toMatchObject({ value: 'live', stale: true, ageMs: 1_100 });
    cache.clear();
    expect(cache.read()).toBeNull();
  });

  it('loads once while fresh and refreshes when forced', async () => {
    const cache = new LastKnownGoodCache<number>(1_000);
    const loader = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    expect((await loadWithLastKnownGood(cache, loader, { now: () => 100 })).value).toBe(1);
    expect((await loadWithLastKnownGood(cache, loader, { now: () => 200 })).value).toBe(1);
    expect((await loadWithLastKnownGood(cache, loader, { force: true, now: () => 300 })).value).toBe(2);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('serves stale data when the provider fails', async () => {
    const cache = new LastKnownGoodCache<string[]>(1_000);
    cache.store(['last good'], 0);
    const result = await loadWithLastKnownGood(cache, async () => { throw new Error('Open-Meteo offline'); }, { now: () => 2_000, warning: 'stale data' });
    expect(result).toMatchObject({ value: ['last good'], stale: true, ageMs: 2_000, warning: 'stale data' });
  });

  it('rethrows provider failure when no fallback exists', async () => {
    const cache = new LastKnownGoodCache<string>(1_000);
    await expect(loadWithLastKnownGood(cache, async () => { throw new Error('offline'); })).rejects.toThrow('offline');
  });
});
