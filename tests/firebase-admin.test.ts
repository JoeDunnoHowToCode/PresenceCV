// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateKeyPairSync } from 'crypto';
import { getApps, deleteApp } from 'firebase-admin/app';
import { getFirebaseAdmin } from '../src/lib/firebase-admin';

// Uses the real Firebase Admin SDK, offline: every other test stubs this module out.
describe('getFirebaseAdmin', () => {
  const originalKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  afterEach(async () => {
    await Promise.all(getApps().map((app) => deleteApp(app)));
    if (originalKey === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    else process.env.FIREBASE_SERVICE_ACCOUNT_KEY = originalKey;
  });

  it('builds Auth and Firestore from a service-account key, and Auth rejects a malformed ID token', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      type: 'service_account',
      project_id: 'demo-presencecv',
      client_email: 'test@demo-presencecv.iam.gserviceaccount.com',
      private_key: privateKey,
    });

    const { adminAuth, adminDb } = getFirebaseAdmin();

    expect(adminDb).not.toBeNull();
    expect(adminAuth).not.toBeNull();
    await expect(adminAuth!.verifyIdToken('not-a-jwt')).rejects.toMatchObject({ code: 'auth/argument-error' });
  });
});
