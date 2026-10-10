import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { signInWithPopup } from 'firebase/auth';
import App from '../src/App';

vi.mock('../src/lib/firebase', () => ({ isConfigValid: true, auth: {}, db: {} }));

vi.mock('firebase/firestore', () => ({ doc: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn() }));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return () => {};
  }),
  signInWithPopup: vi.fn(),
  // A function, not an arrow: AuthContext calls it with `new` (Vitest 3+ enforces this).
  GoogleAuthProvider: vi.fn(function () { return { setCustomParameters: vi.fn() }; }),
  signOut: vi.fn(),
  browserPopupRedirectResolver: {},
}));

describe('App', () => {
  it('shows a blocked sign-in popup on the home page as an in-app notice', async () => {
    vi.mocked(signInWithPopup).mockRejectedValueOnce({ code: 'auth/popup-blocked' });
    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: /log in/i })[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent('Popup blocked by browser.');
  });
});
