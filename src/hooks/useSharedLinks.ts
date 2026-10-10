// The signed-in user's snapshot links (from their private ownership records) and how to revoke them.
import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
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

  return { links };
}
