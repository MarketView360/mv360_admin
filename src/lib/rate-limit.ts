/**
 * Server-side rate limiting for Admin API routes
 * Uses a sliding window algorithm with in-memory storage
 * For production, consider using Redis for multi-instance deployments
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// Default rate limit: 30 requests per minute
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60000,
  maxRequests: 30,
};

// Stricter limits for authentication endpoints
const AUTH_CONFIG: RateLimitConfig = {
  windowMs: 60000,
  maxRequests: 5,
};

// In-memory storage
const store = new Map<string, RateLimitEntry>();

// Cleanup interval - remove old entries every 5 minutes
const CLEANUP_INTERVAL = 300000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > CLEANUP_INTERVAL) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Get or create rate limit entry for a key
 */
function getEntry(key: string, config: RateLimitConfig): RateLimitEntry {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now - entry.windowStart > config.windowMs) {
    entry = { count: 0, windowStart: now };
    store.set(key, entry);
  }

  return entry;
}

/**
 * Check if request is allowed and increment counter
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG,
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
} {
  const entry = getEntry(identifier, config);
  const now = Date.now();
  const windowEnd = entry.windowStart + config.windowMs;

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: windowEnd,
      retryAfter: Math.ceil((windowEnd - now) / 1000),
    };
  }

  entry.count++;

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: windowEnd,
  };
}

/**
 * Get rate limit info without incrementing
 */
export function getRateLimitInfo(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG,
): {
  remaining: number;
  resetAt: number;
  limit: number;
} {
  const entry = store.get(identifier);
  const now = Date.now();

  if (!entry || now - entry.windowStart > config.windowMs) {
    return {
      remaining: config.maxRequests,
      resetAt: now + config.windowMs,
      limit: config.maxRequests,
    };
  }

  return {
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.windowStart + config.windowMs,
    limit: config.maxRequests,
  };
}

/**
 * Rate limit configs for different endpoint types
 */
export const rateLimitConfigs = {
  default: DEFAULT_CONFIG,
  auth: AUTH_CONFIG, // For login endpoints
  api: { windowMs: 60000, maxRequests: 100 } as RateLimitConfig, // For general API
  strict: { windowMs: 60000, maxRequests: 10 } as RateLimitConfig, // For sensitive operations
};

/**
 * Reset rate limit for an identifier (useful for testing or admin override)
 */
export function resetRateLimit(identifier: string): void {
  store.delete(identifier);
}
