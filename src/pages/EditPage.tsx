/**
 * EditPage.tsx — Main Resume Editor (Protected Route, "/app")
 *
 * This is the largest and most feature-rich component in the project (~1270 lines).
 * It provides the full resume editing experience with a dark glassmorphic UI.
 *
 * Feature Inventory:
 * - Profile Switcher: Create, clone, rename, delete resume profiles (top bar)
 * - Theme Color Picker: 6 preset colors + custom hex via color input
 * - Background Animation Toggle: Enables/disables the smokeFlow CSS animation
 * - Block Tab Bar: Drag-and-drop reorderable section tabs (Info, Experience, etc.)
 *   - Desktop: Horizontal draggable tabs via @hello-pangea/dnd
 *   - Mobile: Dropdown menu with section list
 * - Info Tab: Inline-editable name/title (contentEditable), contact items CRUD,
 *   summary text with alignment + width controls, photo upload with crop
 * - List Blocks (Experience/Education): Draggable items with title/subtitle/period/description
 * - Tag Blocks (Skills/Languages): Draggable items with "Category: Skill1, Skill2" format
 * - Photo Upload: File select or drag-and-drop → react-easy-crop → base64 JPEG (max 600px)
 * - Share Modal: Snapshot link (one-time) vs Live link (auto-syncing)
 * - PDF Export: Opens /view?print=true via window.open with postMessage data sync
 * - Import Resume: Opens ImportResumeModal for AI-powered parsing
 * - Live Resume Auto-Sync: Debounced (2s) Firestore write when liveId is set
 * - New User Reset: Detects isNewUser flag and resets to default template
 *
 * Image Crop Pipeline:
 *   File → FileReader → data URL → react-easy-crop → canvas → scaled JPEG data URL
 *   (max 600x600px, 85% quality to keep Firestore doc size manageable)
 *
 * Cross-Window Communication (for PDF export):
 *   EditPage posts RESUME_DATA_SYNC via setInterval → ViewPage (print mode) receives
 *   and responds with RESUME_DATA_ACK → EditPage clears interval
 *
 * Depends on: useResume, AuthContext, ImportResumeModal, ViewPage,
 *             @hello-pangea/dnd, react-easy-crop, lucide-react, motion
 * Firestore writes: sharedResumes/{id}, liveResumes/{id}
 */
import { useState, KeyboardEvent, CSSProperties, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import * as LucideIcons from 'lucide-react';
import Cropper from 'react-easy-crop';
import { useResume } from '../hooks/useResume';
import { ListItem, TagItem } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ImportResumeModal } from '../components/ImportResumeModal';
import ViewPage from './ViewPage';

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  const MAX = 600;
  if (pixelCrop.width > MAX || pixelCrop.height > MAX) {
    const scaledCanvas = document.createElement('canvas');
    const maxRatio = Math.max(pixelCrop.width / MAX, pixelCrop.height / MAX);
    scaledCanvas.width = pixelCrop.width / maxRatio;
    scaledCanvas.height = pixelCrop.height / maxRatio;
    const sCtx = scaledCanvas.getContext('2d');
    sCtx?.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
    return scaledCanvas.toDataURL('image/jpeg', 0.85);
  }

  return canvas.toDataURL('image/jpeg', 0.85);
}

const ICONS: Record<string, any> = {
  info: LucideIcons.User,
  experience: LucideIcons.Briefcase,
  education: LucideIcons.GraduationCap,
  skills: LucideIcons.Code,
  languages: LucideIcons.Globe
};

const THEME_COLORS = [
  '#e5e5e5', // Default White
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
];

const AVAILABLE_ICONS = ['MapPin', 'Mail', 'Phone', 'Link', 'Github', 'Linkedin', 'Twitter', 'Globe', 'Briefcase', 'GraduationCap', 'Code', 'User', 'Award', 'Layout', 'Star', 'Folder', 'File'];
const AVAILABLE_BLOCK_ICONS = ['Briefcase', 'GraduationCap', 'Code', 'Globe', 'User', 'Award', 'Layout', 'Star', 'Folder', 'File', 'Book', 'Heart', 'Coffee', 'Cpu'];

const copyTextToClipboard = async (text: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback...', err);
    }
  }
  
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }
  document.body.removeChild(textArea);
};

