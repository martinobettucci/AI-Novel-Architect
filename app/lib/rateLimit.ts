/**
 * A small in-process token bucket, keyed by caller.
 *
 * The AI routes proxy to an upstream that costs real money and serializes its
 * work, so an unbounded caller can both run up a bill and starve the UI. This
 * is deliberately minimal: single-process, memory-only, no dependencies. A
 * multi-instance deployment needs a shared store instead.
 */

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export interface RateLimitOptions {
  /** Sustained rate. */
  ratePerMinute: number;
  /** Maximum burst above the sustained rate. */
  burst: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the next token is available, when denied. */
  retryAfter: number;
}

const buckets = new Map<string, Bucket>();

/** Evict idle buckets so a long-lived process doesn't accumulate keys forever. */
function sweep(now: number): void {
  if (buckets.size < 1024) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.updatedAt > 600_000) buckets.delete(key);
  }
}

export function consumeToken(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const refillPerMs = options.ratePerMinute / 60_000;
  const existing = buckets.get(key);
  const tokens = existing
    ? Math.min(options.burst, existing.tokens + (now - existing.updatedAt) * refillPerMs)
    : options.burst;

  if (tokens < 1) {
    buckets.set(key, { tokens, updatedAt: now });
    return { allowed: false, retryAfter: Math.ceil((1 - tokens) / refillPerMs / 1000) };
  }

  buckets.set(key, { tokens: tokens - 1, updatedAt: now });
  return { allowed: true, retryAfter: 0 };
}

/**
 * Best-effort caller identity. Behind a proxy this is only as trustworthy as the
 * proxy's own headers, which is acceptable for throttling but not for auth.
 */
export function callerKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "local";
}

/** Test seam. */
export function resetRateLimits(): void {
  buckets.clear();
}
