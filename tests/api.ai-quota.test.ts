import { vi, describe, it, expect, beforeEach } from 'vitest';
import handler from '../api/ai-quota';

vi.mock('../src/utils/aiQuota', () => ({
  aiQuota: { consume: vi.fn(), status: vi.fn() },
}));

const mockVerifyIdToken = vi.fn();
const mockAdminDoc = vi.fn((uid: string) => ({ get: vi.fn().mockResolvedValue({ exists: uid === 'admin_1' }) }));
const mockCollection = vi.fn(() => ({ doc: mockAdminDoc }));

vi.mock('../src/lib/firebase-admin', () => ({
  getFirebaseAdmin: vi.fn(() => ({
    adminAuth: { verifyIdToken: mockVerifyIdToken },
    adminDb: { collection: mockCollection },
  })),
}));

describe('API Route: /api/ai-quota', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { method: 'GET', headers: { authorization: 'Bearer mock-token-123' } };
    res = { setHeader: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis(), json: vi.fn(), end: vi.fn() };
  });

  it('answers 405 to anything but GET, and 401 without a valid token', async () => {
    await handler({ ...req, method: 'POST' }, res);
    expect(res.status).toHaveBeenLastCalledWith(405);

    await handler({ ...req, headers: {} }, res);
    expect(res.status).toHaveBeenLastCalledWith(401);

    mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));
    await handler(req, res);
    expect(res.status).toHaveBeenLastCalledWith(401);
  });

  it("returns the signed-in user's remaining imports and when the window ends", async () => {
    const { aiQuota } = await import('../src/utils/aiQuota');
    const resetAt = Date.UTC(2026, 9, 19, 2, 0);
    vi.mocked(aiQuota.status).mockResolvedValueOnce({ remaining: 3, limit: 5, resetAt });
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_1' });

    await handler(req, res);

    expect(aiQuota.status).toHaveBeenCalledWith('user_1');
    expect(res.status).toHaveBeenLastCalledWith(200);
    expect(res.json).toHaveBeenLastCalledWith({ remaining: 3, limit: 5, resetAt });
  });
});
