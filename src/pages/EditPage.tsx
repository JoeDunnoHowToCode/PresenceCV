import React, { useState, useEffect, useRef, CSSProperties, useCallback } from 'react';
import { DragDropContext, DropResult, Droppable, Draggable } from '@hello-pangea/dnd';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '../contexts/AuthContext';
import { useResume } from '../hooks/useResume';
import { ICONS, AVAILABLE_BLOCK_ICONS, THEME_COLORS, AVAILABLE_ICONS } from '../constants';
import { ImportResumeModal } from '../components/ImportResumeModal';
import { copyTextToClipboard } from '../lib/utils';

import ProfileSwitcher from '../components/editor/ProfileSwitcher';
import ThemePicker from '../components/editor/ThemePicker';
import PhotoUploadCrop from '../components/editor/PhotoUploadCrop';
import InfoEditor from '../components/editor/InfoEditor';
import ListBlockEditor from '../components/editor/ListBlockEditor';
import TagsBlockEditor from '../components/editor/TagsBlockEditor';

export default function EditPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const {
    data,
    appState,
    loading,
    switchProfile,
    importResumeProfile,
    createProfile,
    renameProfile,
    deleteProfile,
    toggleAnimation,
    updateProfile,
    addContactItem,
    updateContactItem,
    removeContactItem,
    updateThemeColor,
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
    updateProfileData,
  } = useResume();

  const location = useLocation();

  const [activeTab, setActiveTab] = useState('info');
  const [direction, setDirection] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
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
      reorderBlocks(source.index, destination.index);
    } else if (type === 'list-items') {
      reorderListItems(source.droppableId, source.index, destination.index);
    } else if (type === 'tag-items') {
      reorderTagItems(source.droppableId, source.index, destination.index);
    }
  }, [reorderBlocks, reorderListItems, reorderTagItems]);

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
      localStorage.setItem('RESUME_PRINT_DATA', JSON.stringify(data));
      const printWindow = window.open('/view?print=true', '_blank');
      if (!printWindow) {
        alert("Please allow popups to generate the PDF.");
        return;
      }
      const intervalId = setInterval(() => {
        printWindow.postMessage({ type: 'RESUME_DATA_SYNC', data }, '*');
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
  }, [data]);

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
      const profileData = appState.profiles[appState.activeProfileId]?.data || data;
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
    const profileData = appState.profiles[appState.activeProfileId]?.data || data;
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
      updateProfileData(prev => ({
        ...prev,
        liveId: docRef.id,
        updateToken
      }));
    } catch (err) {
      console.error('Failed to create live link:', err);
    } finally {
      setIsInitializingLive(false);
    }
  }, [appState, data, updateProfileData, user]);

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
        <div className="glass p-8 rounded-2xl flex flex-col items-center gap-4 border border-white/10 shadow-2xl">
          <LucideIcons.Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-text-secondary text-xs uppercase tracking-widest font-medium">Loading your profiles...</p>
        </div>
      </div>
    );
  }

  const activeBlock = data.blocks[activeTab];

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div 
        className="min-h-screen relative p-6 md:p-12 lg:p-24 overflow-x-hidden flex flex-col"
        style={{ '--theme-accent': data.themeColor } as CSSProperties}
      >
        <div className={`depth-bg ${data.enableAnimation ? 'animated' : ''}`} />

        {isShareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="glass p-8 rounded-2xl max-w-lg w-full flex flex-col items-center text-center border border-white/10 shadow-2xl relative">
              <button
                onClick={() => { setIsShareModalOpen(false); setSnapshotUrl(null); setCopiedSection(null); }}
                className="absolute top-4 right-4 text-text-secondary hover:text-white transition-colors p-2"
              >
                <LucideIcons.X className="w-5 h-5" />
              </button>

              <LucideIcons.Share2 className="w-10 h-10 text-accent mb-4" />
              <h3 className="text-2xl font-serif text-white mb-2">Share Your Resume</h3>
              <p className="text-sm text-text-secondary mb-8">
                Choose how you want to share your profile with the world.
              </p>

              <div className="flex flex-col gap-5 w-full">
                <div className="flex flex-col gap-2 w-full text-left p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-medium">
                      <LucideIcons.Camera className="w-4 h-4 text-accent" />
                      Snapshot Link
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Captures your resume exactly as it is right now. Automatically updates only when you make changes.
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {isSharing ? (
                      <div className="flex-1 flex items-center gap-2 text-xs text-text-secondary bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                        <LucideIcons.Loader2 className="w-3 h-3 animate-spin shrink-0" />
                        Generating…
                      </div>
                    ) : snapshotUrl ? (
                      <input
                        readOnly
                        value={snapshotUrl}
                        onClick={e => (e.target as HTMLInputElement).select()}
                        className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-text-secondary outline-none cursor-text select-all"
                      />
                    ) : (
                      <div className="flex-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        Failed to generate. Close and reopen to retry.
                      </div>
                    )}
                    <button
                      onClick={() => snapshotUrl && handleCopyLink(snapshotUrl, 'snapshot')}
                      disabled={!snapshotUrl || isSharing}
                      className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 disabled:opacity-40 transition-colors"
                    >
                      {copiedSection === 'snapshot'
                        ? <><LucideIcons.Check className="w-3 h-3 text-green-400" /> Copied!</>
                        : <><LucideIcons.Copy className="w-3 h-3" /> Copy</>}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full text-left p-4 rounded-xl border border-accent/20 bg-accent/5">
                  <div className="flex items-center gap-2 text-white font-medium">
                    <LucideIcons.Radio className="w-4 h-4 text-accent" />
                    Live Link
                    {data.liveId && (
                      <span className="ml-auto text-[10px] uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">
                    A permanent link that always reflects your latest edits. Tied to this profile — deleting the profile removes the link.
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {isInitializingLive ? (
                      <div className="flex-1 flex items-center gap-2 text-xs text-text-secondary bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                        <LucideIcons.Loader2 className="w-3 h-3 animate-spin shrink-0" />
                        Creating live link…
                      </div>
                    ) : data.liveId ? (
                      <input
                        readOnly
                        value={`${window.location.origin}/view?live=${data.liveId}`}
                        onClick={e => (e.target as HTMLInputElement).select()}
                        className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-text-secondary outline-none cursor-text select-all"
                      />
                    ) : (
                      <button
                        onClick={ensureLiveLink}
                        className="flex-1 flex items-center justify-center gap-2 text-xs text-accent bg-accent/10 border border-accent/20 rounded-lg px-3 py-2 hover:bg-accent/20 transition-colors"
                      >
                        <LucideIcons.Plus className="w-3 h-3" />
                        Create Live Link for this profile
                      </button>
                    )}
                    {data.liveId && (
                      <button
                        onClick={() => handleCopyLink(`${window.location.origin}/view?live=${data.liveId}`, 'live')}
                        className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        {copiedSection === 'live'
                          ? <><LucideIcons.Check className="w-3 h-3 text-green-400" /> Copied!</>
                          : <><LucideIcons.Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {blockToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="glass p-8 rounded-2xl max-w-md w-full flex flex-col items-center text-center border border-white/10 shadow-2xl">
              <LucideIcons.AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Delete Section?</h3>
              <p className="text-text-secondary mb-8">
                Are you sure you want to delete "{data.blocks[blockToDelete]?.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => setBlockToDelete(null)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    removeBlock(blockToDelete);
                    if (activeTab === blockToDelete) setActiveTab('info');
                    setBlockToDelete(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-500/80 hover:bg-red-500 transition-colors text-white font-medium"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {profileToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="glass p-8 rounded-2xl max-w-md w-full flex flex-col items-center text-center border border-white/10 shadow-2xl">
              <LucideIcons.FileWarning className="w-12 h-12 text-red-400 mb-4" />
              {Object.keys(appState.profiles).length <= 1 ? (
                <>
                  <h3 className="text-xl font-medium text-white mb-2">Unable to delete the profile</h3>
                  <p className="text-text-secondary mb-8">
                    At least one profile must be retained
                  </p>
                  <div className="flex gap-4 w-full">
                    <button
                      onClick={() => setProfileToDelete(null)}
                      className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white font-medium"
                    >
                      Okay
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-medium text-white mb-2">Delete Resume?</h3>
                  <p className="text-text-secondary mb-8">
                    Are you sure you want to delete "{appState.profiles[profileToDelete]?.name}"? This action cannot be undone.
                  </p>
                  <div className="flex gap-4 w-full">
                    <button
                      onClick={() => setProfileToDelete(null)}
                      className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        deleteProfile(profileToDelete);
                        setProfileToDelete(null);
                      }}
                      className="flex-1 py-3 rounded-xl bg-red-500/80 hover:bg-red-500 transition-colors text-white font-medium"
                    >
                      Confirm
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="max-w-5xl mx-auto w-full flex flex-col gap-8 mb-16 relative z-10">
          
          <ProfileSwitcher 
            profiles={appState.profiles}
            activeProfileId={appState.activeProfileId}
            switchProfile={switchProfile}
            createProfile={createProfile}
            renameProfile={renameProfile}
            setProfileToDelete={setProfileToDelete}
            user={user}
            isMobile={isMobile}
            navigate={navigate}
          />
          
          <ThemePicker 
            themeColor={data.themeColor}
            enableAnimation={data.enableAnimation}
            updateThemeColor={updateThemeColor}
            toggleAnimation={toggleAnimation}
            THEME_COLORS={THEME_COLORS}
          />

          {/* Row 2: Tabs & Add Block */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="flex items-center justify-between gap-2 bg-white/5 p-2 rounded-3xl backdrop-blur-md border border-white/10 xl:w-[1310px] xl:-ml-[100px] w-full relative z-30"
          >
            {isMobile ? (
              <div className="relative flex-[2]">
                 <div 
                   className="flex items-center justify-between w-full px-5 py-2.5 rounded-full whitespace-nowrap hover-glow bg-accent text-bg font-medium shadow-[0_0_15px_var(--theme-accent)] cursor-pointer"
                   onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                 >
                   <div className="flex items-center gap-2 flex-1 min-w-0">
                     {activeTab === 'info' ? <LucideIcons.User className="w-4 h-4 shrink-0" /> : (() => {
                       const block = data.blocks[activeTab];
                       const FinalIcon = block?.icon ? (LucideIcons as any)[block.icon] || LucideIcons.Briefcase : ICONS[activeTab] || LucideIcons.Briefcase;
                       return (
                         <div className="relative shrink-0 flex items-center justify-center" onClick={e => e.stopPropagation()}>
                           <select 
                             value={block?.icon || 'Briefcase'} 
                             onChange={e => updateBlockIcon(activeTab, e.target.value)}
                             className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                           >
                             <option disabled value="">Icon</option>
                             {AVAILABLE_BLOCK_ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                           </select>
                           <FinalIcon className="w-4 h-4" />
                         </div>
                       );
                     })()}
                     {activeTab === 'info' ? (
                       <span className="text-sm tracking-widest uppercase truncate flex-1 text-left">Info</span>
                     ) : (
                       <input 
                         value={data.blocks[activeTab]?.title || ''}
                         onClick={e => e.stopPropagation()}
                         onChange={e => updateBlockTitle(activeTab, e.target.value)}
                         className="text-sm tracking-widest uppercase truncate bg-transparent outline-none border-b border-bg/20 focus:border-bg w-full text-bg font-medium pb-0.5 min-w-0"
                         placeholder="Section Name"
                       />
                     )}
                   </div>
                   
                   <div className="flex items-center gap-2 pl-2 shrink-0">
                     {activeTab !== 'info' && (
                       <button
                         onClick={(e) => { e.stopPropagation(); setBlockToDelete(activeTab); setIsMobileMenuOpen(false); }}
                         className="p-1 rounded-full bg-red-500/20 text-red-600 hover:bg-red-500/30 transition-colors"
                         title="Delete Section"
                       >
                         <LucideIcons.X className="w-3 h-3" />
                       </button>
                     )}
                     <LucideIcons.ChevronDown className={`w-4 h-4 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
                   </div>
                 </div>

                 <AnimatePresence>
                   {isMobileMenuOpen && (
                     <motion.div 
                       initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                       className="absolute top-14 left-0 right-0 glass rounded-3xl flex flex-col p-2 gap-1 z-50 border border-white/10 shadow-2xl min-w-[200px]"
                     >
                       <button
                         onClick={() => { handleTabClick('info'); setIsMobileMenuOpen(false); }}
                         className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'info' ? 'bg-accent/20 text-white' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`}
                       >
                         <LucideIcons.User className="w-4 h-4" />
                         <span className="text-sm tracking-widest uppercase font-medium">Info</span>
                       </button>
                       {data.blockOrder.map(blockId => {
                         const block = data.blocks[blockId];
                         if (!block) return null;
                         const Icon = block.icon ? (LucideIcons as any)[block.icon] || LucideIcons.Briefcase : ICONS[blockId] || LucideIcons.Briefcase;
                         return (
                           <div key={blockId} className="flex items-center gap-1 group">
                             <button
                               onClick={() => { handleTabClick(blockId); setIsMobileMenuOpen(false); }}
                               className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left truncate ${activeTab === blockId ? 'bg-accent/20 text-white' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`}
                             >
                               <Icon className="w-4 h-4 shrink-0" />
                               <span className="text-sm tracking-widest uppercase font-medium truncate">{block.title}</span>
                             </button>
                             <button
                               onClick={() => {
                                 setBlockToDelete(blockId);
                                 setIsMobileMenuOpen(false);
                               }}
                               className="p-3 text-text-secondary hover:text-red-400 transition-all rounded-xl hover:bg-red-500/10 shrink-0"
                             >
                               <LucideIcons.X className="w-4 h-4" />
                             </button>
                           </div>
                         )
                       })}
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>
            ) : (
              <>
                <button
                  onClick={() => handleTabClick('info')}
                  data-active={activeTab === 'info'}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition-all whitespace-nowrap hover-glow shrink-0 ${
                    activeTab === 'info' 
                      ? 'bg-accent text-bg font-medium shadow-[0_0_15px_var(--theme-accent)]' 
                      : 'text-text-secondary hover:text-accent hover:bg-white/5'
                  }`}
                >
                  <LucideIcons.User className="w-4 h-4" />
                  <span className="text-sm tracking-widest uppercase">Info</span>
                </button>

                <Droppable droppableId="tabs" direction="horizontal" type="tabs">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps} 
                      ref={(el) => {
                        provided.innerRef(el);
                        tabsContainerRef.current = el;
                      }}
                      className="flex gap-2 items-center overflow-x-auto glass-scrollbar flex-1 px-2 overscroll-x-contain"
                    >
                      {data.blockOrder.map((blockId, index) => {
                        const block = data.blocks[blockId];
                        if (!block) return null;
                        
                        const FinalIcon = block.icon ? (LucideIcons as any)[block.icon] || LucideIcons.Briefcase : ICONS[blockId] || LucideIcons.Briefcase;
                        const isActive = activeTab === blockId;

                        return (
                          // @ts-expect-error react-beautiful-dnd types missing key
                          <Draggable key={block.id} draggableId={block.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                data-active={isActive}
                                className={`relative flex items-center gap-2 px-6 py-2.5 rounded-full transition-all whitespace-nowrap hover-glow shrink-0 group ${snapshot.isDragging ? 'z-50 shadow-2xl' : ''} ${
                                  isActive 
                                    ? 'bg-accent text-bg font-medium shadow-[0_0_15px_var(--theme-accent)]' 
                                    : 'text-text-secondary hover:text-accent hover:bg-white/5'
                                }`}
                              >
                                <div 
                                  {...provided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100"
                                >
                                  <LucideIcons.GripVertical className="w-4 h-4" />
                                </div>
                                <div onClick={() => handleTabClick(blockId)} className="flex items-center gap-2 px-2 cursor-pointer">
                                  {isActive ? (
                                    <div className="relative flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                      <div className="relative shrink-0 flex items-center justify-center">
                                        <select 
                                          value={block.icon || 'Briefcase'} 
                                          onChange={e => updateBlockIcon(blockId, e.target.value)}
                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        >
                                          <option disabled value="">Icon</option>
                                          {AVAILABLE_BLOCK_ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                                        </select>
                                        <FinalIcon className="w-4 h-4 text-bg/70 hover:text-bg transition-colors" />
                                      </div>
                                      <input 
                                        value={block.title}
                                        onChange={e => updateBlockTitle(blockId, e.target.value)}
                                        className="text-sm tracking-widest uppercase bg-transparent outline-none border-b border-bg/20 focus:border-bg w-24 sm:w-32 text-center pb-0.5 text-bg font-medium"
                                        placeholder="Name"
                                      />
                                    </div>
                                  ) : (
                                    <>
                                      <FinalIcon className="w-4 h-4" />
                                      <span className="text-sm tracking-widest uppercase">{block.title}</span>
                                    </>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBlockToDelete(blockId);
                                  }}
                                  className="w-6 h-6 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 bg-black/10 hover:bg-black/20 text-bg"
                                  title="Delete Section"
                                >
                                  <LucideIcons.X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </>
            )}

            <div className={`flex items-center gap-1 ${isMobile ? 'flex-[3] justify-end' : 'pl-2 border-l border-white/10 shrink-0'}`}>
              <button
                onClick={() => {
                  const newId = addBlock('list');
                  handleTabClick(newId);
                  if (isMobile) setIsMobileMenuOpen(false);
                }}
                className={`flex items-center justify-center gap-1 px-3 py-2.5 rounded-full text-[10px] sm:text-xs uppercase tracking-widest text-text-secondary hover:text-accent hover:bg-white/5 transition-colors hover-glow whitespace-nowrap ${isMobile ? 'flex-1 border border-white/10 bg-white/5' : ''}`}
              >
                <LucideIcons.Plus className="w-3 h-3" /> List
              </button>
              <button
                onClick={() => {
                  const newId = addBlock('tags');
                  handleTabClick(newId);
                  if (isMobile) setIsMobileMenuOpen(false);
                }}
                className={`flex items-center justify-center gap-1 px-3 py-2.5 rounded-full text-[10px] sm:text-xs uppercase tracking-widest text-text-secondary hover:text-accent hover:bg-white/5 transition-colors hover-glow whitespace-nowrap ${isMobile ? 'flex-1 border border-white/10 bg-white/5' : ''}`}
              >
                <LucideIcons.Plus className="w-3 h-3" /> Tags
              </button>
            </div>
          </motion.div>

          {/* Row 3: Actions */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <button
              onClick={openShareModal}
              disabled={isSharing}
              className="glass px-6 py-3 rounded-full flex items-center justify-center gap-2 text-xs md:text-sm uppercase tracking-widest hover:bg-white/10 transition-colors text-text-secondary hover:text-accent hover-glow whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LucideIcons.Share2 className="w-4 h-4" />
              Share
            </button>
            <button
              onClick={handleExportPDF}
              className="glass px-6 py-3 rounded-full flex items-center justify-center gap-2 text-xs md:text-sm uppercase tracking-widest hover:bg-white/10 transition-colors text-text-secondary hover:text-accent hover-glow whitespace-nowrap"
            >
              <LucideIcons.Download className="w-4 h-4" /> Export PDF
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="glass px-6 py-3 rounded-full flex items-center justify-center gap-2 text-xs md:text-sm uppercase tracking-widest hover:bg-white/10 transition-colors text-indigo-400 hover:text-indigo-300 hover-glow whitespace-nowrap"
            >
              <LucideIcons.Wand2 className="w-4 h-4" /> Import Your Resume
            </button>
            <Link
              to="/view"
              className="glass px-6 py-3 rounded-full flex items-center justify-center gap-2 text-xs md:text-sm uppercase tracking-widest hover:bg-white/10 transition-colors text-accent hover-glow whitespace-nowrap"
            >
              <LucideIcons.Eye className="w-4 h-4" /> View Showcase
            </Link>
          </motion.div>
        </div>

        <main className="max-w-4xl mx-auto w-full flex-1 relative">
          <AnimatePresence mode="wait" custom={direction}>
            {activeTab === 'info' ? (
              <motion.div 
                key="info"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center space-y-12 py-12"
              >
                <PhotoUploadCrop 
                  photo={data.profile.photo} 
                  photoPosition={data.profile.photoPosition} 
                  updateProfile={updateProfile} 
                />
                
                <InfoEditor 
                  key={appState.activeProfileId}
                  data={data}
                  updateProfile={updateProfile}
                  updateContactItem={updateContactItem}
                  removeContactItem={removeContactItem}
                  addContactItem={addContactItem}
                  AVAILABLE_ICONS={AVAILABLE_ICONS}
                />
              </motion.div>
            ) : activeBlock ? (
              <motion.div
                key={activeBlock.id}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                {activeBlock.type === 'list' && (
                  <ListBlockEditor 
                    block={activeBlock}
                    updateBlockTitle={updateBlockTitle}
                    updateListItem={updateListItem}
                    removeListItem={removeListItem}
                    addListItem={addListItem}
                  />
                )}

                {activeBlock.type === 'tags' && (
                  <TagsBlockEditor 
                    block={activeBlock}
                    updateBlockTitle={updateBlockTitle}
                    updateTagItem={updateTagItem}
                    removeTagItem={removeTagItem}
                    addTagItem={addTagItem}
                  />
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
      </div>

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
    </DragDropContext>
  );
}
