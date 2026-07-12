import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter } from '../src/utils/rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Core allow / block behaviour
  // These tests MUST fail if someone re-introduces an early `return false;`.
  // ──────────────────────────────────────────────────────────────────────────

  it('returns false for every request strictly below the limit', () => {
    // maxRequests=3 → requests 1, 2, 3 must all be allowed
    const limiter = new RateLimiter(3, 3600000, 60000);
    const ip = '10.0.0.1';
    for (let i = 0; i < 3; i++) {
      expect(limiter.isRateLimited(ip)).toBe(false);
    }
    limiter.stopCleanup();
  });

  it('returns true on the request that exceeds maxRequests', () => {
    // maxRequests=3 → the 4th call must be blocked
    const limiter = new RateLimiter(3, 3600000, 60000);
    const ip = '10.0.0.2';
    limiter.isRateLimited(ip); // 1
    limiter.isRateLimited(ip); // 2
    limiter.isRateLimited(ip); // 3 — budget exhausted
    expect(limiter.isRateLimited(ip)).toBe(true); // 4 must be blocked
    limiter.stopCleanup();
  });

  it('keeps blocking on every subsequent request past the limit', () => {
    const limiter = new RateLimiter(2, 3600000, 60000);
    const ip = '10.0.0.3';
    limiter.isRateLimited(ip); // 1
    limiter.isRateLimited(ip); // 2 — budget exhausted
    expect(limiter.isRateLimited(ip)).toBe(true); // 3
    expect(limiter.isRateLimited(ip)).toBe(true); // 4
    expect(limiter.isRateLimited(ip)).toBe(true); // 5
    limiter.stopCleanup();
  });

  // Keep original 5-request budget tests intact ────────────────────────────

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

  // ──────────────────────────────────────────────────────────────────────────
  // Window reset — counter must reset after the window expires
  // ──────────────────────────────────────────────────────────────────────────

  it('allows requests again after the window expires', () => {
    const windowMs = 1000; // short window for fast testing
    const limiter = new RateLimiter(2, windowMs, 500);
    const ip = '10.0.0.4';

    limiter.isRateLimited(ip); // 1
    limiter.isRateLimited(ip); // 2 — budget exhausted
    expect(limiter.isRateLimited(ip)).toBe(true); // blocked

    // Advance past the window so the entry becomes stale
    vi.advanceTimersByTime(windowMs + 1);

    // Next call opens a fresh window — must be allowed
    expect(limiter.isRateLimited(ip)).toBe(false);
    limiter.stopCleanup();
  });

  it('does NOT reset before the window expires', () => {
    const windowMs = 5000;
    const limiter = new RateLimiter(2, windowMs, 500);
    const ip = '10.0.0.5';

    limiter.isRateLimited(ip); // 1
    limiter.isRateLimited(ip); // 2 — budget exhausted

    // Advance to just before the window ends
    vi.advanceTimersByTime(windowMs - 1);

    // Still blocked — window has not expired
    expect(limiter.isRateLimited(ip)).toBe(true);
    limiter.stopCleanup();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // IP isolation
  // ──────────────────────────────────────────────────────────────────────────

  it('tracks IPs independently', () => {
    const limiter = new RateLimiter(5, 3600000, 60000);
    const ip1 = '192.168.1.1';
    const ip2 = '192.168.1.2';

    for (let i = 0; i < 5; i++) {
      limiter.isRateLimited(ip1);
    }

    expect(limiter.isRateLimited(ip1)).toBe(true);
    expect(limiter.isRateLimited(ip2)).toBe(false); // ip2 has a fresh budget
    limiter.stopCleanup();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // cleanup() — removes expired entries and restores access
  // ──────────────────────────────────────────────────────────────────────────

  it('cleanup() removes entries whose window has expired', () => {
    const windowMs = 3600000;
    const cleanupIntervalMs = 60000;
    const limiter = new RateLimiter(5, windowMs, cleanupIntervalMs);
    const ip = '192.168.1.1';

    limiter.isRateLimited(ip);
    expect(limiter.getMapSize()).toBe(1);

    // Advance past both the window and the cleanup interval
    vi.advanceTimersByTime(windowMs + cleanupIntervalMs);

    // The periodic cleanup should have evicted the stale entry
    expect(limiter.getMapSize()).toBe(0);
    limiter.stopCleanup();
  });

  it('cleanup() does NOT remove entries whose window has not yet expired', () => {
    const windowMs = 3600000;
    const cleanupIntervalMs = 60000;
    const limiter = new RateLimiter(5, windowMs, cleanupIntervalMs);
    const ip = '10.0.0.6';

    limiter.isRateLimited(ip);
    expect(limiter.getMapSize()).toBe(1);

    // Advance to just after the first cleanup tick (entry window is still active)
    vi.advanceTimersByTime(cleanupIntervalMs);

    expect(limiter.getMapSize()).toBe(1); // entry must still be present
    limiter.stopCleanup();
  });

  it('actively cleans up expired IPs and allows fresh requests afterwards', () => {
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
