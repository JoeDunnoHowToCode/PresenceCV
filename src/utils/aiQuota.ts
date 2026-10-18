// Per-account AI-import quota: 5 imports in a 24-hour window that starts at the first import.
import { Redis } from '@upstash/redis';

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

// Without Redis: allow everything in development (easy local work), refuse in production (fail closed).
const noStoreState = (): QuotaState => {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  return { remaining: isProduction ? 0 : AI_IMPORT_LIMIT, limit: AI_IMPORT_LIMIT, resetAt: null };
};

export function createAiQuota(store: QuotaStore | null, now: () => number = Date.now) {
  return {
    async consume(uid: string): Promise<QuotaState & { allowed: boolean }> {
      if (!store) {
        const state = noStoreState();
        return { allowed: state.remaining > 0, ...state };
      }
      const key = keyFor(uid);
      const count = await store.incr(key);
      let ttl = await store.pttl(key);
      if (ttl < 0) {
        // No expiry yet: this is the first import of a window, so the 24 hours start now.
        await store.pexpire(key, AI_IMPORT_WINDOW_MS);
        ttl = AI_IMPORT_WINDOW_MS;
      }
      const resetAt = now() + ttl;
      if (count > AI_IMPORT_LIMIT) {
        // Over the limit: take the increment back so a rejected request doesn't count.
        await store.decr(key);
        return { allowed: false, remaining: 0, limit: AI_IMPORT_LIMIT, resetAt };
      }
      return { allowed: true, remaining: AI_IMPORT_LIMIT - count, limit: AI_IMPORT_LIMIT, resetAt };
    },

    async status(uid: string): Promise<QuotaState> {
      if (!store) return noStoreState();
      const key = keyFor(uid);
      const count = Number(await store.get(key) ?? 0);
      if (count === 0) return { remaining: AI_IMPORT_LIMIT, limit: AI_IMPORT_LIMIT, resetAt: null };
      const ttl = await store.pttl(key);
      return { remaining: AI_IMPORT_LIMIT - count, limit: AI_IMPORT_LIMIT, resetAt: now() + ttl };
    },
  };
}

export const aiQuota = createAiQuota(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null,
);
