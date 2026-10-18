import { describe, it, expect } from 'vitest';
import { globalRateLimiter, RateLimiter } from '../src/utils/rateLimiter';

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