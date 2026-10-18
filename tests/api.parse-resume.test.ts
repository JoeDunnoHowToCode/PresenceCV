import { vi, describe, it, expect, beforeEach } from 'vitest';
import handler from '../api/parse-resume';

// Mock dependencies
vi.mock('../src/utils/rateLimiter', () => ({
  globalRateLimiter: {
    isRateLimited: vi.fn().mockReturnValue(false)
  },
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: Date.now() + 3600000 })
}));

vi.mock('../src/utils/aiQuota', () => ({
  aiQuota: {
    consume: vi.fn().mockResolvedValue({ allowed: true, remaining: 4, limit: 5, resetAt: Date.now() + 86400000 }),
    status: vi.fn(),
  }
}));

// Mock @google/genai
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({
            profile: { name: 'AI Gen User', title: '', location: '', email: '', summary: '' },
            contactItems: [], experience: [], education: [], skills: []
          })
        })
      }
    })),
    Type: { OBJECT: 'OBJECT', STRING: 'STRING', ARRAY: 'ARRAY' }
  };
});

// Mock Firebase Admin dynamic import
const mockVerifyIdToken = vi.fn();

vi.mock('../src/lib/firebase-admin', () => ({
  getFirebaseAdmin: vi.fn(() => ({
    adminAuth: { verifyIdToken: mockVerifyIdToken },
    adminDb: {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({ id: 'mock-doc', get: vi.fn().mockResolvedValue({ exists: false }) })
      })
    }
  }))
}));

describe('API Route: /api/parse-resume', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'valid-mock-api-key-here-that-is-long-enough';

    req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer mock-token-123',
        'x-forwarded-for': '127.0.0.1'
      },
      body: {
        fileType: 'application/pdf',
        base64Data: 'dummy-base-64'
      }
    };

    res = {
      setHeader: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
  });

  it('returns 405 for non-POST requests', async () => {
    req.method = 'GET';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed. Use POST.' });
  });

  it('returns 401 if missing Authorization header', async () => {
    req.headers.authorization = '';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 if token verification fails', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 412 if GEMINI_API_KEY is missing', async () => {
    process.env.GEMINI_API_KEY = '';
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_1' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(412);
  });

  it('returns 200 on successful parse', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_1' });

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      profile: expect.any(Object)
    }));
  });

  it('counts the import against the signed-in account, and not at all for a bad token', async () => {
    const { aiQuota } = await import('../src/utils/aiQuota');
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));
    await handler(req, res);
    expect(aiQuota.consume).not.toHaveBeenCalled();

    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_1' });
    await handler(req, res);
    expect(aiQuota.consume).toHaveBeenCalledWith('user_1');
  });

  it('returns 429 with remaining 0 and the window end when the account has used its 5 imports', async () => {
    const { aiQuota } = await import('../src/utils/aiQuota');
    const resetAt = Date.UTC(2026, 9, 19, 2, 0);
    vi.mocked(aiQuota.consume).mockResolvedValueOnce({ allowed: false, remaining: 0, limit: 5, resetAt });
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_1' });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ error: 'AI_IMPORT_LIMIT', remaining: 0, limit: 5, resetAt });
  });

  it('does not count imports by an admin (admins/{uid} exists)', async () => {
    const { aiQuota } = await import('../src/utils/aiQuota');
    const { getFirebaseAdmin } = await import('../src/lib/firebase-admin');
    const doc = vi.fn((uid: string) => ({ get: vi.fn().mockResolvedValue({ exists: uid === 'admin_1' }) }));
    const collection = vi.fn(() => ({ doc }));
    vi.mocked(getFirebaseAdmin).mockReturnValueOnce({ adminAuth: { verifyIdToken: mockVerifyIdToken }, adminDb: { collection } } as never);
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'admin_1' });

    await handler(req, res);

    expect(collection).toHaveBeenCalledWith('admins');
    expect(doc).toHaveBeenCalledWith('admin_1');
    expect(aiQuota.consume).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});