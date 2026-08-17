export interface CacheSnapshot<T> {
  value: T;
  storedAt: number;
  ageMs: number;
  stale: boolean;
}
export class LastKnownGoodCache<T> {
  private snapshot: { value: T; storedAt: number } | null = null;

  constructor(readonly ttlMs: number) {}

  store(value: T, now = Date.now()): CacheSnapshot<T> {
    this.snapshot = { value, storedAt: now };
    return { value, storedAt: now, ageMs: 0, stale: false };
  }

  read(now = Date.now()): CacheSnapshot<T> | null {
    if (!this.snapshot) return null;
    const ageMs = Math.max(0, now - this.snapshot.storedAt);
    return { ...this.snapshot, ageMs, stale: ageMs >= this.ttlMs };
  }

  readFresh(now = Date.now()): CacheSnapshot<T> | null {
    const result = this.read(now);
    return result && !result.stale ? result : null;
  }

  clear(): void {
    this.snapshot = null;
  }
}

export async function loadWithLastKnownGood<T>(
  cache: LastKnownGoodCache<T>,
  loader: () => Promise<T>,
  options: { force?: boolean; now?: () => number; warning?: string } = {},
): Promise<CacheSnapshot<T> & { warning?: string }> {
  const now = options.now ?? Date.now;
  const fresh = options.force ? null : cache.readFresh(now());
  if (fresh) return fresh;

  try {
    return cache.store(await loader(), now());
  } catch (error) {
    const fallback = cache.read(now());
    if (!fallback) throw error;
    return { ...fallback, stale: true, warning: options.warning ?? 'Showing the last successful result because the provider is unavailable.' };
  }
}
