// Per-account AI-import quota: 5 imports in a 24-hour window that starts at the first import.
export const AI_IMPORT_LIMIT = 5;
export const AI_IMPORT_WINDOW_MS = 24 * 60 * 60 * 1000;

// The few Redis commands the quota needs (@upstash/redis has them; tests pass an in-memory fake).
export interface QuotaStore {
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  get(key: string): Promise<unknown>;
  pttl(key: string): Promise<number>; // -2: no key, -1: no expiry
  pexpire(key: string, ms: number): Promise<number>;
}

// resetAt: when the window ends (ms since epoch); null while no window is running.
export interface QuotaState {
  remaining: number;
  limit: number;
  resetAt: number | null;
}

const keyFor = (uid: string) => `presencecv:ai-import:${uid}`;

export function createAiQuota(store: QuotaStore, now: () => number = Date.now) {
  return {
    async consume(uid: string): Promise<QuotaState & { allowed: boolean }> {
      const key = keyFor(uid);
      const count = await store.incr(key);
      let ttl = await store.pttl(key);
      if (ttl < 0) {
        // No expiry yet: this is the first import of a window, so the 24 hours start now.
        await store.pexpire(key, AI_IMPORT_WINDOW_MS);
        ttl = AI_IMPORT_WINDOW_MS;
      }
      return { allowed: true, remaining: AI_IMPORT_LIMIT - count, limit: AI_IMPORT_LIMIT, resetAt: now() + ttl };
    },

    async status(uid: string): Promise<QuotaState> {
      const key = keyFor(uid);
      const count = Number(await store.get(key) ?? 0);
      if (count === 0) return { remaining: AI_IMPORT_LIMIT, limit: AI_IMPORT_LIMIT, resetAt: null };
      const ttl = await store.pttl(key);
      return { remaining: AI_IMPORT_LIMIT - count, limit: AI_IMPORT_LIMIT, resetAt: now() + ttl };
    },
  };
}
