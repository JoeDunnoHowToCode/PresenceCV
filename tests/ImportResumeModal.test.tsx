import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ImportResumeModal } from '../src/components/ImportResumeModal';
import { useAuth } from '../src/contexts/AuthContext';
import { getDoc } from 'firebase/firestore';

vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../src/lib/firebase', () => ({
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn()
}));

describe('ImportResumeModal - Security Fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_ADMIN_UID', 'admin_123');
  });

  it('blocks upload if user has reached daily limit and is not admin', async () => {
    (useAuth as any).mockReturnValue({ user: { uid: 'normal_user' } });
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({ date: new Date().toISOString().split('T')[0], count: 5 })
    });

    render(<ImportResumeModal isOpen={true} onClose={() => {}} onImport={() => {}} />);
    
    const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]')!;
    
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/You have reached your daily limit of 5 resume imports./i)).toBeInTheDocument();
    });
  });

  it('allows upload if user has reached limit but IS admin', async () => {
    (useAuth as any).mockReturnValue({ user: { uid: 'admin_123' } });
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({ date: new Date().toISOString().split('T')[0], count: 5 })
    });

    render(<ImportResumeModal isOpen={true} onClose={() => {}} onImport={() => {}} />);
    
    const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]')!;
    
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.queryByText(/You have reached your daily limit of 5 resume imports./i)).not.toBeInTheDocument();
    });
  });
});
