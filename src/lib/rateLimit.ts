/**
 * In-memory sliding-window rate limiter.
 *
 * Honest caveat: on Vercel, serverless functions can run across multiple
 * instances, so this only throttles requests landing on the same warm
 * instance — it is NOT a real distributed rate limit. Combined with the
 * Basic Auth gate in middleware.ts, it's enough to stop casual abuse
 * from a single source. For real protection against a determined actor,
 * swap this for Upstash Redis (`@upstash/ratelimit` has a free tier and
 * is a natural pairing once real persistence is wired in).
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.windowStart + windowMs };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.windowStart + windowMs };
}

// periodic cleanup so the map doesn't grow unbounded in a long-lived instance
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > 10 * 60 * 1000) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();
