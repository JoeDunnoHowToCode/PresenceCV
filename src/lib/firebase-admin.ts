import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export function getFirebaseAdmin() {
  if (getApps().length === 0) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        if (serviceAccount.private_key) {
          let pk = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\r/g, '');
          if (!pk.includes('\n') || pk.split('\n').length < 3) {
            pk = pk.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s/g, '');
            let formattedBody = '';
            for (let i = 0; i < pk.length; i += 64) {
              formattedBody += pk.substring(i, i + 64) + '\n';
            }
            serviceAccount.private_key = '-----BEGIN PRIVATE KEY-----\n' + formattedBody + '-----END PRIVATE KEY-----\n';
          } else {
            serviceAccount.private_key = pk.trim() + '\n';
          }
        }
        initializeApp({
          credential: cert(serviceAccount)
        });
        console.log('Firebase Admin initialized securely via FIREBASE_SERVICE_ACCOUNT_KEY');
      } else {
        initializeApp({
          credential: applicationDefault()
        });
        console.log('Firebase Admin initialized via applicationDefault()');
      }
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
      return { adminDb: null, adminAuth: null };
    }
  }

  try {
    return {
      adminDb: getFirestore(),
      adminAuth: getAuth()
    };
  } catch (error) {
    console.error('Failed to get Firebase Admin services:', error);
    return { adminDb: null, adminAuth: null };
  }
}
