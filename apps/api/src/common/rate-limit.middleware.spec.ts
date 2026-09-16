import { rateLimitMiddleware, resetRateLimitBuckets } from './rate-limit.middleware.js';

describe('rateLimitMiddleware', () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  it('allows requests within limit and sets rate limit headers', () => {
    const req = {
      path: '/api/v1/auth/login',
      ip: '10.0.0.1',
      headers: {},
    } as any;

    const headers: Record<string, any> = {};
    const res = {
      setHeader: jest.fn((key: string, val: any) => {
        headers[key] = val;
      }),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    const next = jest.fn();

    rateLimitMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(Number));
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
  });

  it('returns 429 when limit is exceeded', () => {
    process.env.AUTH_RATE_LIMIT_MAX = '2';
    const req = {
      path: '/api/v1/auth/login',
      ip: '10.0.0.2',
      headers: {},
    } as any;

    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    const next = jest.fn();

    // 1st request - allowed
    rateLimitMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    // 2nd request - allowed
    rateLimitMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);

    // 3rd request - exceeded
    rateLimitMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'RATE_LIMITED' }),
      }),
    );
  });
});
