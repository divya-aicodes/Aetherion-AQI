export class AppError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}
export class ProviderError extends AppError {
  constructor(message = 'The upstream data provider is unavailable.', options?: ErrorOptions) {
    super(message, 'PROVIDER_UNAVAILABLE', 502, options);
  }
}

export class AuthError extends AppError {
  constructor(message = 'Authentication is required.', options?: ErrorOptions) {
    super(message, 'AUTH_REQUIRED', 401, options);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Try again shortly.', options?: ErrorOptions) {
    super(message, 'RATE_LIMITED', 429, options);
  }
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
