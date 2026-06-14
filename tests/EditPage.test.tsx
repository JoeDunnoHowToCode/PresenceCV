import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import EditPage from '../src/pages/EditPage';
import { useAuth } from '../src/contexts/AuthContext';
import { useResume } from '../src/hooks/useResume';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../src/hooks/useResume', () => ({
  useResume: vi.fn()
}));

vi.mock('../src/components/ImportResumeModal', () => ({
  ImportResumeModal: () => null
}));

vi.mock('../src/pages/ViewPage', () => ({
  default: () => null
}));

describe('EditPage - Security Fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_ADMIN_UID', 'admin_123');
    
    (useResume as any).mockReturnValue({
      appState: { profiles: { 'main': { id: 'main', name: 'Main Resume', data: {} } }, activeProfileId: 'main' },
      data: { blocks: {}, blockOrder: [] },
      switchProfile: vi.fn()
    });
  });

  it('hides Restore Backup button for normal users', () => {
    (useAuth as any).mockReturnValue({ user: { uid: 'normal_user' } });
    render(
      <BrowserRouter>
        <EditPage />
      </BrowserRouter>
    );
    expect(screen.queryByText(/Restore Backup/i)).not.toBeInTheDocument();
  });

  it('shows Restore Backup button for admin user', () => {
    (useAuth as any).mockReturnValue({ user: { uid: 'admin_123' } });
    render(
      <BrowserRouter>
        <EditPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Restore Backup/i)).toBeInTheDocument();
  });
});
