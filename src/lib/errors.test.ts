import { describe, expect, it } from 'vitest';
import { AppError, AuthError, ProviderError, RateLimitError, errorMessage } from './errors';

describe('application errors', () => {
  it('preserves status, code, name, and cause', () => {
    const cause = new Error('offline');
    const error = new ProviderError('provider failed', { cause });
    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe('ProviderError');
    expect(error.code).toBe('PROVIDER_UNAVAILABLE');
    expect(error.statusCode).toBe(502);
    expect(error.cause).toBe(cause);
  });

  it('provides specific authentication and rate-limit errors', () => {
    expect(new AuthError().statusCode).toBe(401);
    expect(new RateLimitError().statusCode).toBe(429);
  });

  it('normalizes unknown error messages', () => {
    expect(errorMessage(new Error('broken'), 'fallback')).toBe('broken');
    expect(errorMessage(null, 'fallback')).toBe('fallback');
  });
});
