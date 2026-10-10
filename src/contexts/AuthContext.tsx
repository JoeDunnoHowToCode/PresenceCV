/* eslint-disable react-refresh/only-export-components */

/**
 * AuthContext.tsx — Authentication State Management
 *
 * Provides a React context for authentication state across the entire app.
 * Uses Firebase Authentication with Google as the sole OAuth provider.
 *
 * Exports:
 * - AuthProvider: Context provider component (wraps the app in App.tsx)
 * - useAuth(): Hook returning { user, loading, isNewUser, isPro, signInWithGoogle, signOut }
 *
 * Key Behaviors:
 * - On auth state change: checks if a Firestore user document exists at users/{uid}.
 *   If not, creates one (marks isNewUser=true so EditPage can reset to defaults).
 * - signInWithGoogle: Uses popup with `select_account` prompt to let users
 *   choose which Google account to use. Handles edge cases like popup-blocked,
 *   iframe storage partition issues, and rate limiting.
 * - signOut: Calls Firebase signOut AND clears localStorage resume data
 *   to prevent data leakage between sessions.
 *
 * Consumed by: ProtectedRoute, LandingPage, EditPage, ImportResumeModal
 * Depends on: lib/firebase.ts (db, auth instances)
 * Firestore writes: users/{uid} (on first login)
 */
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotice } from './NoticeContext';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, browserPopupRedirectResolver } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isNewUser: boolean; // Add this flag
  isPro: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { notify } = useNotice();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Check if user document already exists
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            // This is a brand new user for the system
            setIsNewUser(true);
            await setDoc(userRef, {
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              createdAt: Date.now()
            });
          } else {
            setIsNewUser(false);
          }
          
          // Check if user is a Pro user
          const proRef = doc(db, 'users_pro', firebaseUser.uid);
          const proSnap = await getDoc(proRef);
          setIsPro(proSnap.exists());

          // Check if user is an Admin
          const adminRef = doc(db, 'admins', firebaseUser.uid);
          const adminSnap = await getDoc(adminRef);
          setIsAdmin(adminSnap.exists());
        } catch (error: any) {
          console.error("Firebase auth check runtime error:", error);
          if (error.message && error.message.includes('offline')) {
            console.error(
              "🔥🔥🔥 FIREBASE OFFLINE ERROR 🔥🔥🔥\n" +
              "Login failed because Firestore is unreachable. Please ensure you have created a Firestore Database in your Firebase Console, or check your AdBlocker/Network."
            );
          }
          setIsNewUser(false); // Default to false if we can't verify
        }
      } else {
        setIsNewUser(false);
        setIsPro(false);
        setIsAdmin(false);
      }
      
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      // Explicitly pass browserPopupRedirectResolver to improve iframe storage partition compliance
      await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      
      // Note: User state will be correctly updated by the onAuthStateChanged listener
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        // User intentionally closed the popup, fail silently
        return;
      } else if (error.code === 'auth/popup-blocked') {
        notify(t('auth.alerts.popupBlocked'), 'error');
      } else if (error.code === 'auth/missing-initial-state' || (error.message && error.message.includes('missing initial state'))) {
        notify(t('auth.alerts.storageBlocked'), 'error');
      } else if (error.code === 'auth/too-many-requests') {
        notify(t('auth.alerts.tooManyRequests'), 'error');
      } else {
        console.error('Sign-in error:', error);
        notify(t('auth.alerts.failed'), 'error');
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null); // force clear immediately
    } catch (error) {
      console.error("Logout Error:", error);
      setUser(null); // clear even on error
    }
    // Clear all local resume states to prevent data leakage between sessions
    localStorage.removeItem('elegant_resume_app_data');
    localStorage.removeItem('elegant_resume_data');
  };

  const value = useMemo(() => ({
    user,
    loading,
    isNewUser,
    isPro,
    isAdmin,
    signInWithGoogle,
    signOut
  }), [user, loading, isNewUser, isPro, isAdmin]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