export default function EditPage() {
  const navigate = useNavigate();
  const { user, signOut, isNewUser } = useAuth();
  const { 
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
    loadPersonalBackup
  } = useResume();

  useEffect(() => {
    if (user && isNewUser) {
      resetToDefault();
    }
  }, [user, isNewUser]);

  const [activeTab, setActiveTab] = useState('info');
  const [direction, setDirection] = useState(0);
  const [newTags, setNewTags] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<string | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const allTabs = ['info', ...data.blockOrder];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
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
      setActiveTab('info');
    }
  }, [data.blockOrder, activeTab]);

  const handleTabClick = (tabId: string) => {
    const currentIndex = allTabs.indexOf(activeTab);
    const newIndex = allTabs.indexOf(tabId);
    setDirection(newIndex > currentIndex ? 1 : -1);
    setActiveTab(tabId);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, type } = result;

    if (type === 'tabs') {
      reorderBlocks(source.index, destination.index);
    } else if (type === 'list-items') {
      reorderListItems(source.droppableId, source.index, destination.index);
    } else if (type === 'tag-items') {
      reorderTagItems(source.droppableId, source.index, destination.index);
    }
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>, blockId: string) => {
    if (e.key === 'Enter') {
      addTagItem(blockId, newTags[blockId] || '');
      setNewTags(prev => ({ ...prev, [blockId]: '' }));
    }
  };

  const [isSharing, setIsSharing] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  // Tracks the latest snapshot URL generated in the current modal session
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  // Tracks per-section copy feedback: 'snapshot' | 'live' | null
  const [copiedSection, setCopiedSection] = useState<'snapshot' | 'live' | null>(null);
  // Whether the live link is currently being initialized for the first time
  const [isInitializingLive, setIsInitializingLive] = useState(false);
  // Whether a new snapshot is being generated (e.g. via the refresh button)
  const [isRefreshingSnapshot, setIsRefreshingSnapshot] = useState(false);

  // Respond to data requests from spawned print windows (e.g. if they are refreshed)
  useEffect(() => {
    const handleRequest = (event: MessageEvent) => {
      if (event.data?.type === 'RESUME_DATA_REQUEST' && event.source) {
        (event.source as Window).postMessage({ type: 'RESUME_DATA_SYNC', data }, '*');
      }
    };
    window.addEventListener('message', handleRequest);
    return () => window.removeEventListener('message', handleRequest);
  }, [data]);

  const handleExportPDF = () => {
    // Rely on localStorage for cross-tab communication in restricted sandboxes
    localStorage.setItem('RESUME_PRINT_DATA', JSON.stringify(data));
    const printWindow = window.open('/view?print=true', '_blank');
    if (!printWindow) {
      alert("Please allow popups to generate the PDF.");
      return;
    }
    
    // Continuously send the current data to the new window until acknowledged (fallback)
    const intervalId = setInterval(() => {
      printWindow.postMessage({ type: 'RESUME_DATA_SYNC', data }, '*');
    }, 200);

    // Listen for the acknowledgment from the print window to stop sending
    const handleAck = (event: MessageEvent) => {
      if (event.data?.type === 'RESUME_DATA_ACK') {
        clearInterval(intervalId);
        window.removeEventListener('message', handleAck);
      }
    };
    window.addEventListener('message', handleAck);

    // Safety timeout to clear interval after 10 seconds just in case
    setTimeout(() => {
      clearInterval(intervalId);
      window.removeEventListener('message', handleAck);
    }, 10000);
  };

  // Auto-sync for Live Resumes
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

  // Opens the share modal and pre-generates a fresh snapshot link eagerly.
  // Pre-generation is important because navigator.clipboard.writeText() requires
  // a user-gesture context. If we wait until the user clicks "Copy", the async
  // Firestore write finishes too late and the browser blocks the clipboard access.
  const openShareModal = async () => {
    setSnapshotUrl(null);
    setCopiedSection(null);
    setIsShareModalOpen(true);
    setIsSharing(true); // lock UI while the snapshot is being generated
    try {
      const profileData = appState.profiles[appState.activeProfileId]?.data || data;
      const safeData = JSON.parse(JSON.stringify(profileData));
      // Strip live-link fields from snapshot payloads — snapshots are read-only
      delete safeData.liveId;
      delete safeData.updateToken;

      const { collection, addDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      const docRef = await addDoc(collection(db, 'sharedResumes'), {
        ...safeData,
        createdAt: Date.now()
      });
      setSnapshotUrl(`${window.location.origin}/view?id=${docRef.id}`);
    } catch (err) {
      console.error('Failed to pre-generate snapshot:', err);
      // Don't close the modal; user can retry via the refresh button
    } finally {
      setIsSharing(false);
    }
  };

  // Refreshes the snapshot by creating a brand-new Firestore document.
  const refreshSnapshot = async () => {
    setIsRefreshingSnapshot(true);
    setSnapshotUrl(null);
    setCopiedSection(prev => prev === 'snapshot' ? null : prev);
    try {
      const profileData = appState.profiles[appState.activeProfileId]?.data || data;
      const safeData = JSON.parse(JSON.stringify(profileData));
      delete safeData.liveId;
      delete safeData.updateToken;

      const { collection, addDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      const docRef = await addDoc(collection(db, 'sharedResumes'), {
        ...safeData,
        createdAt: Date.now()
      });
      setSnapshotUrl(`${window.location.origin}/view?id=${docRef.id}`);
    } catch (err) {
      console.error('Failed to refresh snapshot:', err);
    } finally {
      setIsRefreshingSnapshot(false);
    }
  };

  // Ensures a live link exists for the current profile.
  // If one already exists, this is a no-op. Otherwise creates a new Firestore doc.
  const ensureLiveLink = async () => {
    const profileData = appState.profiles[appState.activeProfileId]?.data || data;
    if (profileData.liveId) return; // already exists, nothing to do

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
      // Persist liveId and updateToken into the profile's data in Firestore
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
  };

  // Copies a given URL to clipboard and sets per-section feedback.
  const handleCopyLink = async (url: string, section: 'snapshot' | 'live') => {
    await copyTextToClipboard(url);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Legacy alias — kept so nothing else in this file breaks
  const generateShareLink = async (_mode: 'snapshot' | 'live') => {};


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

  const handleImageUpload = (file: File) => {
    if (!file.type.match(/^image\/(jpeg|jpg|png|heif|heic)$/i) && !file.name.match(/\.(jpg|jpeg|png|heif|heic)$/i)) {
      alert("Only JPG, PNG, and HEIF formats are supported.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setCropImageSrc(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const [isPhotoDragging, setIsPhotoDragging] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      if (croppedImage) {
        updateProfile('photo', croppedImage);
        if (!data.profile.photoPosition) {
          updateProfile('photoPosition', 'left');
        }
      }
      setCropImageSrc(null);
    } catch (e) {
      console.error(e);
    }
  };

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
              {/* Close Button */}
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

                {/* ── Snapshot Link Section ── */}
                <div className="flex flex-col gap-2 w-full text-left p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-medium">
                      <LucideIcons.Camera className="w-4 h-4 text-accent" />
                      Snapshot Link
                    </div>
                    {/* Refresh: creates a brand-new snapshot */}
                    <button
                      onClick={refreshSnapshot}
                      disabled={isRefreshingSnapshot || isSharing}
                      title="Generate a new snapshot of your current resume"
                      className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-white/10 transition-colors disabled:opacity-40"
                    >
                      <LucideIcons.RefreshCw className={`w-4 h-4 ${isRefreshingSnapshot ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Captures your resume exactly as it is right now. Good for submitting to a specific job.
                  </p>

                  {/* URL display + copy */}
                  <div className="flex items-center gap-2 mt-1">
                    {isSharing || isRefreshingSnapshot ? (
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
                        Failed to generate. Click ↻ to retry.
                      </div>
                    )}
                    <button
                      onClick={() => snapshotUrl && handleCopyLink(snapshotUrl, 'snapshot')}
                      disabled={!snapshotUrl || isSharing || isRefreshingSnapshot}
                      className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 disabled:opacity-40 transition-colors"
                    >
                      {copiedSection === 'snapshot'
                        ? <><LucideIcons.Check className="w-3 h-3 text-green-400" /> Copied!</>
                        : <><LucideIcons.Copy className="w-3 h-3" /> Copy</>}
                    </button>
                  </div>
                </div>

                {/* ── Live Link Section ── */}
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

                  {/* URL display + copy — initializes on first render if no liveId yet */}
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

        {cropImageSrc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="glass p-6 md:p-8 rounded-3xl w-full max-w-2xl flex flex-col items-center border border-white/10 shadow-2xl relative">
              <h3 className="text-xl font-medium text-white mb-6">Position Photo</h3>
              
              <div className="relative w-full h-[60vh] max-h-[500px] bg-black/20 rounded-2xl overflow-hidden mb-6">
                <Cropper
                  image={cropImageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="rect"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  classes={{ containerClassName: 'rounded-2xl' }}
                />
              </div>

              <div className="w-full flex items-center gap-4 mb-8">
                <span className="text-sm text-center text-text-secondary w-full select-none">
                  Drag to move • Scroll to zoom
                </span>
              </div>

              <div className="flex gap-4 w-full relative z-50">
                <button
                  onClick={() => { setCropImageSrc(null); setZoom(1); }}
                  className="flex-1 py-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-white font-medium tracking-wide"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropSave}
                  className="flex-[2] py-3.5 rounded-xl bg-accent text-bg hover:opacity-90 font-medium tracking-wide shadow-[0_0_20px_var(--theme-accent)] transition-all"
                >
                  Apply Crop
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

        {/* Top Bar - Separated into rows */}
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-8 mb-16 relative z-10">
          
          {/* Row 0: Profiles */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-4 p-2 w-full border-b border-white/5 pb-6"
          >
            <div className="flex items-center gap-2 overflow-x-auto glass-scrollbar pb-2 pt-1 flex-1">
              {Object.values(appState.profiles)
                .sort((a: any, b: any) => {
                  const getTs = (id: string) => {
                    if (id === 'main') return 0;
                    const match = id.match(/\d+/);
                    return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
                  };
                  return getTs(a.id) - getTs(b.id);
                })
                .map((profile: any) => (
                <div key={profile.id} className="relative group flex items-center shrink-0">
                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all cursor-pointer ${
                      appState.activeProfileId === profile.id
                        ? 'bg-accent/10 border border-accent/20 text-white'
                        : 'bg-white/5 text-text-secondary hover:bg-white/10'
                    }`}
                    onClick={() => switchProfile(profile.id)}
                  >
                    <LucideIcons.FileText className={`w-3.5 h-3.5 ${appState.activeProfileId === profile.id ? 'text-accent' : ''}`} />
                    {editingProfileId === profile.id ? (
                      <input
                        autoFocus
                        value={profile.name}
                        onChange={e => renameProfile(profile.id, e.target.value)}
                        onBlur={() => setEditingProfileId(null)}
                        onKeyDown={e => e.key === 'Enter' && setEditingProfileId(null)}
                        onClick={e => e.stopPropagation()}
                        className="bg-transparent border-b border-accent outline-none text-sm w-24 text-white"
                      />
                    ) : (
                      <span className="text-sm font-medium tracking-wide">
                        {profile.name}
                      </span>
                    )}
                  </div>
                  
                  {appState.activeProfileId === profile.id && (
                    <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingProfileId(profile.id); }}
                        className="p-1 rounded-full bg-blue-500 hover:bg-blue-400 text-white"
                        title="Rename Resume"
                      >
                        <LucideIcons.Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setProfileToDelete(profile.id); }}
                        className="p-1 rounded-full bg-red-500 hover:bg-red-400 text-white"
                        title="Delete Resume"
                      >
                        <LucideIcons.X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() => createProfile('New Resume')}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-dashed border-white/20 text-text-secondary hover:text-white hover:border-white/40 transition-all shrink-0 ml-2"
              >
                <LucideIcons.Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Clone Active</span>
              </button>
              {user?.email === 'mujoecs@gmail.com' && (
                <button
                  onClick={loadPersonalBackup}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-accent/40 bg-accent/5 text-accent hover:bg-accent/10 transition-all shrink-0 ml-2"
                  title="Restore your Joe Chou profile"
                >
                  <LucideIcons.History className="w-4 h-4" />
                  <span className="text-sm font-medium">Restore Backup</span>
                </button>
              )}
            </div>
            {user && (
              <div className="flex items-center gap-3 pl-4 border-l border-white/10 shrink-0">
                 {user.photoURL ? (
                   <img src={user.photoURL} alt="User avatar" className="w-8 h-8 rounded-full border border-white/20" />
                 ) : (
                   <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                     <LucideIcons.User className="w-4 h-4 text-white" />
                   </div>
                 )}
                 <button
                   onClick={() => navigate('/')}
                   className="text-white hover:text-[#f4f4f4] transition-colors p-2"
                   title="Home"
                 >
                   <LucideIcons.Home className="w-4 h-4" />
                 </button>
              </div>
            )}
          </motion.div>
          
          {/* Row 1: Colors */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="flex justify-center"
          >
            <div className="glass px-6 py-3 rounded-full flex items-center gap-4">
              <LucideIcons.Palette className="w-4 h-4 text-text-secondary" />
              <div className="flex gap-2">
                {THEME_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => updateThemeColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${data.themeColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <input 
                  type="color" 
                  value={data.themeColor}
                  onChange={(e) => updateThemeColor(e.target.value)}
                  className="w-6 h-6 rounded-full overflow-hidden cursor-pointer border-0 p-0"
                />
              </div>
              <div className="w-px h-6 bg-white/10 mx-2" />
              <button
                onClick={toggleAnimation}
                className={`flex items-center gap-2 text-xs uppercase tracking-widest transition-colors ${data.enableAnimation ? 'text-accent' : 'text-text-secondary hover:text-white'}`}
                title="Toggle Background Animation"
              >
                {data.enableAnimation ? <LucideIcons.Sparkles className="w-4 h-4" /> : <LucideIcons.Sparkles className="w-4 h-4 opacity-50" />}
              </button>
            </div>
          </motion.div>

          {/* Row 2: Tabs & Add Block */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="flex items-center justify-between gap-2 bg-white/5 p-2 rounded-3xl backdrop-blur-md border border-white/10 xl:w-[1310px] xl:-ml-[100px] w-full relative z-30"
          >
            {isMobile ? (
              <div className="relative flex-[2]">
                 <button 
                   onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                   className="flex items-center justify-between w-full px-5 py-2.5 rounded-full whitespace-nowrap hover-glow bg-accent text-bg font-medium shadow-[0_0_15px_var(--theme-accent)]"
                 >
                   <div className="flex items-center gap-2">
                     {activeTab === 'info' ? <LucideIcons.User className="w-4 h-4" /> : (() => {
                       const block = data.blocks[activeTab];
                       const FinalIcon = block?.icon ? (LucideIcons as any)[block.icon] || LucideIcons.Briefcase : ICONS[activeTab] || LucideIcons.Briefcase;
                       return <FinalIcon className="w-4 h-4" />;
                     })()}
                     <span className="text-sm tracking-widest uppercase truncate max-w-[100px]">
                       {activeTab === 'info' ? 'Info' : data.blocks[activeTab]?.title}
                     </span>
                   </div>
                   <LucideIcons.ChevronDown className={`w-4 h-4 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
                 </button>

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
                {/* Info Tab (Fixed) */}
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

                {/* Draggable Tabs */}
                <Droppable droppableId="tabs" direction="horizontal" type="tabs">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps} 
                      ref={(el) => {
                        provided.innerRef(el);
                        // @ts-ignore
                        tabsContainerRef.current = el;
                      }}
                      className="flex gap-2 items-center overflow-x-auto glass-scrollbar flex-1 px-2 overscroll-x-contain"
                    >
                      {data.blockOrder.map((blockId, index) => {
                        const block = data.blocks[blockId];
                        if (!block) return null;
                        const IconName = block.icon || 'Briefcase';
                        const Icon = (LucideIcons as any)[IconName] || parseInt(block.icon as string) ? (LucideIcons as any)[ICONS[blockId] || 'Briefcase'] : ICONS[blockId] || LucideIcons.Briefcase;
                        
                        // Handle legacy static icon mapping or dynamic mapping
                        const FinalIcon = block.icon ? (LucideIcons as any)[block.icon] || LucideIcons.Briefcase : ICONS[blockId] || LucideIcons.Briefcase;

                        const isActive = activeTab === blockId;

                        return (
                          // @ts-expect-error key is valid in React
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

            {/* Add Block Buttons */}
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
                {/* Photo Upload Section */}
                <div className="w-full flex flex-col items-center gap-6 mb-4">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsPhotoDragging(true); }}
                    onDragLeave={() => setIsPhotoDragging(false)}
                    onDrop={(e) => { 
                      e.preventDefault(); 
                      setIsPhotoDragging(false); 
                      const file = e.dataTransfer.files[0]; 
                      if(file) handleImageUpload(file); 
                    }}
                    className={`w-32 h-32 md:w-48 md:h-48 rounded-[2rem] flex flex-col items-center justify-center overflow-hidden transition-all duration-300 relative group cursor-pointer border-2 shadow-2xl ${isPhotoDragging ? 'border-accent bg-accent/10 scale-105' : 'border-white/10 bg-white/5 hover:border-accent/40'}`}
                    onClick={() => document.getElementById('photo-upload')?.click()}
                  >
                    <input 
                      id="photo-upload" 
                      type="file" 
                      accept=".jpg,.jpeg,.png,.heif,.heic" 
                      className="hidden" 
                      onChange={(e) => { const file = e.target.files?.[0]; if(file) handleImageUpload(file); }} 
                    />
                    {data.profile.photo ? (
                      <>
                        <img src={data.profile.photo} className="w-full h-full object-cover" alt="Profile avatar" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <LucideIcons.Upload className="w-6 h-6 text-white" />
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateProfile('photo', ''); }} 
                          className="absolute top-2 right-2 p-1.5 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        >
                           <LucideIcons.X className="w-3 h-3 text-white" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-text-secondary">
                         <LucideIcons.ImagePlus className={`w-8 h-8 transition-colors ${isPhotoDragging ? 'text-accent' : 'opacity-50 group-hover:text-accent group-hover:opacity-100'}`} />
                         <span className="text-[10px] tracking-widest text-center px-4 uppercase opacity-70">Drop photo or Click</span>
                      </div>
                    )}
                  </div>

                  {data.profile.photo && (
                    <div className="flex items-center gap-2 glass px-4 py-2 rounded-full border border-white/5">
                      <span className="text-xs uppercase tracking-widest text-text-secondary mr-2">Position in Layout:</span>
                      <button 
                        onClick={() => updateProfile('photoPosition', 'left')} 
                        className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all ${(!data.profile.photoPosition || data.profile.photoPosition === 'left') ? 'bg-accent/20 text-white border border-accent/30' : 'text-text-secondary hover:text-white border border-transparent'}`}
                      >
                        Left
                      </button>
                      <button 
                        onClick={() => updateProfile('photoPosition', 'right')} 
                        className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all ${data.profile.photoPosition === 'right' ? 'bg-accent/20 text-white border border-accent/30' : 'text-text-secondary hover:text-white border border-transparent'}`}
                      >
                        Right
                      </button>
                    </div>
                  )}
                </div>

                <div className="w-full flex flex-col items-center">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateProfile('name', e.currentTarget.textContent || '')}
                    className="font-serif text-6xl md:text-8xl font-light leading-none text-accent mb-6 outline-none focus:border-b focus:border-accent/50 border-b border-transparent transition-colors min-w-[100px] hover-glow text-center"
                  >
                    {data.profile.name}
                  </div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateProfile('title', e.currentTarget.textContent || '')}
                    className="text-lg md:text-xl tracking-[0.4em] uppercase text-text-secondary outline-none focus:border-b focus:border-accent/50 border-b border-transparent transition-colors min-w-[100px] hover-glow-text text-center font-['Georgia']"
                  >
                    {data.profile.title}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-4 w-full max-w-2xl">
                  {data.profile.contactItems?.map((item) => {
                    const Icon = (LucideIcons as any)[item.icon] || LucideIcons.Link;
                    return (
                      <div key={item.id} className="flex items-center gap-3 w-full group relative">
                        <div className="relative">
                          <select
                            value={item.icon}
                            onChange={(e) => updateContactItem(item.id, 'icon', e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                          >
                            {AVAILABLE_ICONS.map(iconName => (
                              <option key={iconName} value={iconName}>{iconName}</option>
                            ))}
                          </select>
                          <Icon className="w-5 h-5 text-accent hover:text-white transition-colors cursor-pointer" />
                        </div>
                        <input
                          value={item.text}
                          onChange={(e) => updateContactItem(item.id, 'text', e.target.value)}
                          placeholder="Display Text"
                          className="flex-1 bg-transparent border-b border-white/20 focus:border-accent outline-none text-lg transition-colors hover-glow-text font-['Georgia']"
                        />
                        <input
                          value={item.url || ''}
                          onChange={(e) => updateContactItem(item.id, 'url', e.target.value)}
                          placeholder="URL (optional)"
                          className="flex-1 bg-transparent border-b border-white/20 focus:border-accent outline-none text-sm text-text-secondary transition-colors"
                        />
                        <button 
                          onClick={() => removeContactItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-400 transition-all"
                        >
                          <LucideIcons.X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={addContactItem}
                    className="mt-2 flex items-center gap-2 text-xs uppercase tracking-widest text-text-secondary hover:text-accent transition-colors"
                  >
                    <LucideIcons.Plus className="w-3 h-3" /> Add Link
                  </button>
                </div>

                <div className="max-w-4xl w-full px-4 flex flex-col items-center group relative">
                  {/* Controls - Moved to bottom to avoid overlapping Add Link button */}
                  <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all glass px-4 py-2 rounded-full z-20 pointer-events-none group-hover:pointer-events-auto shadow-xl">
                    <div className="flex items-center gap-1 border-r border-white/10 pr-4">
                      {['left', 'center', 'right', 'justify'].map(align => (
                        <button
                          key={align}
                          onClick={() => updateProfile('summaryAlign', align)}
                          className={`p-1.5 rounded-md transition-colors ${data.profile.summaryAlign === align || (!data.profile.summaryAlign && align === 'center') ? 'bg-white/20 text-white' : 'text-text-secondary hover:bg-white/10'}`}
                          title={`Align ${align}`}
                        >
                          {align === 'left' && <LucideIcons.AlignLeft className="w-4 h-4" />}
                          {align === 'center' && <LucideIcons.AlignCenter className="w-4 h-4" />}
                          {align === 'right' && <LucideIcons.AlignRight className="w-4 h-4" />}
                          {align === 'justify' && <LucideIcons.AlignJustify className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 pl-2">
                      <LucideIcons.Maximize2 className="w-4 h-4 text-text-secondary" />
                      <input
                        type="range"
                        min="40"
                        max="100"
                        value={data.profile.summaryWidth || 100}
                        onChange={(e) => updateProfile('summaryWidth', parseInt(e.target.value))}
                        className="w-24 accent-accent"
                      />
                      <span className="text-xs text-text-secondary w-8">{data.profile.summaryWidth || 100}%</span>
                    </div>
                  </div>

                  <div style={{ width: `${data.profile.summaryWidth || 100}%` }} className="relative transition-all duration-300">
                    <span className="absolute -left-8 top-0 text-3xl font-serif italic text-text-secondary">"</span>
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => updateProfile('summary', e.currentTarget.textContent || '')}
                      className="italic text-2xl leading-relaxed text-text-secondary outline-none focus:bg-white/5 p-4 -m-4 rounded-xl transition-colors min-h-[100px] hover-glow-text font-['Georgia']"
                      style={{ textAlign: (data.profile.summaryAlign as any) || 'center' }}
                    >
                      {data.profile.summary}
                    </div>
                    <span className="absolute -right-8 bottom-0 text-3xl font-serif italic text-text-secondary">"</span>
                  </div>
                </div>
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
                className="py-8"
              >
                <div className="flex items-center justify-between mb-12">
                  <input
                    value={activeBlock.title}
                    onChange={e => updateBlockTitle(activeBlock.id, e.target.value)}
                    className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-accent outline-none text-sm font-bold uppercase tracking-[0.2em] text-text-secondary pb-1 transition-colors hover-glow-text"
                    placeholder="Section Title"
                  />
                </div>

                {activeBlock.type === 'list' && (
                  <Droppable droppableId={activeBlock.id} type="list-items">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                        {activeBlock.items.map((item: ListItem, index: number) => (
                          // @ts-expect-error key is valid in React
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <div 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`glass p-6 rounded-2xl space-y-4 relative group ${snapshot.isDragging ? 'z-50 shadow-2xl' : ''}`}
                              >
                                <div 
                                  {...provided.dragHandleProps}
                                  className="absolute left-4 top-4 text-white/20 hover:text-accent cursor-grab active:cursor-grabbing transition-colors"
                                >
                                  <LucideIcons.GripVertical className="w-5 h-5" />
                                </div>
                                <button 
                                  onClick={() => removeListItem(activeBlock.id, item.id)} 
                                  className="absolute top-4 right-4 text-text-secondary hover:text-red-400 transition-colors"
                                >
                                  <LucideIcons.X className="w-4 h-4" />
                                </button>
                                <div className="pl-8">
                                  <input
                                    value={item.title}
                                    onChange={e => updateListItem(activeBlock.id, item.id, 'title', e.target.value)}
                                    className="w-full bg-transparent border-b border-white/20 focus:border-accent outline-none font-serif text-2xl pb-1 transition-colors hover-glow"
                                    placeholder="Role / Degree"
                                  />
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <input
                                      value={item.subtitle}
                                      onChange={e => updateListItem(activeBlock.id, item.id, 'subtitle', e.target.value)}
                                      className="w-full bg-transparent border-b border-white/20 focus:border-accent outline-none text-xs tracking-widest uppercase pb-1 transition-colors hover-glow-text"
                                      placeholder="Company / Institution"
                                    />
                                    <input
                                      value={item.period}
                                      onChange={e => updateListItem(activeBlock.id, item.id, 'period', e.target.value)}
                                      className="w-full bg-transparent border-b border-white/20 focus:border-accent outline-none text-xs tracking-widest uppercase pb-1 transition-colors hover-glow-text"
                                      placeholder="Period (e.g. 2021 - Present)"
                                    />
                                  </div>
                                  <textarea
                                    value={item.description}
                                    onChange={e => updateListItem(activeBlock.id, item.id, 'description', e.target.value)}
                                    className="w-full mt-4 bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-accent/50 outline-none resize-none transition-colors hover-glow-text"
                                    rows={3}
                                    placeholder="Description..."
                                  />
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        <button
                          onClick={() => addListItem(activeBlock.id)}
                          className="w-full glass py-4 rounded-2xl flex items-center justify-center gap-2 text-text-secondary hover:text-accent hover:bg-white/5 transition-all hover-glow"
                        >
                          <LucideIcons.Plus className="w-4 h-4" />
                          <span className="text-xs tracking-widest uppercase">Add Item</span>
                        </button>
                      </div>
                    )}
                  </Droppable>
                )}

                {activeBlock.type === 'tags' && (
                  <Droppable droppableId={activeBlock.id} type="tag-items">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                        {activeBlock.items.map((item: TagItem, index: number) => (
                          // @ts-expect-error key is valid in React
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <div 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`glass p-4 rounded-xl flex items-center gap-4 border-accent/20 ${snapshot.isDragging ? 'z-50 shadow-2xl' : ''} hover-glow group`}
                              >
                                <div 
                                  {...provided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing text-white/20 hover:text-accent transition-colors"
                                >
                                  <LucideIcons.GripVertical className="w-5 h-5" />
                                </div>
                                <input
                                  value={item.text}
                                  onChange={e => updateTagItem(activeBlock.id, item.id, e.target.value)}
                                  placeholder="Category/skills"
                                  className="flex-1 bg-transparent border-b border-white/10 hover:border-white/30 focus:border-accent outline-none text-base tracking-wide text-white transition-colors pb-1 font-['Georgia']"
                                />
                                <button onClick={() => removeTagItem(activeBlock.id, item.id)} className="text-text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                  <LucideIcons.X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        <div className="glass p-4 rounded-xl flex items-center gap-4">
                          <LucideIcons.Plus className="w-5 h-5 text-text-secondary opacity-50" />
                          <input
                            value={newTags[activeBlock.id] || ''}
                            onChange={e => setNewTags(prev => ({ ...prev, [activeBlock.id]: e.target.value }))}
                            onKeyDown={e => handleTagKeyDown(e, activeBlock.id)}
                            placeholder="Add new category/skills (e.g., Python: ML, NLP) (Press Enter)"
                            className="flex-1 bg-transparent border-b border-white/20 focus:border-accent outline-none text-sm tracking-wide px-1 pb-1 transition-colors text-text-secondary"
                          />
                        </div>
                      </div>
                    )}
                  </Droppable>
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
          // This safely and atomically creates a new profile with the uploaded data
          importResumeProfile(
            parsedData.profile?.name ? `${parsedData.profile.name}'s Imported Resume` : 'Imported Resume', 
            parsedData
          );
        }}
      />
    </DragDropContext>
  );
}
