type Bucket = {
  count: number;
  resetAt: number; // epoch ms
};

// In-memory limiter.
// NOTE: This is NOT cluster-safe. For true rate limiting across PM2 workers,
// replace this with Redis/Upstash (or similar) shared storage.
const buckets = new Map<string, Bucket>();

export function checkRateLimit(params: {
  key: string;
  windowMs: number;
  max: number;
}): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(params.key);

  if (!bucket || bucket.resetAt <= now) {
    const next = { count: 1, resetAt: now + params.windowMs };
    buckets.set(params.key, next);
    return { allowed: true, retryAfterMs: params.windowMs };
  }

  bucket.count += 1;

  if (bucket.count > params.max) {
    return { allowed: false, retryAfterMs: Math.max(0, bucket.resetAt - now) };
  }

  return { allowed: true, retryAfterMs: Math.max(0, bucket.resetAt - now) };
}

