import { describe, it, expect } from 'vitest';
import { createAiQuota, AI_IMPORT_WINDOW_MS, type QuotaStore } from '../src/utils/aiQuota';

// In-memory stand-in for the Redis commands the quota uses; keys expire on the test's clock.
function fakeStore(clock: { now: number }): QuotaStore {
  const data = new Map<string, { value: number; expiresAt: number | null }>();
  const live = (key: string) => {
    const entry = data.get(key);
    if (entry && entry.expiresAt !== null && entry.expiresAt <= clock.now) {
      data.delete(key);
      return undefined;
    }
    return entry;
  };
  const add = (key: string, by: number) => {
    const entry = live(key) ?? { value: 0, expiresAt: null };
    entry.value += by;
    data.set(key, entry);
    return entry.value;
  };
  return {
    incr: async (key) => add(key, 1),
    decr: async (key) => add(key, -1),
    get: async (key) => live(key)?.value ?? null,
    pttl: async (key) => {
      const entry = live(key);
      if (!entry) return -2;
      return entry.expiresAt === null ? -1 : entry.expiresAt - clock.now;
    },
    pexpire: async (key, ms) => {
      const entry = live(key);
      if (!entry) return 0;
      entry.expiresAt = clock.now + ms;
      return 1;
    },
  };
}

describe('AI-import quota', () => {
  it('starts a 24-hour window at the first import and leaves 4', async () => {
    const clock = { now: Date.UTC(2026, 9, 18, 2, 0) };
    const quota = createAiQuota(fakeStore(clock), () => clock.now);

    const result = await quota.consume('u1');

    expect(result).toEqual({ allowed: true, remaining: 4, limit: 5, resetAt: clock.now + AI_IMPORT_WINDOW_MS });
  });

  it('reports 5 and no countdown before the first import, the countdown during the window, and 5 again after it', async () => {
    const clock = { now: Date.UTC(2026, 9, 18, 2, 0) };
    const quota = createAiQuota(fakeStore(clock), () => clock.now);
    expect(await quota.status('u1')).toEqual({ remaining: 5, limit: 5, resetAt: null });

    const firstImportAt = clock.now;
    await quota.consume('u1');
    clock.now += 60 * 60 * 1000;
    expect(await quota.status('u1')).toEqual({ remaining: 4, limit: 5, resetAt: firstImportAt + AI_IMPORT_WINDOW_MS });

    clock.now = firstImportAt + AI_IMPORT_WINDOW_MS;
    expect(await quota.status('u1')).toEqual({ remaining: 5, limit: 5, resetAt: null });
  });
});
