import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act, screen } from '@testing-library/react';
import { NoticeProvider } from '../src/contexts/NoticeContext';
import { ParsedResumeSchema } from '../src/types';
import { useResume } from '../src/hooks/useResume';
import * as firestore from 'firebase/firestore';

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    doc: vi.fn(),
    getDoc: vi.fn().mockResolvedValue({
      exists: () => false,
      data: () => null
    }),
    setDoc: vi.fn(),
    runTransaction: vi.fn(),
  };
});

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, cb) => {
    cb({ uid: 'test-user-123' });
    return () => {};
  })
}));

vi.mock('../src/lib/firebase', () => ({
  auth: { currentUser: { uid: 'test-user-123' } },
  db: {}
}));

describe('useResume Zod Validation', () => {
  it('parses perfect data correctly', () => {
    const data = {
      profile: { name: 'John Doe', email: 'john@example.com' },
      contactItems: [{ icon: 'Mail', text: 'john@example.com', url: 'mailto:john@example.com' }],
      experience: [],
      education: [],
      skills: ['React']
    };
    const parsed = ParsedResumeSchema.parse(data);
    expect(parsed.profile.name).toBe('John Doe');
    expect(parsed.contactItems?.length).toBe(1);
    expect(parsed.skills?.[0]).toBe('React');
  });

  it('recovers from missing or null fields using .catch()', () => {
    const badData = {
      profile: { name: 'Missing Info' },
      contactItems: null,
      experience: null,
      skills: null
    };
    const parsed = ParsedResumeSchema.parse(badData);
    expect(parsed.profile.name).toBe('Missing Info');
    expect(parsed.contactItems).toEqual([]);
    expect(parsed.experience).toEqual([]);
    expect(parsed.skills).toEqual([]);
    expect(parsed.profile.title).toBe('');
  });
});

describe('useResume Transaction Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('syncStructuralChange correctly merges when remote is newer', async () => {
    // We will simulate the transaction logic by capturing the callback passed to runTransaction
    // and manually invoking it with a mock transaction object.
    
    // Define a mock transaction
    const mockTransaction = {
      get: vi.fn(),
      set: vi.fn()
    };

    // Setup runTransaction to immediately invoke the callback
    vi.mocked(firestore.runTransaction).mockImplementation(async (db, updateFunction) => {
      await updateFunction(mockTransaction as any);
    });

    const { result } = renderHook(() => useResume());
    
    // Simulate remote data being newer
    const remoteData = {
      updatedAt: Date.now() + 100000,
      activeProfileId: 'main',
      profiles: {
        'remote_1': { id: 'remote_1', data: {} }
      }
    };
    mockTransaction.get.mockResolvedValue({
      data: () => remoteData
    });

    // Fire deleteProfile to trigger syncStructuralChange
    await act(async () => {
      result.current.createProfile('test');
    });

    const newProfiles = Object.keys(result.current.appState.profiles);
    const newProfileId = newProfiles.find(id => id !== 'main');

    mockTransaction.set.mockClear();

    await act(async () => {
      result.current.deleteProfile(newProfileId!);
    });

    expect(mockTransaction.set).toHaveBeenCalled();
    const setArgs = mockTransaction.set.mock.calls[0];
    const savedData = setArgs[1];

    // Since remote was newer, we expect 'remote_1' to be merged with local profiles
    expect(savedData.profiles).toHaveProperty('remote_1');
    // Local 'main' should still be there
    expect(savedData.profiles).toHaveProperty('main');
  });

  it('syncStructuralChange overwrites when remote is older', async () => {
    const mockTransaction = {
      get: vi.fn(),
      set: vi.fn()
    };

    vi.mocked(firestore.runTransaction).mockImplementation(async (db, updateFunction) => {
      await updateFunction(mockTransaction as any);
    });

    const { result } = renderHook(() => useResume());
    
    // Simulate remote data being older
    const remoteData = {
      updatedAt: Date.now() - 100000,
      activeProfileId: 'main',
      profiles: {
        'remote_1': { id: 'remote_1', data: {} } // should be lost
      }
    };
    mockTransaction.get.mockResolvedValue({
      data: () => remoteData
    });

    await act(async () => {
      result.current.createProfile('test2');
    });

    const newProfiles = Object.keys(result.current.appState.profiles);
    const newProfileId = newProfiles.find(id => id !== 'main')!;
    
    mockTransaction.set.mockClear();

    await act(async () => {
      result.current.deleteProfile(newProfileId);
    });

    expect(mockTransaction.set).toHaveBeenCalled();
    const setArgs = mockTransaction.set.mock.calls[0];
    const savedData = setArgs[1];

    // Since remote was older, it should just overwrite with local state which only has 'main' now.
    expect(savedData.profiles).not.toHaveProperty('remote_1');
    expect(savedData.profiles).toHaveProperty('main');
  });
});

describe('useResume reorderProfiles Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('reorders profiles correctly in appState.profileOrder', async () => {
    const { result } = renderHook(() => useResume());

    await act(async () => {
      await result.current.createProfile('Profile B');
    });
    await new Promise(r => setTimeout(r, 20));
    await act(async () => {
      await result.current.createProfile('Profile C');
    });

    const profiles = result.current.appState.profiles;
    const ids = Object.keys(profiles);
    expect(ids.length).toBe(3);

    // Initial order should contain all 3 ids
    expect(result.current.appState.profileOrder).toBeDefined();
    expect(result.current.appState.profileOrder).toHaveLength(3);

    const firstId = result.current.appState.profileOrder![0];
    const secondId = result.current.appState.profileOrder![1];

    // Reorder: move index 0 to index 1
    await act(async () => {
      result.current.reorderProfiles(0, 1);
    });

    expect(result.current.appState.profileOrder![0]).toBe(secondId);
    expect(result.current.appState.profileOrder![1]).toBe(firstId);
  });
});

describe('useResume autosave', () => {
  const withNotices = ({ children }: { children: React.ReactNode }) => React.createElement(NoticeProvider, null, children);

  it('shows an error notice when the autosave to Firestore fails', async () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      vi.mocked(firestore.setDoc).mockRejectedValueOnce(new Error('Document exceeds the 1 MiB limit'));
      const { result } = renderHook(() => useResume(), { wrapper: withNotices });
      await act(async () => {}); // let the auth check finish so autosave is allowed

      act(() => { result.current.updateProfile('name', 'Jane Doe'); });
      await act(async () => { await vi.advanceTimersByTimeAsync(1500); });

      expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save your changes to the cloud.");
    } finally {
      consoleSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('writes a pending autosave as soon as the page is hidden, and only once', async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useResume());
      await act(async () => {});
      vi.mocked(firestore.setDoc).mockClear();

      act(() => { result.current.updateProfile('name', 'Jane Doe'); });
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });

      expect(firestore.setDoc).toHaveBeenCalledTimes(1);

      await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
      expect(firestore.setDoc).toHaveBeenCalledTimes(1);
    } finally {
      delete (document as unknown as { visibilityState?: string }).visibilityState;
      vi.useRealTimers();
    }
  });
});
