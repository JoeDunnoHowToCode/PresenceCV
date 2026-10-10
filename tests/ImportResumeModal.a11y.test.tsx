import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
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
});
