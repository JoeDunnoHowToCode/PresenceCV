import { vi, describe, it, expect, beforeEach } from 'vitest';
import handler from '../api/parse-resume';
import { globalRateLimiter } from '../src/utils/rateLimiter';

// Mock dependencies
vi.mock('../src/utils/rateLimiter', () => ({
  globalRateLimiter: {
    isRateLimited: vi.fn().mockReturnValue(false)
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
const mockRunTransaction = vi.fn();
const mockGet = vi.fn();
const mockSet = vi.fn();

vi.mock('../api/firebase-admin', () => ({
  getFirebaseAdmin: vi.fn(() => ({
    adminAuth: { verifyIdToken: mockVerifyIdToken },
    adminDb: {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({ id: 'mock-doc' })
      }),
      runTransaction: mockRunTransaction
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

  it('returns 429 if rate limited by IP', async () => {
    vi.mocked(globalRateLimiter.isRateLimited).mockReturnValueOnce(true);
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(429);
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

  it('returns 429 if quota exceeded (transaction fails)', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_1' });
    mockRunTransaction.mockRejectedValueOnce(new Error('QUOTA_EXCEEDED'));

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('returns 200 on successful parse', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_1' });
    mockRunTransaction.mockImplementationOnce(async (cb: any) => {
      await cb({ get: mockGet, set: mockSet });
    });
    mockGet.mockResolvedValue({ exists: false });

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      profile: expect.any(Object)
    }));
  });
});
