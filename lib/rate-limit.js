import { NextResponse } from "next/server";

/**
 * Cleanergy In-Memory Sliding Window Rate Limiter
 * Provides robust rate limiting for single-instance or serverless cold-starts,
 * with optional Upstash Redis REST integration when environment variables are set.
 */

const memoryStore = new Map();

// Periodically clean up entries older than 10 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (now - record.resetTime > 600000) {
        memoryStore.delete(key);
      }
    }
  }, 300000);
}

/**
 * Extracts client IP from request headers
 */
export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "127.0.0.1"
  );
}

/**
 * Checks rate limit for a given key.
 * @param {string} key - Identifier (e.g., `login:${ip}`)
 * @param {number} maxRequests - Max allowed requests within window
 * @param {number} windowSeconds - Window duration in seconds
 * @returns {Promise<{ success: boolean, limit: number, remaining: number, reset: number }>}
 */
export async function checkRateLimit(key, maxRequests = 10, windowSeconds = 60) {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Use Upstash Redis REST if configured for multi-region serverless
  if (upstashUrl && upstashToken) {
    try {
      const now = Date.now();
      const windowMs = windowSeconds * 1000;
      const clearBefore = now - windowMs;

      // Pipeline: zremrangebyscore -> zadd -> zcard -> expire
      const pipelineRes = await fetch(`${upstashUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["ZREMRANGEBYSCORE", key, "0", String(clearBefore)],
          ["ZADD", key, String(now), `${now}-${Math.random()}`],
          ["ZCARD", key],
          ["EXPIRE", key, String(windowSeconds * 2)],
        ]),
      });

      if (pipelineRes.ok) {
        const results = await pipelineRes.json();
        const count = results[2]?.result || 1;
        const remaining = Math.max(0, maxRequests - count);
        return {
          success: count <= maxRequests,
          limit: maxRequests,
          remaining,
          reset: Math.ceil((now + windowMs) / 1000),
        };
      }
    } catch (err) {
      console.warn("[RateLimit] Upstash check failed, falling back to memory:", err?.message);
    }
  }

  // In-Memory Sliding Window
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  let record = memoryStore.get(key);
  if (!record || now > record.resetTime) {
    record = {
      timestamps: [],
      resetTime: now + windowMs,
    };
    memoryStore.set(key, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
  record.timestamps.push(now);

  const count = record.timestamps.length;
  const remaining = Math.max(0, maxRequests - count);
  const resetSeconds = Math.ceil(record.resetTime / 1000);

  return {
    success: count <= maxRequests,
    limit: maxRequests,
    remaining,
    reset: resetSeconds,
  };
}

/**
 * Standard 429 Too Many Requests response with HTTP headers
 */
export function rateLimitResponse(rateLimitResult) {
  const retryAfter = Math.max(1, rateLimitResult.reset - Math.ceil(Date.now() / 1000));
  return NextResponse.json(
    {
      success: false,
      error: "Too many requests. Please slow down and try again later.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(rateLimitResult.limit),
        "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        "X-RateLimit-Reset": String(rateLimitResult.reset),
      },
    }
  );
}
