import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ImportResumeModal } from '../src/components/ImportResumeModal';
import { useAuth } from '../src/contexts/AuthContext';

// ── Auth context ──────────────────────────────────────────────────────────────
vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// ── Firebase app ──────────────────────────────────────────────────────────────
vi.mock('../src/lib/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('mock-token-123')
    }
  },
  db: {}
}));

// ── Guard: GoogleGenAI must NOT be imported/called from the component ─────────
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => {
    throw new Error("GoogleGenAI should never be called on the client-side!");
  })
}));

describe('ImportResumeModal - Security Fixes (Token-Based API)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test 1: Quota enforcement — API returns 429 ──────────
  it('blocks upload when backend API returns 429 (Daily limit reached)', async () => {
    (useAuth as any).mockReturnValue({ user: { uid: 'normal_user' } });

    // Mock fetch to simulate 429 Quota Exceeded
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: "Daily limit reached (5/5). Please try again tomorrow." })
    });

    render(<ImportResumeModal isOpen={true} onClose={() => {}} onImport={() => {}} />);

    const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]')!;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText(/Daily limit reached \(5\/5\)\. Please try again tomorrow\./i)
      ).toBeInTheDocument();
    });
  });

  // ── Test 2: Successful parsing — API returns 200 ──────────
  it('successfully imports when backend API returns 200', async () => {
    (useAuth as any).mockReturnValue({ user: { uid: 'normal_user' } });

    const onImportMock = vi.fn();

    // Mock fetch to simulate successful response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ profile: { name: 'Test User' }, contactItems: [], experience: [], education: [], skills: [] })
    });

    render(<ImportResumeModal isOpen={true} onClose={() => {}} onImport={onImportMock} />);

    const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]')!;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onImportMock).toHaveBeenCalledWith({
        profile: { name: 'Test User' },
        contactItems: [],
        experience: [],
        education: [],
        skills: []
      });
      expect(global.fetch).toHaveBeenCalledWith('/api/parse-resume', expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-token-123',
        })
      }));
    });

    // Modal should not show an error
    expect(screen.queryByText(/Daily limit reached/i)).not.toBeInTheDocument();
  });
  
  // ── Test 3: Missing Token ──────────
  it('shows error if user auth token is missing', async () => {
    (useAuth as any).mockReturnValue({ user: null });

    render(<ImportResumeModal isOpen={true} onClose={() => {}} onImport={() => {}} />);

    const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]')!;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText(/You must be logged in to use this feature\./i)
      ).toBeInTheDocument();
    });
    
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // ── Test 4: API returns 401 Unauthorized ──────────
  it('shows error if backend API returns 401', async () => {
    (useAuth as any).mockReturnValue({ user: { uid: 'normal_user' } });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized. Invalid ID token." })
    });

    render(<ImportResumeModal isOpen={true} onClose={() => {}} onImport={() => {}} />);

    const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]')!;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText(/Unauthorized\. Invalid ID token\./i)
      ).toBeInTheDocument();
    });
  });

  // ── Test 5: API returns 500 Server Error ──────────
  it('shows error if backend API returns 500 (e.g. Firebase Admin misconfigured)', async () => {
    (useAuth as any).mockReturnValue({ user: { uid: 'normal_user' } });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server Configuration Error" })
    });

    render(<ImportResumeModal isOpen={true} onClose={() => {}} onImport={() => {}} />);

    const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]')!;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText(/AI service unavailable/i)
      ).toBeInTheDocument();
    });
  });
});
