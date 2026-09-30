import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EditorPage from '../src/pages/EditorPage';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContext from '../src/contexts/AuthContext';
import * as useResume from '../src/hooks/useResume';


// Mock dependencies
vi.mock('../src/hooks/useResume', () => ({
  useResume: vi.fn()
}));

vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../src/lib/firebase', () => ({
  auth: {},
  db: {}
}));


const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});

describe('Editor UI limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMock = (isPro: boolean, isAdmin: boolean, profileCount: number) => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { uid: '123' } as any,
      isPro,
      isAdmin,
      loading: false,
      isNewUser: false,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn()
    });

    const profiles = {};
    for (let i = 0; i < profileCount; i++) {
      profiles[`id_${i}`] = { id: `id_${i}`, name: `Profile ${i}` };
    }

    vi.mocked(useResume.useResume).mockReturnValue({
      appState: { profiles, activeProfileId: 'id_0' },
      data: { blocks: {}, blockOrder: [], profile: {} },
      activeTab: 'profile',
      handleUpdate: vi.fn(),
      createNewProfile: vi.fn(),
      deleteProfile: vi.fn(),
      setActiveProfile: vi.fn(),
      addBlock: vi.fn(),
      removeBlock: vi.fn(),
      updateBlock: vi.fn(),
      reorderBlocks: vi.fn(),
      isSyncing: false
    } as any);
  };

  it('denies opening import modal if !isPro and !isAdmin and count >= 3', () => {
    setupMock(false, false, 3);

    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    const uploadButton = screen.getByText(/Upload Resume/i);
    fireEvent.click(uploadButton);

    expect(mockAlert).toHaveBeenCalledWith('You have reached the maximum number of 3 resumes for non-pro users. Please upgrade to Pro or delete an existing resume to import a new one.');
  });

  it('allows opening import modal if isPro and count >= 3', () => {
    setupMock(true, false, 3);

    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    const uploadButton = screen.getByText(/Upload Resume/i);
    fireEvent.click(uploadButton);

    expect(mockAlert).not.toHaveBeenCalled();
    // In EditorPage, the modal open state is internal. We can just verify no alert.
  });

  it('allows opening import modal if isAdmin and count >= 3', () => {
    setupMock(false, true, 3);

    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    const uploadButton = screen.getByText(/Upload Resume/i);
    fireEvent.click(uploadButton);

    expect(mockAlert).not.toHaveBeenCalled();
  });
});

describe('Editor postMessage origin check', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { uid: '123' } as any,
      isPro: true,
      isAdmin: false,
      loading: false,
      isNewUser: false,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn()
    });

    vi.mocked(useResume.useResume).mockReturnValue({
      appState: { profiles: { id_0: { id: 'id_0', name: 'Profile 0' } }, activeProfileId: 'id_0' },
      data: { blocks: {}, blockOrder: [], profile: {} },
      activeTab: 'profile',
      handleUpdate: vi.fn(),
      createNewProfile: vi.fn(),
      deleteProfile: vi.fn(),
      setActiveProfile: vi.fn(),
      addBlock: vi.fn(),
      removeBlock: vi.fn(),
      updateBlock: vi.fn(),
      reorderBlocks: vi.fn(),
      isSyncing: false
    } as any);
  });

  const dispatchRequest = (origin: string, source: Window) => {
    const event = new MessageEvent('message', { data: { type: 'RESUME_DATA_REQUEST' } });
    Object.defineProperty(event, 'origin', { value: origin });
    Object.defineProperty(event, 'source', { value: source });
    window.dispatchEvent(event);
  };

  it('ignores RESUME_DATA_REQUEST from a foreign origin', () => {
    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    const attacker = { postMessage: vi.fn() } as unknown as Window;
    dispatchRequest('https://evil.example', attacker);

    expect(attacker.postMessage).not.toHaveBeenCalled();
  });

  it('replies to RESUME_DATA_REQUEST from the same origin', () => {
    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    const printWindow = { postMessage: vi.fn() } as unknown as Window;
    dispatchRequest(window.location.origin, printWindow);

    expect(printWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'RESUME_DATA_SYNC' }),
      window.location.origin
    );
  });
});
