/* eslint-disable react-hooks/refs -- Intentional: appStateRef is synced during render/initializer to avoid stale closures (documented pattern) */
/**
 * useResume.ts — Central Resume State Management Hook
 *
 * This is the MOST IMPORTANT file in the project. It manages the entire
 * resume editing state, including multi-profile support, persistence
 * (localStorage + Firestore), and all CRUD operations.
 *
 * Architecture:
 * - AppState: { activeProfileId, profiles: Record<string, ProfileMeta> }
 * - Each ProfileMeta contains a ResumeData with profile info, blocks, and settings.
 * - State is initialized from localStorage for instant display, then overridden
 *   by Firestore data once auth resolves (prevents flash of stale content).
 *
 * Sync Strategy:
 * - On auth state change: reads from Firestore users/{uid}/userState/state
 * - On state change: immediate localStorage write + debounced (1.5s) Firestore write
 * - Race condition guard: `isRemoteReady` ref prevents writing local data to
 *   Firestore before the initial auth check completes
 *
 * Sanitization:
 * - All string inputs are sanitized (HTML script/iframe tags stripped, length capped)
 * - Base64 data URLs for photos are allowed through unmodified
 *
 * Key Exports:
 * - useResume(): Returns data + 25+ mutation functions + loading state
 * - ProfileMeta, AppState: Type interfaces for the state shape
 *
 * Consumed by: EditPage.tsx (primary), ViewPage.tsx (read-only)
 * Depends on: firebase.ts, defaultResume.ts, types.ts
 * Firestore: users/{uid}/userState/state (read + write)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { ResumeData } from '../types';
import { DEFAULT_RESUME } from '../data/defaultResume';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ParsedResumeSchema } from '../types';

const APP_STORAGE_KEY = 'elegant_resume_app_data';
const OLD_STORAGE_KEY = 'elegant_resume_data';

// Module-level cache to prevent re-fetching stale data from Firestore during client-side navigation
const fetchedUids = new Set<string>();

export interface ProfileMeta {
  id: string;
  name: string;
  data: ResumeData;
}

export interface AppState {
  activeProfileId: string;
  profiles: Record<string, ProfileMeta>;
  updatedAt?: number;
}

export function useResume() {
  const sanitizeHtml = (str: string, maxLength: number = 2000) => {
    if (typeof str !== 'string') return str;
    if (str.startsWith('data:image/')) return str; // Allow full data URLs
    const sanitized = str.replace(/<\/?(script|iframe|object|embed)[^>]*>/gi, '');
    return sanitized.substring(0, maxLength);
  };

  const sanitizeObject = <T>(obj: T): T => {
    if (typeof obj === 'string') return sanitizeHtml(obj) as any;
    if (Array.isArray(obj)) return (obj as any[]).map(sanitizeObject) as any;
    if (typeof obj === 'object' && obj !== null) {
      const newObj: any = {};
      for (const [key, value] of Object.entries(obj)) {
        newObj[key] = sanitizeObject(value);
      }
      return newObj as T;
    }
    return obj;
  };
  const [loading, setLoading] = useState(true);
  const appStateRef = useRef<AppState | null>(null);

  const [appState, setAppState] = useState<AppState>(() => {
    // Initial local load to show something quickly before Firestore syncs
    const savedApp = localStorage.getItem(APP_STORAGE_KEY);
    if (savedApp) {
      try {
        const parsed = JSON.parse(savedApp);
        if (parsed.activeProfileId && parsed.profiles) {
          appStateRef.current = parsed;
          return parsed;
        }
      } catch {
        // ignore
      }
    }
    const defaultState = {
      activeProfileId: 'main',
      profiles: {
        'main': { id: 'main', name: 'Main profile', data: DEFAULT_RESUME }
      }
    };
     
    appStateRef.current = defaultState;
    return defaultState;
  });

  const isInitialMount = useRef(true);
  // Using a ref to track if remote initialization has settled (either loaded or confirmed no auth)
  const isRemoteReady = useRef(false);

  // 1. Sync from Firestore on auth state change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!fetchedUids.has(user.uid)) {
          try {
            const docRef = doc(db, 'users', user.uid, 'userState', 'state');
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              const remoteData = snap.data();
              if (remoteData.activeProfileId && remoteData.profiles) {
                setAppState(remoteData as AppState);
                appStateRef.current = remoteData as AppState;
                localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(remoteData));
              }
            }
            fetchedUids.add(user.uid);
          } catch (error) {
            console.error("Failed to load user state from Firestore:", error);
          }
        }
      }
      // Regardless of logged in or logged out, the first resolution marks remote as "ready"
      // to avoid race conditions overriding remote data with empty local data on mount.
      isRemoteReady.current = true;
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Sync to local storage & Firestore on data change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(appState));

    // Do NOT push local state to firestore if we haven't resolved our initial auth check yet!
    if (!isRemoteReady.current) {
      return;
    }

    const syncToFirestore = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid, 'userState', 'state');
          // Include updatedAt to handle conflicts and future-proofing
          await setDoc(docRef, {
             ...appState,
             updatedAt: Date.now()
          });
        } catch (error) {
          console.error("Failed to save state to Firestore:", error);
        }
      }
    };

    const timeoutId = setTimeout(syncToFirestore, 1500); // 1.5s debounce
    return () => clearTimeout(timeoutId);
  }, [appState]);

  // 結構性變更（profile 刪除、block 重排）使用 transaction 防止多裝置/多 tab 覆蓋
  const syncStructuralChange = useCallback(async (newAppState: AppState) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid, 'userState', 'state');
      await runTransaction(db, async (t) => {
        const snap = await t.get(docRef);
        const remote = snap.data() as AppState | undefined;
        // 若遠端 updatedAt 較新，合併而非直接覆蓋（避免多裝置資料遺失）
        if (remote && typeof remote.updatedAt === 'number' && remote.updatedAt > Date.now()) {
          const merged: AppState = {
            activeProfileId: newAppState.activeProfileId,
            profiles: { ...remote.profiles, ...newAppState.profiles }
          };
          t.set(docRef, { ...merged, updatedAt: Date.now() });
        } else {
          t.set(docRef, { ...newAppState, updatedAt: Date.now() });
        }
      });
    } catch (error) {
      console.error("Failed to sync structural change to Firestore:", error);
    }
  }, []);

  const data = appState.profiles[appState.activeProfileId]?.data || DEFAULT_RESUME;

  const updateProfileData = useCallback( (updater: (prev: ResumeData) => ResumeData) => {
    setAppState(prev => {
      const activeData = prev.profiles[prev.activeProfileId].data;
      const updatedData = sanitizeObject(updater(activeData));
      const next = {
        ...prev,
        profiles: {
          ...prev.profiles,
          [prev.activeProfileId]: {
            ...prev.profiles[prev.activeProfileId],
            data: updatedData
          }
        }
      };
      appStateRef.current = next;
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const setData = updateProfileData;

  const switchProfile = useCallback( (id: string) => {
    setAppState(prev => {
      if (prev.profiles[id]) {
        const next = { ...prev, activeProfileId: id };
        appStateRef.current = next;
        return next;
      }
      return prev;
    });
  }, []);

  const importResumeProfile = useCallback( async (name: string, rawData: unknown) => {

    const newId = `profile-${Date.now()}`;
    const mainData = appState.profiles['main']?.data || DEFAULT_RESUME;
    
    // Apply Zod Validation
    const parsedData = ParsedResumeSchema.parse(rawData);

    // Extract and format contact items
    const rawContactItems = parsedData.contactItems || [];
    const formattedContactItems = rawContactItems.map((item) => {
      const textVal = (item.text || '').trim();
      let finalUrl = (item.url || '').trim();
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // Allow +, digits, spaces, hyphens, and parentheses, minimum 7 chars long for a phone number
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;

      // If AI forgot to provide URL but provided text, let's try to infer it
      if (!finalUrl && textVal) {
        if (emailRegex.test(textVal)) {
          finalUrl = `mailto:${textVal}`;
        } else if (phoneRegex.test(textVal) && textVal.replace(/\D/g, '').length >= 7) {
          finalUrl = `tel:${textVal.replace(/[\s\-()]/g, '')}`;
        } else if (textVal.toLowerCase().includes('linkedin.com') || textVal.toLowerCase().includes('github.com')) {
          finalUrl = textVal.startsWith('http') ? textVal : `https://${textVal}`;
        }
      } else if (finalUrl) {
         // Auto-prefix existing URLs if missing
         if (emailRegex.test(finalUrl) && !finalUrl.toLowerCase().startsWith('mailto:')) {
           finalUrl = `mailto:${finalUrl}`;
         } else if (phoneRegex.test(finalUrl) && finalUrl.replace(/\D/g, '').length >= 7 && !finalUrl.toLowerCase().startsWith('tel:')) {
           finalUrl = `tel:${finalUrl.replace(/[\s\-()]/g, '')}`;
         }
      }
      
      return {
        ...item,
        url: finalUrl,
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36)
      };
    });

    // Fallback: forcefully add email from profile if missing
    if (parsedData.profile?.email && !formattedContactItems.find((c: any) => c.text.includes(parsedData.profile.email))) {
        formattedContactItems.push({
            id: `c-${Date.now()}-em`,
            icon: 'Mail',
            text: parsedData.profile.email,
            url: `mailto:${parsedData.profile.email}`
        });
    }

    // Create new data starting from mainData defaults but with imported content
    const newData: ResumeData = {
        ...mainData,
        profile: {
            ...mainData.profile,
            ...(parsedData.profile || {}),
            contactItems: formattedContactItems 
        },
        blocks: {},
        blockOrder: []
    };
    // Ensure the imported profile gets its own unique live link if shared
    delete newData.liveId;
    delete newData.updateToken;

    if (parsedData.experience && parsedData.experience.length > 0) {
        const bId = `exp-${Date.now()}`;
        newData.blocks[bId] = {
            id: bId,
            type: 'list',
            title: 'Experience',
            items: parsedData.experience.map((i) => ({ title: i.title || '', subtitle: i.subtitle || '', period: i.period || '', description: i.description || '', ...i, id: Math.random().toString(36).substr(2, 9) }))
        };
        newData.blockOrder.push(bId);
    }
    
    if (parsedData.education && parsedData.education.length > 0) {
        const bId = `edu-${Date.now()}`;
        newData.blocks[bId] = {
            id: bId,
            type: 'list',
            title: 'Education',
            items: parsedData.education.map((i) => ({ title: i.title || '', subtitle: i.subtitle || '', period: i.period || '', description: i.description || '', ...i, id: Math.random().toString(36).substr(2, 9) }))
        };
        newData.blockOrder.push(bId);
    }
    
    if (parsedData.skills && parsedData.skills.length > 0) {
        const bId = `skills-${Date.now()}`;
        newData.blocks[bId] = {
            id: bId,
            type: 'tags',
            title: 'Skills',
            items: parsedData.skills.map((t) => ({ id: Math.random().toString(36).substr(2, 9), text: t }))
        };
        newData.blockOrder.push(bId);
    }

    setAppState(prev => ({
        activeProfileId: newId,
        profiles: {
            ...prev.profiles,
            [newId]: { id: newId, name, data: sanitizeObject(newData) }
        }
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, [appState]);


  const createProfile = useCallback( async (name: string) => {

    // Clone the active profile, not strictly 'main', to prevent crashes if main was deleted
    const activeProfileData = appState.profiles[appState.activeProfileId]?.data || (Object.values(appState.profiles) as ProfileMeta[])[0]?.data || DEFAULT_RESUME;
    const newId = `profile-${Date.now()}`;
    const newData = JSON.parse(JSON.stringify(activeProfileData));
    
    // IMPORTANT: Delete live share data so the new profile is independent
    delete newData.liveId;
    delete newData.updateToken;
    
    setAppState(prev => ({
      activeProfileId: newId,
      profiles: {
        ...prev.profiles,
        [newId]: { id: newId, name, data: newData }
      }
    }));
   
  }, [appState]);


  const renameProfile = useCallback( (id: string, newName: string) => {
    setAppState(prev => ({
      ...prev,
      profiles: {
        ...prev.profiles,
        [id]: { ...prev.profiles[id], name: newName }
      }
    }));
  }, []);


  const deleteProfile = useCallback( (id: string) => {
    setAppState(prev => {
      if (Object.keys(prev.profiles).length <= 1) return prev;
      const newProfiles = { ...prev.profiles };
      delete newProfiles[id];
      const newActiveId = prev.activeProfileId === id ? Object.keys(newProfiles)[0] : prev.activeProfileId;
      const next = {
        activeProfileId: newActiveId,
        profiles: newProfiles
      };
      appStateRef.current = next;
      // 結構性變更：使用 transaction 同步至 Firestore
      if (isRemoteReady.current) {
        syncStructuralChange(next);
      }
      return next;
    });
  }, [syncStructuralChange]);


  const toggleAnimation = useCallback( () => {
    setData(prev => ({ ...prev, enableAnimation: !prev.enableAnimation }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const updateProfile = useCallback( <K extends keyof ResumeData['profile']>(field: K, value: ResumeData['profile'][K]) => {
    setData(prev => ({
      ...prev,
      profile: { ...prev.profile, [field]: value }
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const addContactItem = useCallback( () => {
    setData(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        contactItems: [
          ...(prev.profile.contactItems || []),
          { id: `c-${Date.now()}`, icon: 'Link', text: 'New Link', url: '' }
        ]
      }
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const updateContactItem = useCallback( (id: string, field: string, value: string) => {
    setData(prev => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;

      return {
        ...prev,
        profile: {
          ...prev.profile,
          contactItems: prev.profile.contactItems?.map(item => {
            if (item.id !== id) return item;

            const updatedItem = { ...item, [field]: value };

            // Handle typing in the URL field directly
            if (field === 'url') {
              if (emailRegex.test(value.trim()) && !value.toLowerCase().startsWith('mailto:')) {
                updatedItem.url = `mailto:${value.trim()}`;
              } else if (phoneRegex.test(value.trim()) && value.replace(/\D/g, '').length >= 7 && !value.toLowerCase().startsWith('tel:')) {
                updatedItem.url = `tel:${value.trim().replace(/[\s\-()]/g, '')}`;
              }
            }

            // Handle typing in the Text field
            if (field === 'text') {
              const currentUrl = (item.url || '').toLowerCase();
              const oldEmailAutoUrl = `mailto:${item.text.trim()}`.toLowerCase();
              const oldPhoneAutoUrl = `tel:${item.text.replace(/[\s\-()]/g, '')}`.toLowerCase();
              
              if (emailRegex.test(value.trim())) {
                if (!currentUrl || currentUrl === oldEmailAutoUrl || currentUrl === oldPhoneAutoUrl) {
                  updatedItem.url = `mailto:${value.trim()}`;
                }
              } else if (phoneRegex.test(value.trim()) && value.replace(/\D/g, '').length >= 7) {
                 if (!currentUrl || currentUrl === oldPhoneAutoUrl || currentUrl === oldEmailAutoUrl) {
                  updatedItem.url = `tel:${value.trim().replace(/[\s\-()]/g, '')}`;
                }
              }
            }

            return updatedItem;
          })
        }
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const removeContactItem = useCallback( (id: string) => {
    setData(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        contactItems: prev.profile.contactItems?.filter(item => item.id !== id)
      }
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const updateThemeColor = useCallback( (color: string) => {
    setData(prev => ({ ...prev, themeColor: color }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const reorderBlocks = useCallback( (startIndex: number, endIndex: number) => {
    setAppState(prev => {
      const newOrder = Array.from(prev.blockOrder);
      const [removed] = newOrder.splice(startIndex, 1);
      newOrder.splice(endIndex, 0, removed);
      const next = { ...prev, blockOrder: newOrder };
      appStateRef.current = next;
      // 結構性變更：使用 transaction 同步至 Firestore
      if (isRemoteReady.current) {
        syncStructuralChange(next);
      }
      return next;
    });
   
  }, [syncStructuralChange]);


  const reorderListItems = useCallback( (blockId: string, startIndex: number, endIndex: number) => {
    setData(prev => {
      const block = prev.blocks[blockId];
      if (!block || block.type !== 'list') return prev;
      const newItems = Array.from(block.items);
      const [removed] = newItems.splice(startIndex, 1);
      newItems.splice(endIndex, 0, removed);
      return {
        ...prev,
        blocks: {
          ...prev.blocks,
          [blockId]: { ...block, items: newItems }
        }
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const reorderTagItems = useCallback( (blockId: string, startIndex: number, endIndex: number) => {
    setData(prev => {
      const block = prev.blocks[blockId];
      if (!block || block.type !== 'tags') return prev;
      const newItems = Array.from(block.items);
      const [removed] = newItems.splice(startIndex, 1);
      newItems.splice(endIndex, 0, removed);
      return {
        ...prev,
        blocks: {
          ...prev.blocks,
          [blockId]: { ...block, items: newItems }
        }
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const updateBlockTitle = useCallback( (blockId: string, title: string) => {
    setData(prev => ({
      ...prev,
      blocks: {
        ...prev.blocks,
        [blockId]: { ...prev.blocks[blockId], title }
      }
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const updateBlockIcon = useCallback( (blockId: string, icon: string) => {
    setData(prev => ({
      ...prev,
      blocks: {
        ...prev.blocks,
        [blockId]: { ...prev.blocks[blockId], icon }
      }
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const addListItem = useCallback( (blockId: string) => {
    setData(prev => {
      const block = prev.blocks[blockId];
      const newItem = { id: Math.random().toString(36).substr(2, 9), title: '', subtitle: '', period: '', description: '' };
      return {
        ...prev,
        blocks: {
          ...prev.blocks,
          [blockId]: { ...block, items: [...block.items, newItem] }
        }
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const updateListItem = useCallback( (blockId: string, itemId: string, field: string, value: string) => {
    setData(prev => {
      const block = prev.blocks[blockId];
      return {
        ...prev,
        blocks: {
          ...prev.blocks,
          [blockId]: {
            ...block,
            items: (block.items as import('../types').ListItem[]).map(item => item.id === itemId ? { ...item, [field]: value } : item)
          }
        }
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const removeListItem = useCallback( (blockId: string, itemId: string) => {
    setData(prev => {
      const block = prev.blocks[blockId];
      return {
        ...prev,
        blocks: {
          ...prev.blocks,
          [blockId]: {
            ...block,
            items: (block.items as import('../types').ListItem[]).filter(item => item.id !== itemId)
          }
        }
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const addTagItem = useCallback( (blockId: string, text: string) => {
    if (!text.trim()) return;
    setData(prev => {
      const block = prev.blocks[blockId];
      const newItem = { id: Math.random().toString(36).substr(2, 9), text: text.trim() };
      return {
        ...prev,
        blocks: {
          ...prev.blocks,
          [blockId]: { ...block, items: [...block.items, newItem] }
        }
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const removeTagItem = useCallback( (blockId: string, itemId: string) => {
    setData(prev => {
      const block = prev.blocks[blockId];
      return {
        ...prev,
        blocks: {
          ...prev.blocks,
          [blockId]: {
            ...block,
            items: (block.items as import('../types').TagItem[]).filter(item => item.id !== itemId)
          }
        }
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const updateTagItem = useCallback( (blockId: string, itemId: string, text: string) => {
    setData(prev => {
      const block = prev.blocks[blockId];
      return {
        ...prev,
        blocks: {
          ...prev.blocks,
          [blockId]: {
            ...block,
            items: (block.items as import('../types').TagItem[]).map(item => item.id === itemId ? { ...item, text } : item)
          }
        }
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const addBlock = useCallback( (type: 'list' | 'tags') => {
    const id = `block-${Date.now()}`;
    setData(prev => ({
      ...prev,
      blocks: {
        ...prev.blocks,
        [id]: {
          id,
          type,
          title: type === 'list' ? 'New List' : 'New Tag',
          items: []
        }
      },
      blockOrder: [...prev.blockOrder, id]
    }));
    return id;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const removeBlock = useCallback( (blockId: string) => {
    setData(prev => {
      const newBlocks = { ...prev.blocks };
      delete newBlocks[blockId];
      return {
        ...prev,
        blocks: newBlocks,
        blockOrder: prev.blockOrder.filter(id => id !== blockId)
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected behavior to avoid stale closures and infinite loops
  }, []);


  const resetToDefault = useCallback( () => {
    localStorage.removeItem(APP_STORAGE_KEY);
    localStorage.removeItem(OLD_STORAGE_KEY);
    setAppState({
      activeProfileId: 'main',
      profiles: {
        'main': { id: 'main', name: 'Main profile', data: DEFAULT_RESUME }
      }
    });
  }, []);



  return {
    loading,
    appState,
    switchProfile,
    createProfile,
    importResumeProfile,
    renameProfile,
    deleteProfile,
    data,
    updateProfile,
    updateThemeColor,
    toggleAnimation,
    reorderBlocks,
    reorderListItems,
    reorderTagItems,
    updateBlockTitle,
    updateBlockIcon,
    addListItem,
    updateListItem,
    removeListItem,
    addTagItem,
    removeTagItem,
    updateTagItem,
    addBlock,
    removeBlock,
    addContactItem,
    updateContactItem,
    removeContactItem,
    updateProfileData,
    resetToDefault,
    getCurrentData: () => {
      if (appStateRef.current) {
        return appStateRef.current.profiles[appStateRef.current.activeProfileId]?.data || data;
      }
      return data;
    }
  };
}
