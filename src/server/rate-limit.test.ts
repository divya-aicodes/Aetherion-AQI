import { describe, expect, it } from 'vitest';
import { SlidingWindowRateLimiter } from './rate-limit';

describe('SlidingWindowRateLimiter', () => {
  it('allows requests up to the limit and returns a retry window', () => {
    const limiter = new SlidingWindowRateLimiter({ windowMs: 1_000, maxRequests: 2 });
    expect(limiter.consume('ip', 0)).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter.consume('ip', 100)).toMatchObject({ allowed: true, remaining: 0 });
    expect(limiter.consume('ip', 200)).toMatchObject({ allowed: false, retryAfterSeconds: 1 });
    expect(limiter.consume('ip', 1_001).allowed).toBe(true);
  });

  it('prunes idle IPs after the window', () => {
    const limiter = new SlidingWindowRateLimiter({ windowMs: 100 });
    limiter.consume('old', 0);
    limiter.prune(100);
    expect(limiter.size()).toBe(0);
  });

  it('bounds request history and the number of IP buckets', () => {
    const limiter = new SlidingWindowRateLimiter({ windowMs: 10_000, maxRequests: 200, maxEntriesPerKey: 100, maxKeys: 2 });
    for (let index = 0; index < 150; index += 1) limiter.consume('busy', index);
    expect(limiter.entriesFor('busy')).toBe(100);
    limiter.consume('second', 200);
    limiter.consume('third', 300);
    expect(limiter.size()).toBe(2);
    expect(limiter.entriesFor('busy')).toBe(0);
  });
});
