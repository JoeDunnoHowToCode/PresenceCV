/**
 * firebase.ts — Firebase SDK Initialization
 *
 * Initializes and exports the core Firebase services used throughout the app:
 * - `app`: The Firebase App instance
 * - `auth`: Firebase Authentication (Google OAuth)
 * - `db`: Firestore database instance
 * - `isConfigValid`: Boolean flag indicating whether required env vars are present
 *
 * Configuration:
 * - All Firebase config values come from VITE_FIREBASE_* environment variables.
 * - A custom `VITE_FIREBASE_DATABASE_ID` is supported for non-default Firestore DBs.
 * - Uses `experimentalForceLongPolling` to bypass WebSocket issues on restrictive
 *   networks (corporate firewalls, ad blockers blocking firestore.googleapis.com).
 *
 * Boot-time Connection Test:
 * - On module load, attempts to read a test doc from Firestore.
 * - If offline, logs a detailed diagnostic error to help users troubleshoot.
 *
 * Consumed by: AuthContext.tsx, useResume.ts, ImportResumeModal.tsx, EditPage.tsx, ViewPage.tsx
 * Env vars: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
 *           VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID,
 *           VITE_FIREBASE_APP_ID, VITE_FIREBASE_DATABASE_ID (optional)
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate Firebase Config
export const isConfigValid = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

if (!isConfigValid && import.meta.env.DEV) {
  const missing = [];
  if (!firebaseConfig.apiKey) missing.push('VITE_FIREBASE_API_KEY');
  if (!firebaseConfig.projectId) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (!firebaseConfig.appId) missing.push('VITE_FIREBASE_APP_ID');

  console.error(
    `FATAL: Firebase configuration is missing: ${missing.join(', ')} \n` +
    "1. Go to Settings -> Environment Variables in AI Studio.\n" +
    "2. Add the missing keys from your Firebase Project Settings.\n" +
    "3. Restart the application."
  );
}

const app = initializeApp(firebaseConfig);

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || undefined;

// Use initializeFirestore with experimentalForceLongPolling to bypass WebSockets completely.
// This is the strongest fix for "client is offline" errors on restrictive networks.
export const db = initializeFirestore(
  app, 
  { experimentalForceLongPolling: true }, 
  databaseId
);

export const auth = getAuth(app);

// Check if Firebase is properly configured on initial boot
async function testConnection() {
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error(
        "🔥🔥🔥 FIREBASE OFFLINE ERROR 🔥🔥🔥\n\n" +
        "We could not reach your Firestore Database. This usually happens for one of three reasons:\n" +
        "1. You forgot to create the Firestore Database in the Firebase Console. \n" +
        "   (Solution: Go to Firebase Console -> Firestore Database -> Click 'Create Database' -> Start in Production Mode)\n" +
        "2. Your AdBlocker (like Brave Shields or uBlock) is blocking the connection to firestore.googleapis.com. \n" +
        "   (Solution: Whitelist this site in your AdBlocker)\n" +
        "3. Your Wi-Fi or corporate network is blocking WebSockets or Google domains.\n\n" +
        "Error Details:", error.message
      );
    }
  }
}
testConnection();
