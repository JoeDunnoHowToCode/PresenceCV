import { describe, it, expect, beforeEach, vi } from 'vitest';
import { globalRateLimiter, RateLimiter } from '../src/utils/rateLimiter';

describe('RateLimiter (Upstash)', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('returns allowed when Upstash is not configured', async () => {
    const { checkRateLimit: check } = await import('../src/utils/rateLimiter');
    const result = await check('127.0.0.1');
    
    expect(result.success).toBe(true);
    expect(result.limit).toBe(5);
    expect(result.remaining).toBe(5);
  });
});

describe('RateLimiter backward compatibility', () => {
  it('exports globalRateLimiter with isRateLimited method', () => {
    expect(typeof globalRateLimiter.isRateLimited).toBe('function');
  });

  it('tracks requests in memory for local dev', () => {
    const limiter = new RateLimiter(3, 60000);
    
    expect(limiter.isRateLimited('192.168.1.1')).toBe(false);
    expect(limiter.isRateLimited('192.168.1.1')).toBe(false);
    expect(limiter.isRateLimited('192.168.1.1')).toBe(false);
    expect(limiter.isRateLimited('192.168.1.1')).toBe(true); // 4th request = rate limited
    
    // Different IP not limited
    expect(limiter.isRateLimited('10.0.0.1')).toBe(false);
    
    limiter.stopCleanup();
  });

  it('resets after window expires', () => {
    const limiter = new RateLimiter(2, 10); // 10ms window
    
    expect(limiter.isRateLimited('1.1.1.1')).toBe(false);
    expect(limiter.isRateLimited('1.1.1.1')).toBe(false);
    expect(limiter.isRateLimited('1.1.1.1')).toBe(true);
    
    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(limiter.isRateLimited('1.1.1.1')).toBe(false); // Window reset
        limiter.stopCleanup();
        resolve();
      }, 20);
    });
  });
});