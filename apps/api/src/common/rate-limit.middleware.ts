import type { NextFunction, Request, Response } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_BUCKETS = 5000;
const buckets = new Map<string, Bucket>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;

function cleanupExpiredBuckets(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS && buckets.size < MAX_BUCKETS) {
    return;
  }
  lastCleanup = now;

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  // If still over capacity after removing expired keys, evict oldest entries
  if (buckets.size >= MAX_BUCKETS) {
    const toDeleteCount = buckets.size - MAX_BUCKETS + 500;
    let count = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      count++;
      if (count >= toDeleteCount) break;
    }
  }
}

export function resetRateLimitBuckets() {
  buckets.clear();
}

function routePolicy(path: string) {
  if (path === '/api/v1/auth/login' || path === '/api/v1/auth/register') {
    return { limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 10), windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 900_000) };
  }
  if (path === '/api/v1/events/ingest') {
    return { limit: Number(process.env.INGEST_RATE_LIMIT_MAX || 300), windowMs: Number(process.env.INGEST_RATE_LIMIT_WINDOW_MS || 60_000) };
  }
  if (path.startsWith('/api/v1/events/webhook/')) {
    return { limit: Number(process.env.WEBHOOK_RATE_LIMIT_MAX || process.env.INGEST_RATE_LIMIT_MAX || 300), windowMs: Number(process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS || 60_000) };
  }
  if (path.includes('/test-event')) {
    return { limit: 30, windowMs: 60_000 };
  }
  if (path.startsWith('/api/v1/intelligence/')) {
    return { limit: Number(process.env.INTELLIGENCE_RATE_LIMIT_MAX || 60), windowMs: Number(process.env.INTELLIGENCE_RATE_LIMIT_WINDOW_MS || 60_000) };
  }
  return null;
}

export function rateLimitMiddleware(request: Request, response: Response, next: NextFunction) {
  const policy = routePolicy(request.path);
  if (!policy) {
    next();
    return;
  }

  const now = Date.now();
  cleanupExpiredBuckets(now);

  const rawSecret = (request.headers['x-webhook-secret'] || request.headers['x-integration-secret']) as string | undefined;
  const identity = rawSecret?.slice(0, 16) || request.headers.authorization?.slice(0, 16) || request.ip || 'unknown';
  const key = `${request.path}:${identity}`;
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + policy.windowMs }
    : current;

  bucket.count += 1;
  buckets.set(key, bucket);
  response.setHeader('X-RateLimit-Limit', policy.limit);
  response.setHeader('X-RateLimit-Remaining', Math.max(0, policy.limit - bucket.count));
  response.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));

  if (bucket.count > policy.limit) {
    response.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
    response.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please retry later.',
      },
    });
    return;
  }

  next();
}

