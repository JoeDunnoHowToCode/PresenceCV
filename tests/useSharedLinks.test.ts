import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as firestore from 'firebase/firestore';
import { useSharedLinks } from '../src/hooks/useSharedLinks';

vi.mock('../src/lib/firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...path: string[]) => ({ path: path.join('/') })),
  doc: vi.fn((_db, ...path: string[]) => ({ path: path.join('/') })),
  onSnapshot: vi.fn(),
  writeBatch: vi.fn(),
}));

const record = (id: string, createdAt: number, profileName: string) => ({ id, data: () => ({ createdAt, profileName }) });

describe('useSharedLinks', () => {
  beforeEach(() => {
    vi.mocked(firestore.onSnapshot).mockReset();
  });

  it("lists the user's snapshot links, newest first", () => {
    vi.mocked(firestore.onSnapshot).mockImplementation(((_ref: unknown, onNext: (snap: unknown) => void) => {
      onNext({ docs: [record('old', 100, 'Main'), record('new', 300, 'Design CV'), record('mid', 200, 'Main')] });
      return () => {};
    }) as never);

    const { result } = renderHook(() => useSharedLinks('u1'));

    expect(result.current.links.map((link) => link.id)).toEqual(['new', 'mid', 'old']);
    expect(result.current.links[0]).toEqual({ id: 'new', createdAt: 300, profileName: 'Design CV' });
  });

  it('revokes a snapshot by deleting it and its ownership record in one batch', async () => {
    vi.mocked(firestore.onSnapshot).mockImplementation((() => () => {}) as never);
    const batch = { delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(firestore.writeBatch).mockReturnValue(batch as never);
    const { result } = renderHook(() => useSharedLinks('u1'));

    await act(async () => { await result.current.revokeSnapshot('snap_1'); });

    expect(batch.delete.mock.calls.map(([ref]) => (ref as { path: string }).path)).toEqual(['sharedResumes/snap_1', 'users/u1/sharedLinks/snap_1']);
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });
});
