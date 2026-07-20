import { vi, describe, it, expect, beforeEach } from 'vitest';
import handler from '../api/parse-resume';

// Mock dependencies
vi.mock('../src/utils/rateLimiter', () => ({
  globalRateLimiter: {
    isRateLimited: vi.fn().mockReturnValue(false)
  },
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: Date.now() + 3600000 })
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
        doc: vi.fn().mockReturnValue({ id: 'mock-doc' })
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

  it('returns 429 if IP rate limit exceeded', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_1' });
    // Override the rate limiter mock for this test
    const { checkRateLimit } = await import('../src/utils/rateLimiter');
    (checkRateLimit as any).mockResolvedValueOnce({ success: false, limit: 5, remaining: 0, reset: Date.now() + 3600000 });

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('Too many requests')
    }));
  });
});