import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const upstashLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      analytics: true,
      prefix: 'presencecv:ratelimit',
    })
  : null;

export async function checkRateLimit(identifier: string): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  if (!upstashLimiter) {
    // 開發環境允許（無 Upstash 時方便本地開發）；生產環境 fail closed
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    if (isProduction) {
      return { success: false, limit: 0, remaining: 0, reset: Date.now() + 3600000 };
    }
    return { success: true, limit: 5, remaining: 5, reset: Date.now() + 3600000 };
  }
  return upstashLimiter.limit(identifier);
}

// Backward compatibility for existing code (server.ts, tests)
interface RateLimitData {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private map: Map<string, RateLimitData>;
  private maxRequests: number;
  private windowMs: number;
  private intervalId?: NodeJS.Timeout;

  constructor(maxRequests = 5, windowMs = 3600000, cleanupIntervalMs = 60000) {
    this.map = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    this.intervalId = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
    
    if (this.intervalId && typeof this.intervalId.unref === 'function') {
      this.intervalId.unref();
    }
  }

  isRateLimited(ip: string): boolean {
    const now = Date.now();
    const limitData = this.map.get(ip);

    if (!limitData || now > limitData.resetTime) {
      this.map.set(ip, { count: 1, resetTime: now + this.windowMs });
      return false;
    }

    if (limitData.count >= this.maxRequests) {
      return true;
    }

    limitData.count++;
    return false;
  }

  cleanup() {
    const now = Date.now();
    for (const [ip, data] of this.map.entries()) {
      if (now > data.resetTime) {
        this.map.delete(ip);
      }
    }
  }

  getMapSize() {
    return this.map.size;
  }

  stopCleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

export const globalRateLimiter = new RateLimiter();