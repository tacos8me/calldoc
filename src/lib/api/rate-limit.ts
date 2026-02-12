// ---------------------------------------------------------------------------
// Redis-Based Rate Limiter
// ---------------------------------------------------------------------------
// Provides distributed rate limiting using Redis INCR + EXPIRE pattern.
// Works correctly across multiple horizontally-scaled app instances.

import Redis from 'ioredis';

// ---------------------------------------------------------------------------
// Singleton Redis client for rate limiting
// ---------------------------------------------------------------------------

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL ?? 'redis://redis:6379', {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      enableReadyCheck: false,
      retryStrategy(times: number) {
        if (times > 3) return null; // stop retrying
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on('error', (err) => {
      console.error(`[RateLimit] Redis error: ${err.message}`);
    });
  }

  return redisClient;
}

// ---------------------------------------------------------------------------
// Rate limit check result
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  /** Whether the request is allowed (under the limit) */
  allowed: boolean;
  /** Number of remaining attempts in the current window */
  remaining: number;
  /** When the current rate limit window resets */
  resetAt: Date;
}

// ---------------------------------------------------------------------------
// checkRateLimit - Main rate limit function
// ---------------------------------------------------------------------------

/**
 * Check and increment a rate limit counter in Redis.
 *
 * Uses the Redis INCR + EXPIRE pattern:
 * - Key: `ratelimit:{key}`
 * - On first attempt, the key is created with a TTL of `windowSeconds`
 * - Each subsequent attempt increments the counter
 * - If the counter exceeds `maxAttempts`, the request is denied
 *
 * @param key - Unique identifier for the rate limit (e.g., IP address, email)
 * @param maxAttempts - Maximum allowed attempts within the window
 * @param windowSeconds - Time window in seconds
 * @returns Rate limit check result
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const redisKey = `ratelimit:${key}`;

  try {
    // Ensure connection is established
    if (redis.status === 'wait') {
      await redis.connect();
    }

    // Increment the counter atomically
    const currentCount = await redis.incr(redisKey);

    // On the first request in the window, set the TTL
    if (currentCount === 1) {
      await redis.expire(redisKey, windowSeconds);
    }

    // Get the remaining TTL for the resetAt calculation
    const ttl = await redis.ttl(redisKey);
    const resetAt = new Date(Date.now() + (ttl > 0 ? ttl : windowSeconds) * 1000);

    if (currentCount > maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    return {
      allowed: true,
      remaining: maxAttempts - currentCount,
      resetAt,
    };
  } catch (error) {
    // If Redis is unavailable, fail open (allow the request)
    // This prevents Redis outages from blocking all logins
    console.error(
      `[RateLimit] Redis unavailable, failing open: ${error instanceof Error ? error.message : error}`
    );
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
    };
  }
}
