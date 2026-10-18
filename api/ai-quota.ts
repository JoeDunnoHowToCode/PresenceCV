/**
 * api/ai-quota.ts — Vercel Serverless Function: the signed-in user's AI-import quota.
 *
 * Request: GET with Authorization: Bearer <Firebase ID token>
 * 200: { remaining, limit, resetAt } — resetAt (ms epoch) is null until the first import starts a window.
 * Responses: 401 without a valid token, 405 for other methods, 500 without Admin SDK credentials.
 *
 * Consumed by: ImportResumeModal.tsx (when it opens). server.ts mounts the same handler for local dev.
 */
import { getFirebaseAdmin } from '../src/lib/firebase-admin.js';
import { aiQuota } from '../src/utils/aiQuota.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const authHeader = req.headers.authorization;
  const idToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : '';
  if (!idToken) {
    return res.status(401).json({ error: "Unauthorized. Missing bearer token." });
  }

  let adminAuth, adminDb;
  try {
    ({ adminAuth, adminDb } = getFirebaseAdmin());
  } catch (err) {
    console.error("Firebase Admin SDK import failed:", err);
  }
  if (!adminAuth || !adminDb) {
    return res.status(500).json({ error: "Server Configuration Error" });
  }

  let uid: string;
  try {
    ({ uid } = await adminAuth.verifyIdToken(idToken));
  } catch (err) {
    console.error("Firebase ID Token verification failed:", err);
    return res.status(401).json({ error: "Unauthorized. Invalid ID token." });
  }

  return res.status(200).json(await aiQuota.status(uid));
}
