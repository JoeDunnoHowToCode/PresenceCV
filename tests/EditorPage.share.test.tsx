import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as firestore from 'firebase/firestore';
import EditorPage from '../src/pages/EditorPage';
import * as AuthContext from '../src/contexts/AuthContext';
import * as useResume from '../src/hooks/useResume';
import { DEFAULT_RESUME } from '../src/data/defaultResume';

vi.mock('../src/hooks/useResume', () => ({ useResume: vi.fn() }));
vi.mock('../src/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/lib/firebase', () => ({ auth: {}, db: {} }));

// Refs carry their path; doc(collectionRef) gets the auto id "snap_new".
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...path: string[]) => ({ path: path.join('/') })),
  doc: vi.fn((first: { path?: string }, ...path: string[]) =>
    path.length === 0 ? { id: 'snap_new', path: `${first.path}/snap_new` } : { id: path[path.length - 1], path: path.join('/') }),
  writeBatch: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'added' }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn(() => () => {}),
}));

const batch = { set: vi.fn(), delete: vi.fn(), commit: vi.fn() };
const updateProfileData = vi.fn();

const mockResume = (data: Record<string, unknown>) => new Proxy(
  {
    data,
    appState: { activeProfileId: 'main', profiles: { main: { id: 'main', name: 'Main', data } } },
    loading: false,
    isSyncing: false,
    getCurrentData: () => JSON.parse(JSON.stringify(data)),
    updateProfileData,
  } as Record<string | symbol, unknown>,
  { get: (target, key) => (key in target ? target[key] : vi.fn()) },
);

describe('EditorPage sharing', () => {
  beforeEach(() => {
    batch.set.mockReset(); batch.delete.mockReset(); batch.commit.mockReset().mockResolvedValue(undefined);
    updateProfileData.mockReset();
    vi.mocked(firestore.writeBatch).mockReturnValue(batch as never);
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { uid: 'u1' }, isPro: false, isAdmin: false, loading: false, isNewUser: false,
      signInWithGoogle: vi.fn(), signOut: vi.fn(),
    } as never);
  });

  it('writes the snapshot and its ownership record in one batch when Share opens', async () => {
    vi.mocked(useResume.useResume).mockReturnValue(mockResume({ ...DEFAULT_RESUME }) as never);
    render(<MemoryRouter><EditorPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));

    await waitFor(() => expect(batch.commit).toHaveBeenCalledTimes(1));
    const writes = batch.set.mock.calls.map(([ref, data]) => [(ref as { path: string }).path, data]);
    expect(writes.map(([path]) => path)).toEqual(['sharedResumes/snap_new', 'users/u1/sharedLinks/snap_new']);
    expect(writes[1][1]).toEqual({ createdAt: expect.any(Number), profileName: 'Main' });
  });

  it('stops the live link: clears it from the profile, then deletes the public document', async () => {
    vi.mocked(useResume.useResume).mockReturnValue(mockResume({ ...DEFAULT_RESUME, liveId: 'live_1', updateToken: 'token_1' }) as never);
    render(<MemoryRouter><EditorPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));

    fireEvent.click(await screen.findByRole('button', { name: 'Stop sharing the live link' }));

    await waitFor(() => expect(firestore.deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'liveResumes/live_1' })));
    const clearLiveLink = updateProfileData.mock.calls[0][0];
    expect(clearLiveLink({ name: 'Ada', liveId: 'live_1', updateToken: 'token_1' })).toEqual({ name: 'Ada' });
    // Cleared first: that cancels the pending auto-sync, which could otherwise re-create the document.
    expect(updateProfileData.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(firestore.deleteDoc).mock.invocationCallOrder[0]);
  });

  it('puts the live link back in the profile if deleting it fails, so the owner can retry', async () => {
    vi.mocked(firestore.deleteDoc).mockRejectedValueOnce(new Error('offline'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(useResume.useResume).mockReturnValue(mockResume({ ...DEFAULT_RESUME, liveId: 'live_1', updateToken: 'token_1' }) as never);
    render(<MemoryRouter><EditorPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));

    fireEvent.click(await screen.findByRole('button', { name: 'Stop sharing the live link' }));

    await waitFor(() => expect(updateProfileData).toHaveBeenCalledTimes(2));
    const restoreLiveLink = updateProfileData.mock.calls[1][0];
    expect(restoreLiveLink({ name: 'Ada' })).toEqual({ name: 'Ada', liveId: 'live_1', updateToken: 'token_1' });
    consoleSpy.mockRestore();
  });
});
