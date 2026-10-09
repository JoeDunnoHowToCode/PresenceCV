import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { signInWithPopup } from 'firebase/auth';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { NoticeProvider } from '../src/contexts/NoticeContext';

vi.mock('../src/lib/firebase', () => ({ auth: {}, db: {} }));

vi.mock('firebase/firestore', () => ({ doc: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn() }));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return () => {};
  }),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(() => ({ setCustomParameters: vi.fn() })),
  signOut: vi.fn(),
  browserPopupRedirectResolver: {},
}));

function SignInButton() {
  const { signInWithGoogle } = useAuth();
  return <button onClick={() => signInWithGoogle().catch(() => {})}>sign in</button>;
}

describe('AuthProvider sign-in failures', () => {
  it.each([
    ['auth/popup-blocked', 'Popup blocked by browser. Please allow popups for this site to sign in.'],
    ['auth/missing-initial-state', 'Storage partition blocked the sign back in inside the Preview iFrame.'],
    ['auth/too-many-requests', 'Too many sign-in attempts. Please try again later.'],
    ['auth/internal-error', 'Failed to sign in. Please try again.'],
  ])('shows an error notice instead of alert() for %s', async (code, message) => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(signInWithPopup).mockRejectedValueOnce({ code });
    render(<NoticeProvider><AuthProvider><SignInButton /></AuthProvider></NoticeProvider>);

    fireEvent.click(screen.getByText('sign in'));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(alertSpy).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
