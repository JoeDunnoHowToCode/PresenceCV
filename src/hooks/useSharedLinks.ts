// The signed-in user's snapshot links (from their private ownership records) and how to revoke them.
import { useCallback, useEffect, useState } from 'react';
import { collection, doc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface SharedLink {
  id: string;
  createdAt: number;
  profileName: string;
}

export function useSharedLinks(uid: string | undefined) {
  const [links, setLinks] = useState<SharedLink[]>([]);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(collection(db, 'users', uid, 'sharedLinks'), (snapshot) => {
      const next = snapshot.docs.map((record) => ({ id: record.id, ...(record.data() as Omit<SharedLink, 'id'>) }));
      setLinks(next.sort((a, b) => b.createdAt - a.createdAt));
    });
  }, [uid]);

  // One batch, so the public snapshot never outlives its ownership record (or vice versa).
  const revokeSnapshot = useCallback(async (snapshotId: string) => {
    if (!uid) return;
    const batch = writeBatch(db);
    batch.delete(doc(db, 'sharedResumes', snapshotId));
    batch.delete(doc(db, 'users', uid, 'sharedLinks', snapshotId));
    await batch.commit();
  }, [uid]);

  return { links, revokeSnapshot };
}
