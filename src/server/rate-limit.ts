export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}
export interface SlidingWindowRateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  maxEntriesPerKey?: number;
  maxKeys?: number;
}

interface RequestBucket {
  timestamps: number[];
  lastSeen: number;
}

export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, RequestBucket>();
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly maxEntriesPerKey: number;
  readonly maxKeys: number;

  constructor(options: SlidingWindowRateLimiterOptions = {}) {
    this.windowMs = options.windowMs ?? 60_000;
    this.maxRequests = options.maxRequests ?? 20;
    this.maxEntriesPerKey = options.maxEntriesPerKey ?? 100;
    this.maxKeys = options.maxKeys ?? 1_000;
  }

  consume(key: string, now = Date.now()): RateLimitDecision {
    this.prune(now);
    const bucket = this.buckets.get(key) ?? { timestamps: [], lastSeen: now };
    const timestamps = bucket.timestamps.filter(timestamp => now - timestamp < this.windowMs);
    bucket.lastSeen = now;

    if (timestamps.length >= this.maxRequests) {
      bucket.timestamps = timestamps.slice(-this.maxEntriesPerKey);
      this.buckets.set(key, bucket);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((this.windowMs - (now - timestamps[0])) / 1_000)),
      };
    }

    timestamps.push(now);
    bucket.timestamps = timestamps.slice(-this.maxEntriesPerKey);
    this.buckets.set(key, bucket);
    this.enforceKeyLimit();
    return { allowed: true, remaining: Math.max(0, this.maxRequests - bucket.timestamps.length), retryAfterSeconds: 0 };
  }

  prune(now = Date.now()): void {
    for (const [key, bucket] of this.buckets) {
      const timestamps = bucket.timestamps.filter(timestamp => now - timestamp < this.windowMs);
      if (!timestamps.length && now - bucket.lastSeen >= this.windowMs) this.buckets.delete(key);
      else bucket.timestamps = timestamps.slice(-this.maxEntriesPerKey);
    }
  }

  size(): number {
    return this.buckets.size;
  }

  entriesFor(key: string): number {
    return this.buckets.get(key)?.timestamps.length ?? 0;
  }

  private enforceKeyLimit(): void {
    while (this.buckets.size > this.maxKeys) {
      let oldestKey: string | null = null;
      let oldestTime = Number.POSITIVE_INFINITY;
      for (const [key, bucket] of this.buckets) {
        if (bucket.lastSeen < oldestTime) {
          oldestKey = key;
          oldestTime = bucket.lastSeen;
        }
      }
      if (!oldestKey) return;
      this.buckets.delete(oldestKey);
    }
  }
}
