import React, { useState, useEffect, useRef, CSSProperties, useCallback } from 'react';
import { DragDropContext, DropResult, Droppable, Draggable } from '@hello-pangea/dnd';
import { useLocation, Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '../contexts/AuthContext';
import LogoutConfirmModal from '../components/LogoutConfirmModal';
import { useResume } from '../hooks/useResume';
import { ICONS, AVAILABLE_BLOCK_ICONS, THEME_COLORS, AVAILABLE_ICONS } from '../constants';
import * as LucideIcons from 'lucide-react';
import { ImportResumeModal } from '../components/ImportResumeModal';
import { copyTextToClipboard } from '../lib/utils';

import ProfileSwitcher from '../components/editor/ProfileSwitcher';
import ThemePicker from '../components/editor/ThemePicker';
import PhotoUploadCrop from '../components/editor/PhotoUploadCrop';
import InfoEditor from '../components/editor/InfoEditor';
import ListBlockEditor from '../components/editor/ListBlockEditor';
import TagsBlockEditor from '../components/editor/TagsBlockEditor';

import DesktopEditLayout from '../components/editor/DesktopEditLayout';
import MobileEditLayout from '../components/editor/MobileEditLayout';
import { EditorLayoutProps } from '../components/editor/EditorLayoutProps';

export default function EditPage() {
  useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const resume = useResume();
  const { 
    data,
    appState,
    loading,
    importResumeProfile,
   } = resume;

  const location = useLocation();

  const [activeTab, setActiveTab] = useState('info');
  const [direction, setDirection] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [openIconMenuId, setOpenIconMenuId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<string | null>(null);

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const allTabs = ['info', ...data.blockOrder];
  const lastSnapshotDataStr = useRef<string>('');

  useEffect(() => {
    if (location.state?.openImport) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsImportModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeElement = tabsContainerRef.current.querySelector('[data-active="true"]');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTab]);

  useEffect(() => {
    if (!allTabs.includes(activeTab)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab('info');
    }
  }, [data.blockOrder, activeTab]);

  const handleTabClick = useCallback((tabId: string) => {
    const currentIndex = allTabs.indexOf(activeTab);
    const newIndex = allTabs.indexOf(tabId);
    setDirection(newIndex > currentIndex ? 1 : -1);
    setActiveTab(tabId);
  }, [allTabs, activeTab]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, type } = result;

    if (type === 'tabs') {
      resume.reorderBlocks(source.index, destination.index);
    } else if (type === 'list-items') {
      resume.reorderListItems(source.droppableId, source.index, destination.index);
    } else if (type === 'tag-items') {
      resume.reorderTagItems(source.droppableId, source.index, destination.index);
    }
  }, [resume.reorderBlocks, resume.reorderListItems, resume.reorderTagItems]);

  const [isSharing, setIsSharing] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<'snapshot' | 'live' | null>(null);
  const [isInitializingLive, setIsInitializingLive] = useState(false);

  useEffect(() => {
    const handleRequest = (event: MessageEvent) => {
      if (event.data?.type === 'RESUME_DATA_REQUEST' && event.source) {
        (event.source as Window).postMessage({ type: 'RESUME_DATA_SYNC', data }, '*');
      }
    };
    window.addEventListener('message', handleRequest);
    return () => window.removeEventListener('message', handleRequest);
  }, [data]);

  const handleExportPDF = useCallback(() => {
    // Force flush any active debounced inputs
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setTimeout(() => {
      const profileData = resume.getCurrentData();
      localStorage.setItem('RESUME_PRINT_DATA', JSON.stringify(profileData));
      const printWindow = window.open('/view?print=true', '_blank');
      if (!printWindow) {
        alert("Please allow popups to generate the PDF.");
        return;
      }
      const intervalId = setInterval(() => {
        printWindow.postMessage({ type: 'RESUME_DATA_SYNC', data: profileData }, '*');
      }, 200);

      const handleAck = (event: MessageEvent) => {
        if (event.data?.type === 'RESUME_DATA_ACK') {
          clearInterval(intervalId);
          window.removeEventListener('message', handleAck);
        }
      };
      window.addEventListener('message', handleAck);

      setTimeout(() => {
        clearInterval(intervalId);
        window.removeEventListener('message', handleAck);
      }, 10000);
    }, 50);
  }, [appState, data]);

  useEffect(() => {
    if (data.liveId && data.updateToken) {
      const timeoutId = setTimeout(async () => {
        try {
          const { doc, setDoc } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          const safeData = JSON.parse(JSON.stringify(data));
          
          await setDoc(doc(db, 'liveResumes', data.liveId as string), {
            ...safeData,
            ownerUid: user?.uid,
            updatedAt: Date.now()
          }, { merge: false });
        } catch (err) {
          console.error("Auto-sync failed:", err);
        }
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [data, user?.uid]);

  const openShareModal = useCallback(async () => {
    // Force flush any active debounced inputs
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setCopiedSection(null);
    setIsShareModalOpen(true);
    
    // Use setTimeout to ensure the blur event has flushed global state before freezing profileData
    setTimeout(async () => {
      const profileData = resume.getCurrentData();
      const safeData = JSON.parse(JSON.stringify(profileData));
      delete safeData.liveId;
      delete safeData.updateToken;
      const currentDataStr = JSON.stringify(safeData);

      if (snapshotUrl && lastSnapshotDataStr.current === currentDataStr) {
        return;
      }

      setSnapshotUrl(null);
      setIsSharing(true);
      try {
        const { collection, addDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const docRef = await addDoc(collection(db, 'sharedResumes'), {
          ...safeData,
          createdAt: Date.now()
        });
        setSnapshotUrl(`${window.location.origin}/view?id=${docRef.id}`);
        lastSnapshotDataStr.current = currentDataStr;
      } catch (err) {
        console.error('Failed to pre-generate snapshot:', err);
      } finally {
        setIsSharing(false);
      }
    }, 50);
  }, [appState, data, snapshotUrl]);

  const ensureLiveLink = useCallback(async () => {
    const profileData = resume.getCurrentData();
    if (profileData.liveId) return;

    setIsInitializingLive(true);
    try {
      const safeData = JSON.parse(JSON.stringify(profileData));
      const updateToken = crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36);

      const { collection, addDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      const docRef = await addDoc(collection(db, 'liveResumes'), {
        ...safeData,
        updateToken,
        ownerUid: user?.uid,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      resume.updateProfileData(prev => ({
        ...prev,
        liveId: docRef.id,
        updateToken
      }));
    } catch (err) {
      console.error('Failed to create live link:', err);
    } finally {
      setIsInitializingLive(false);
    }
  }, [appState, data, resume.updateProfileData, user]);

  const handleCopyLink = useCallback(async (url: string, section: 'snapshot' | 'live') => {
    await copyTextToClipboard(url);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  }, []);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen relative flex items-center justify-center bg-bg" 
        style={{ '--theme-accent': THEME_COLORS[0] } as CSSProperties}
      >
        <div className="depth-bg animated" />
        <div className="bg-white p-8 rounded-2xl flex flex-col items-center gap-4 border border-[#eceae4] shadow-xl">
          <LucideIcons.Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-[#5f5f5d] text-xs uppercase tracking-widest font-medium">Loading your profiles...</p>
        </div>
      </div>
    );
  }

  const activeBlock = data.blocks[activeTab];

  const layoutProps: EditorLayoutProps = {
    ...resume,
    user, activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen,
    isMobile, openIconMenuId, setOpenIconMenuId, isSidebarCollapsed,
    setIsSidebarCollapsed, setProfileToDelete, setBlockToDelete,
    setIsLogoutModalOpen, openShareModal, isSharing, tabsContainerRef,
    handleTabClick, snapshotUrl, setSnapshotUrl, copiedSection, setCopiedSection, isInitializingLive,
    handleCopyLink, ensureLiveLink, handleExportPDF, direction, setDirection,
    isShareModalOpen, setIsShareModalOpen, blockToDelete, profileToDelete, setIsImportModalOpen, variants
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {isMobile ? (
        <MobileEditLayout {...layoutProps} />
      ) : (
        <DesktopEditLayout {...layoutProps} />
      )}

      <ImportResumeModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(parsedData) => {
          importResumeProfile(
            parsedData.profile?.name ? `${parsedData.profile.name}'s Imported Resume` : 'Imported Resume', 
            parsedData
          );
        }}
      />

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={async () => {
          setIsLogoutModalOpen(false);
          await signOut();
          navigate('/');
        }}
        theme="dark"
      />

    </DragDropContext>
  );
}
