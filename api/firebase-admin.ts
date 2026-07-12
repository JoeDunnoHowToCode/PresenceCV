import * as admin from 'firebase-admin';

export function getFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin initialized securely via FIREBASE_SERVICE_ACCOUNT_KEY');
      } else {
        admin.initializeApp({
          credential: admin.credential.applicationDefault()
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
      adminDb: admin.firestore(),
      adminAuth: admin.auth()
    };
  } catch (error) {
    console.error('Failed to get Firebase Admin services:', error);
    return { adminDb: null, adminAuth: null };
  }
}
