import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ImportResumeModal } from '../src/components/ImportResumeModal';
import { useAuth } from '../src/contexts/AuthContext';
import { runTransaction } from 'firebase/firestore';

// ── Auth context ──────────────────────────────────────────────────────────────
vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// ── Firebase app ──────────────────────────────────────────────────────────────
vi.mock('../src/lib/firebase', () => ({
  db: {}
}));

// ── Firestore SDK — mock runTransaction (post-fix component uses atomic read+write)
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  runTransaction: vi.fn()
}));

// ── Guard: GoogleGenAI must NOT be imported/called from the component ─────────
// The post-fix version removes the client-side Gemini fallback entirely.
vi.mock('@google/genai', () => ({
  // If the component tries to instantiate GoogleGenAI, this spy will capture it.
  GoogleGenAI: vi.fn(() => ({
    models: {
      generateContent: vi.fn().mockResolvedValue({ text: '{}' })
    }
  }))
}));

// ─────────────────────────────────────────────────────────────────────────────

describe('ImportResumeModal - Security Fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_ADMIN_UID', 'admin_123');
  });

  // ── Test 1: Quota enforcement — normal user blocked at count >= 5 ──────────
  it('blocks upload when Firestore returns count=5 for today and user is not admin', async () => {
    (useAuth as any).mockReturnValue({ user: { uid: 'normal_user' } });

    // runTransaction receives a callback (transaction); simulate it reading count=5.
    (runTransaction as any).mockImplementation(async (_db: any, updateFn: Function) => {
      const today = new Date().toISOString().split('T')[0];
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ date: today, count: 5 })
        }),
        set: vi.fn()
      };
      return updateFn(mockTransaction);
    });

    render(<ImportResumeModal isOpen={true} onClose={() => {}} onImport={() => {}} />);

    const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]')!;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText(/You have reached your daily limit of 5 resume imports\./i)
      ).toBeInTheDocument();
    });
  });

  // ── Test 2: Admin bypass — uid matches VITE_ADMIN_UID → not blocked ────────
  it('does NOT block upload when user is admin even if count >= 5', async () => {
    (useAuth as any).mockReturnValue({ user: { uid: 'admin_123' } });

    // runTransaction would normally throw for over-quota — but admin skips it
    (runTransaction as any).mockImplementation(async (_db: any, updateFn: Function) => {
      const today = new Date().toISOString().split('T')[0];
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ date: today, count: 5 })
        }),
        set: vi.fn()
      };
      return updateFn(mockTransaction);
    });

    // Backend parse succeeds so the modal closes without an error
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ profile: {}, contactItems: [], experience: [], education: [], skills: [] })
    });

    render(<ImportResumeModal isOpen={true} onClose={() => {}} onImport={() => {}} />);

    const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]')!;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.queryByText(/You have reached your daily limit of 5 resume imports\./i)
      ).not.toBeInTheDocument();
    });
  });

  // ── Test 3: No client-side GoogleGenAI fallback ────────────────────────────
  // The post-fix component routes everything through /api/parse-resume.
  // GoogleGenAI must never be instantiated during a normal (non-error) flow.
  it('does not call GoogleGenAI directly when the backend responds successfully', async () => {
    const { GoogleGenAI } = await import('@google/genai');

    (useAuth as any).mockReturnValue({ user: { uid: 'normal_user' } });

    // Quota not reached
    (runTransaction as any).mockImplementation(async (_db: any, updateFn: Function) => {
      const today = new Date().toISOString().split('T')[0];
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ date: today, count: 0 })
        }),
        set: vi.fn()
      };
      return updateFn(mockTransaction);
    });

    // Backend responds with success — no fallback needed
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ profile: {}, contactItems: [], experience: [], education: [], skills: [] })
    });

    render(<ImportResumeModal isOpen={true} onClose={() => {}} onImport={() => {}} />);

    const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]')!;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      // Modal should not be showing an error
      expect(
        screen.queryByText(/You have reached your daily limit/i)
      ).not.toBeInTheDocument();
    });

    // GoogleGenAI constructor must never have been called
    expect(GoogleGenAI).not.toHaveBeenCalled();
  });
});
