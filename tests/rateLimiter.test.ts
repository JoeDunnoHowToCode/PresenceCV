import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter } from '../src/utils/rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit', () => {
    const limiter = new RateLimiter(5, 3600000, 60000);
    const ip = '192.168.1.1';
    for (let i = 0; i < 5; i++) {
      expect(limiter.isRateLimited(ip)).toBe(false);
    }
    limiter.stopCleanup();
  });

  it('blocks requests after the limit', () => {
    const limiter = new RateLimiter(5, 3600000, 60000);
    const ip = '192.168.1.1';
    for (let i = 0; i < 5; i++) {
      limiter.isRateLimited(ip);
    }
    expect(limiter.isRateLimited(ip)).toBe(true);
    limiter.stopCleanup();
  });

  it('tracks IPs independently', () => {
    const limiter = new RateLimiter(5, 3600000, 60000);
    const ip1 = '192.168.1.1';
    const ip2 = '192.168.1.2';
    
    for (let i = 0; i < 5; i++) {
      limiter.isRateLimited(ip1);
    }
    
    expect(limiter.isRateLimited(ip1)).toBe(true);
    expect(limiter.isRateLimited(ip2)).toBe(false);
    limiter.stopCleanup();
  });

  it('actively cleans up expired IPs', () => {
    const limiter = new RateLimiter(5, 3600000, 60000); // 1hr window, 1m cleanup
    const ip = '192.168.1.1';
    limiter.isRateLimited(ip); // Add to map
    
    expect(limiter.getMapSize()).toBe(1);
    
    // Fast-forward past the window + cleanup interval
    vi.advanceTimersByTime(3600000 + 60000);
    
    expect(limiter.getMapSize()).toBe(0);
    
    // Next request should be allowed again
    expect(limiter.isRateLimited(ip)).toBe(false);
    limiter.stopCleanup();
  });
});
