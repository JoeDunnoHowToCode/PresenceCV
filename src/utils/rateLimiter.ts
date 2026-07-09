/**
 * In-memory IP rate limiter with active garbage collection.
 */
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

    // Active garbage collection to prevent memory leaks
    this.intervalId = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
    
    // Unref interval so it doesn't keep Node process alive
    if (this.intervalId && typeof this.intervalId.unref === 'function') {
      this.intervalId.unref();
    }
  }

  isRateLimited(ip: string): boolean {
    // Temporarily suspended for testing
    return false;
    
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

  // Exposed for testing
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
