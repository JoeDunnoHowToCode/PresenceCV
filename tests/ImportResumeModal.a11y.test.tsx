import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportResumeModal } from '../src/components/ImportResumeModal';
import * as AuthContext from '../src/contexts/AuthContext';

vi.mock('../src/contexts/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../src/lib/firebase', () => ({
  auth: { currentUser: { getIdToken: vi.fn().mockResolvedValue('mock-token-123') } },
  db: {},
}));

describe('ImportResumeModal accessibility', () => {
  beforeEach(() => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({ user: { uid: 'u1' } } as never);
  });

  it('is a modal dialog labelled by its title', () => {
    render(<ImportResumeModal isOpen onClose={vi.fn()} onImport={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Import Resume with AI' })).toHaveAttribute('aria-modal', 'true');
  });

  it('closes on Escape while open, and ignores Escape while closed', () => {
    const onClose = vi.fn();
    const { rerender } = render(<ImportResumeModal isOpen={false} onClose={onClose} onImport={vi.fn()} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    rerender(<ImportResumeModal isOpen onClose={onClose} onImport={vi.fn()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape while a resume is uploading, like its backdrop', async () => {
    const realFetch = global.fetch;
    global.fetch = vi.fn(() => new Promise<Response>(() => {})); // the upload never finishes
    try {
      const onClose = vi.fn();
      render(<ImportResumeModal isOpen onClose={onClose} onImport={vi.fn()} />);
      const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });
      fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).not.toHaveBeenCalled();
    } finally {
      global.fetch = realFetch;
    }
  });

  it('moves keyboard focus into the dialog when it opens', () => {
    render(<ImportResumeModal isOpen onClose={vi.fn()} onImport={vi.fn()} />);

    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
  });
});
