/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

/**
 * ViewPage.tsx — Public Resume Viewer & Print Layout
 *
 * A multi-mode component that displays resumes in three distinct ways:
 *
 * 1. Normal View (no query params): Shows the current user's resume from
 *    useResume hook with a dark glassmorphic design. Features tab navigation
 *    with animated transitions between Info, Experience, Skills, etc.
 *
 * 2. Shared View (?id=xxx or ?live=xxx): Fetches resume data from Firestore
 *    (sharedResumes or liveResumes collection) and displays it read-only.
 *    No authentication required — anyone with the link can view.
 *
 * 3. Print View (?print=true): Renders a white, A4-sized layout (794×1122px)
 *    optimized for PDF export via window.print(). Uses a binary search algorithm
 *    (15 iterations) to find the optimal scale factor that fits all content
 *    within one page. Receives data from the editor window via:
 *    - localStorage (RESUME_PRINT_DATA key) — primary
 *    - postMessage (RESUME_DATA_SYNC) — fallback
 *
 * Tag Display Logic:
 *   Tag items use "Category: Skill1, Skill2" format. The component parses
 *   the text at the colon delimiter to display category headers and individual
 *   skill chips. Supports Chinese colons (：) and various separators (,，、).
 *
 * Depends on: useResume, firebase.ts, types.ts, lucide-react, motion
 * Routes: /view, /share/:id, /print/:id
 */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CSSProperties, useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useResume } from '../hooks/useResume';
import { ResumeData, ListItem, TagItem } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatUrl } from '../lib/utils';

const ICONS: Record<string, any> = {
  info: LucideIcons.User,
  experience: LucideIcons.Briefcase,
  education: LucideIcons.GraduationCap,
  skills: LucideIcons.Code,
  languages: LucideIcons.Globe
};

export default function ViewPage({ testData }: { testData?: unknown }) {
  const { data: defaultData } = useResume();
  const [searchParams] = useSearchParams();
  const [remoteData, setRemoteData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const idFromUrl = searchParams.get('id');
  const liveIdFromUrl = searchParams.get('live');
  const isPrint = searchParams.get('print') === 'true';
  const isShared = !!idFromUrl || !!liveIdFromUrl;

  useEffect(() => {
    if (idFromUrl || liveIdFromUrl) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const docRef = doc(db, idFromUrl ? 'sharedResumes' : 'liveResumes', idFromUrl || liveIdFromUrl!);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setRemoteData(docSnap.data() as ResumeData);
          } else {
            setError('Resume not found.');
          }
        } catch (err: any) {
          console.error(err);
          if (err && typeof err === 'object' && 'code' in err && (err as {code: string}).code === 'permission-denied') {
            setError('Permission denied.');
          } else if (err.message && err.message.includes('offline')) {
            setError('Unable to reach the server. Please check your internet connection or the application configuration.');
          } else {
            setError('Failed to load resume. Please verify the link.');
          }
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [idFromUrl, liveIdFromUrl]);

  const [syncData, setSyncData] = useState<ResumeData | null>(null);
  const [printTimeout, setPrintTimeout] = useState(false);
  
  const isSyncPrintWait = isPrint && !idFromUrl && !liveIdFromUrl && !syncData && !printTimeout;
  const data = (testData as ResumeData) || syncData || remoteData || (!isPrint || printTimeout ? defaultData : null);

  useEffect(() => {
    if (isPrint && !idFromUrl && !liveIdFromUrl && !syncData) {
      const timer = setTimeout(() => setPrintTimeout(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isPrint, idFromUrl, liveIdFromUrl, syncData]);

  useEffect(() => {
    if (isPrint) {
      const localPrintDataStr = localStorage.getItem('RESUME_PRINT_DATA');
      if (localPrintDataStr) {
        try {
          const parsed = JSON.parse(localPrintDataStr);
          setSyncData(parsed);
        } catch (e) {
          console.error('Failed to parse print data from localStorage', e);
        }
      }

      if (window.opener) {
        window.opener.postMessage({ type: 'RESUME_DATA_REQUEST' }, '*');
      }
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'RESUME_DATA_SYNC') {
        setSyncData(event.data.data);
        if (window.opener) {
          window.opener.postMessage({ type: 'RESUME_DATA_ACK' }, event.origin);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isPrint]);

  const [activeTab, setActiveTab] = useState('info');
  const [direction, setDirection] = useState(0);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const allTabs = data ? ['info', ...data.blockOrder] : ['info'];

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
  }, [data?.blockOrder, activeTab, allTabs]);

  const handleTabClick = (tabId: string) => {
    const currentIndex = allTabs.indexOf(activeTab);
    const newIndex = allTabs.indexOf(tabId);
    setDirection(newIndex > currentIndex ? 1 : -1);
    setActiveTab(tabId);
  };

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

  const activeBlock = data?.blocks?.[activeTab];

  const printContainerRef = useRef<HTMLDivElement>(null);
  const printContentRef = useRef<HTMLDivElement>(null);
  const [printScale, setPrintScale] = useState(1);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    if (data && !data.profile?.photo) {
      setImagesLoaded(true);
    }
  }, [data, data?.profile?.photo]);

  useEffect(() => {
    if (isPrint && !loading && !error && data) {
      if (!data.profile?.photo) {
        setImagesLoaded(true);
      }
      if (imagesLoaded) {
        if (data.profile?.name) {
          document.title = `PresenceCV_${data.profile.name}`;
        }
        
        let finalScale = 1;
        const targetWidth = 650;
        const targetHeight = 978;
        
        if (printContentRef.current) {
          const el = printContentRef.current;
          let minScale = 0.25; 
          let maxScale = 1.6;
          let bestScale = 1.0;
          const originalWidth = el.style.width;
          const originalTransform = el.style.transform;

          for (let i = 0; i < 15; i++) {
            const midScale = (minScale + maxScale) / 2;
            const testWidth = targetWidth / midScale;
            el.style.transform = 'none';
            el.style.width = `${testWidth}px`;
            el.style.display = 'block';
            const height = el.scrollHeight;
            const scaledHeight = height * midScale;
            if (scaledHeight > targetHeight) {
              maxScale = midScale;
            } else {
              bestScale = midScale;
              minScale = midScale;
            }
          }
          finalScale = bestScale * 0.98;
          el.style.transform = originalTransform;
          el.style.width = originalWidth;
        }
        setPrintScale(finalScale);
        const timer = setTimeout(() => { window.print(); }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [isPrint, loading, error, imagesLoaded, data, syncData]);

  if (loading || isSyncPrintWait) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white overflow-hidden">
         <div className="depth-bg animated" />
         <div className="flex flex-col items-center gap-4 relative z-10">
           <span className="w-12 h-12 rounded-full border-4 border-white/10 border-t-white animate-spin mb-4" />
           <p className="text-xl tracking-widest uppercase font-light text-text-secondary">
             {isSyncPrintWait ? 'Preparing Document...' : 'Loading Profile...'}
           </p>
         </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white overflow-hidden">
         <div className="depth-bg animated" />
         <div className="flex flex-col items-center gap-4 relative z-10 text-center max-w-md px-6">
           <LucideIcons.AlertTriangle className="w-16 h-16 text-red-500 mb-2" />
           <p className="text-xl tracking-widest uppercase font-light text-white mb-2">Error</p>
           <p className="text-text-secondary">{error}</p>
           <Link to="/edit" className="mt-8 px-8 py-3 rounded-full border border-white/10 text-white hover:bg-white/10 transition-colors uppercase tracking-widest text-sm">
             Go to Editor
           </Link>
         </div>
      </div>
    );
  }

  if (isPrint && data) {
    return (
      <div 
        ref={printContainerRef}
        className="bg-white text-black font-sans print-page-container relative shadow-2xl" 
        style={{ '--theme-accent': data.themeColor } as CSSProperties}
      >
        <div className="print-page-padding">
          <div
            ref={printContentRef}
            className="absolute top-[72px] left-[72px]"
            style={{ width: `${650 / printScale}px`, transform: printScale !== 1 ? `scale(${printScale})` : 'none', transformOrigin: 'top left' }}
          >
            <div className="w-full flex flex-col mb-12">
            <div className={`flex flex-row w-full gap-8 ${
            data.profile.photo ? (data.profile.photoPosition === 'right' ? 'flex-row-reverse' : '') : ''
          }`}>
            {data.profile.photo && (
              <div className="w-48 h-48 rounded-full overflow-hidden shrink-0 border-4" style={{ borderColor: 'color-mix(in srgb, var(--theme-accent) 60%, black)' }}>
                <img 
                  src={data.profile.photo} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                  onLoad={() => setImagesLoaded(true)}
                  onError={() => setImagesLoaded(true)}
                />
              </div>
            )}
            <div className={`flex flex-col justify-center w-full ${
              data.profile.photo 
                ? (data.profile.photoPosition === 'right' ? 'text-right items-end' : 'text-left items-start')
                : 'text-center items-center'
            }`}>
              <h1 className="font-serif text-6xl font-bold mb-4" style={{ color: 'color-mix(in srgb, var(--theme-accent) 60%, black)' }}>{data.profile.name}</h1>
              <p className="text-xl tracking-widest uppercase text-gray-500 font-['Georgia'] mb-6">{data.profile.title}</p>
              
              <div className={`flex flex-wrap items-center gap-6 text-gray-600 ${
                data.profile.photo 
                  ? data.profile.photoPosition === 'right' ? 'justify-end' : 'justify-start'
                  : 'justify-center'
              }`}>
                {data.profile.contactItems?.map((item: any) => {
                  const Icon = (LucideIcons as any)[item.icon] || LucideIcons.Link;
                  return (
                    <div key={item.id} className="flex items-center gap-2">
                      {item.url ? (
                        <a href={formatUrl(item.url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-['Georgia']" style={{ color: 'inherit', textDecoration: 'none' }}>
                          <Icon className="w-4 h-4 shrink-0" style={{ color: 'color-mix(in srgb, var(--theme-accent) 60%, black)' }} />
                          {item.text}
                        </a>
                      ) : (
                        <>
                          <Icon className="w-4 h-4 shrink-0" style={{ color: 'color-mix(in srgb, var(--theme-accent) 60%, black)' }} />
                          <span className="text-sm font-['Georgia']">{item.text}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {data.profile.summary && (
            <div className="mt-12 w-full text-lg leading-relaxed text-gray-700 italic font-['Georgia'] text-left">
              {data.profile.summary}
            </div>
          )}
        </div>

        {data.blockOrder.map(blockId => {
          const block = data.blocks[blockId];
          if (!block) return null;
          return (
            <div key={block.id} className="w-full mb-12">
              <h2 className="text-2xl font-serif mb-8 border-b-2 pb-2 uppercase tracking-wider" style={{ borderColor: 'color-mix(in srgb, var(--theme-accent) 60%, black)', color: 'color-mix(in srgb, var(--theme-accent) 60%, black)' }}>
                {block.title}
              </h2>
              
              {block.type === 'list' && (
                <div className="space-y-8">
                  {block.items.map((item: ListItem) => (
                    <div key={item.id} className="flex flex-col gap-1">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-serif text-xl font-bold text-gray-900">{item.title}</h3>
                        <span className="text-sm tracking-widest uppercase text-gray-500 whitespace-nowrap ml-4">{item.period}</span>
                      </div>
                      {item.subtitle && (
                        <div className="text-sm tracking-widest text-gray-500 mb-2">
                          {item.subtitle}
                        </div>
                      )}
                      {item.description && (
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {block.type === 'tags' && (
                <div className="grid grid-cols-3 gap-6">
                  {block.items.map((item: TagItem) => {
                    let idx = item.text.indexOf(':');
                    if (idx === -1) idx = item.text.indexOf('：');

                    let category: string;
                    let tags: string[];
                    if (idx > -1) {
                      category = item.text.slice(0, idx).trim();
                      tags = item.text.slice(idx + 1).split(/[,，、]\s*(?![^()]*\))/).map(s => s?.trim()).filter(Boolean);
                    } else if (item.text.match(/[,，、]/)) {
                      category = 'Skills';
                      tags = item.text.split(/[,，、]\s*(?![^()]*\))/).map(s => s?.trim()).filter(Boolean);
                    } else {
                      tags = [item.text];
                      category = 'Expertise';
                    }

                    return (
                      <div key={item.id} className="p-4 border rounded-xl bg-gray-50 flex flex-col" style={{ borderColor: 'color-mix(in srgb, var(--theme-accent) 60%, black)' }}>
                        <h4 className="text-sm font-bold tracking-widest mb-3 text-gray-900">{category.toUpperCase()}</h4>
                        <div className="flex flex-wrap gap-2">
                          {tags.map((t, i) => (
                            <span key={i} className="px-3 py-1 bg-white border rounded-lg text-xs text-gray-600 block">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative p-6 md:p-12 lg:p-24 overflow-x-hidden flex flex-col"
      style={{ '--theme-accent': data.themeColor } as CSSProperties}
    >
      <div className={`depth-bg ${data.enableAnimation ? 'animated' : ''}`} />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto w-full flex flex-col xl:flex-row justify-between items-center gap-6 mb-16 relative z-10"
      >
        <div className="flex-1 hidden xl:block"></div>

        <div 
          ref={tabsContainerRef}
          className="flex items-center justify-between gap-2 bg-white/50 py-2 px-[15px] rounded-3xl backdrop-blur-md border border-[#eceae4] xl:w-[1310px] h-[70px] xl:-ml-[100px] xl:-mr-[5px] text-center text-[#1c1c1c] text-base font-normal leading-6 no-underline overflow-x-auto glass-scrollbar overscroll-x-contain w-full shadow-sm"
        >
          {allTabs.map((blockId) => {
            const isInfo = blockId === 'info';
            const block = isInfo ? { id: 'info', title: 'Info', type: 'info', items: [] } : data.blocks[blockId];
            if (!block) return null;
            const Icon = (block as any).icon ? (LucideIcons as any)[(block as any).icon] || LucideIcons.Briefcase : ICONS[blockId] || LucideIcons.Briefcase;
            const isActive = activeTab === blockId;

            return (
              <button
                key={block.id}
                onClick={() => handleTabClick(blockId)}
                data-active={isActive}
                className={`flex items-center justify-center gap-2 w-[150px] h-[45px] rounded-full transition-all whitespace-nowrap  shrink-0 ${
                  isActive 
                    ? 'bg-accent text-[#f7f4ed] font-medium shadow-md shadow-accent/20' 
                    : 'text-[#5f5f5d] hover:text-accent hover:bg-black/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm tracking-widest uppercase">{block.title}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 flex justify-end w-full xl:w-auto">
          {!isShared && (
            <Link
              to="/edit"
              className="bg-white px-6 py-3 rounded-full flex items-center justify-center gap-2 text-sm uppercase tracking-widest hover:bg-[#eceae4] transition-colors text-[#1c1c1c] border border-[#eceae4] shadow-sm hover:text-accent  whitespace-nowrap"
            >
              <LucideIcons.Edit2 className="w-4 h-4" /> Edit Profile
            </Link>
          )}
        </div>
      </motion.div>

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
              className="flex flex-col items-center py-12"
            >
              <div className={`flex flex-col md:flex-row w-full mb-16 gap-12 lg:gap-24 ${
                data.profile.photo 
                  ? data.profile.photoPosition === 'right' 
                    ? 'md:flex-row-reverse justify-center md:items-start' 
                    : 'justify-center md:items-start'
                  : 'justify-center items-center text-center'
              }`}>
                {data.profile.photo && (
                  <div className={`shrink-0 flex items-center justify-center pt-2 ${
                    data.profile.photoPosition === 'right' ? 'md:justify-start' : 'md:justify-end'
                  }`}>
                     <div className="w-48 h-48 md:w-64 md:h-64 rounded-[2rem] overflow-hidden bg-white p-2 border border-[#eceae4] rotate-3 hover:rotate-0 transition-transform duration-500 shadow-xl">
                       <img src={data.profile.photo} alt="Profile" className="w-full h-full object-cover rounded-[1.5rem]" />
                     </div>
                  </div>
                )}

                <div className={`flex flex-col space-y-10 ${
                  data.profile.photo 
                    ? data.profile.photoPosition === 'right'
                      ? 'items-center text-center md:items-end md:text-right'
                      : 'items-center text-center md:items-start md:text-left'
                    : 'items-center text-center'
                }`}>
                  <div>
                    <h1 className="font-serif text-6xl md:text-8xl font-light leading-none text-accent mb-6  cursor-default">{data.profile.name}</h1>
                    <p className="text-lg md:text-xl tracking-[0.4em] uppercase text-[#5f5f5d]  cursor-default font-['Georgia']">{data.profile.title}</p>
                  </div>

                  <div className={`flex flex-wrap items-center gap-6 md:gap-8 text-[#5f5f5d] ${
                    data.profile.photo 
                      ? data.profile.photoPosition === 'right'
                        ? 'justify-center md:justify-end'
                        : 'justify-center md:justify-start'
                      : 'justify-center'
                  }`}>
                    {data.profile.contactItems?.map(item => {
                      const Icon = (LucideIcons as any)[item.icon] || LucideIcons.Link;
                      return (
                        <div key={item.id} className={`flex items-center  cursor-pointer ${
                          data.profile.photo && data.profile.photoPosition === 'right' ? 'flex-row-reverse md:flex-row' : ''
                        }`}>
                          {item.url ? (
                            <a href={formatUrl(item.url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-lg hover:text-accent transition-colors font-['Georgia'] font-bold">
                              <Icon className="w-5 h-5 shrink-0 text-accent" />
                              {item.text}
                            </a>
                          ) : (
                            <div className="flex items-center gap-3">
                              <Icon className="w-5 h-5 shrink-0 text-accent" />
                              <span className="text-lg font-['Georgia'] cursor-default">{item.text}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="max-w-[900px] w-full px-4 flex justify-center pb-12">
                <div style={{ width: `${data.profile.summaryWidth || 100}%` }} className="relative">
                  <p 
                    className="italic text-2xl leading-relaxed text-[#5f5f5d]  cursor-default font-['Georgia'] w-full md:w-[900px] text-left"
                  >
                    {data.profile.summary}
                  </p>
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
              {activeBlock.type === 'list' && (
                <div className="space-y-12">
                  {activeBlock.items.map((item: ListItem) => (
                    <div 
                      key={item.id} 
                      className="relative pl-8 before:absolute before:left-0 before:top-2 before:bottom-0 before:w-px before:bg-[#eceae4]"
                    >
                      <div className="absolute left-[-4px] top-2.5 w-2 h-2 rounded-full bg-accent " />
                      <div className="group">
                        <h3 className="font-serif text-3xl mb-2 group-hover:text-accent transition-colors  cursor-default">{item.title}</h3>
                        <div className="text-xs tracking-widest text-[#5f5f5d] mb-4  cursor-default">
                          {item.subtitle && <span className="text-[#1c1c1c] font-medium">{item.subtitle}</span>} 
                          {item.subtitle && item.period && " • "} 
                          {item.period}
                        </div>
                        {item.description && (
                          <p className="text-sm text-[#5f5f5d] leading-relaxed whitespace-pre-wrap  cursor-default">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeBlock.type === 'tags' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 w-[100vw] max-w-[1400px] relative left-1/2 -translate-x-1/2 px-6 md:px-12">
                  {activeBlock.items.map((item: TagItem) => {
                    let idx = item.text.indexOf(':');
                    if (idx === -1) idx = item.text.indexOf('：');

                    let category: string;
                    let tags: string[];
                    
                    if (idx > -1) {
                      category = item.text.slice(0, idx).trim();
                      tags = item.text.slice(idx + 1).split(/[,，、]\s*(?![^()]*\))/).map(s => s?.trim()).filter(Boolean);
                    } else if (item.text.match(/[,，、]/)) {
                      category = 'Skills';
                      tags = item.text.split(/[,，、]\s*(?![^()]*\))/).map(s => s?.trim()).filter(Boolean);
                    } else {
                      tags = [item.text];
                      category = 'Expertise';
                    }

                    return (
                      <div 
                        key={item.id} 
                        className="bg-white p-6 md:p-8 rounded-3xl flex flex-col gap-6 border border-[#eceae4]  cursor-default transition-all duration-300 xl:min-h-[350px] min-h-[150px] shadow-sm hover:shadow-md hover:-translate-y-1 content-start"
                      >
                        <div className="flex items-center gap-3 border-b border-[#eceae4] pb-4">
                           <div className="w-1.5 h-1.5 rounded-full bg-accent " />
                           <h4 className="text-sm xl:text-base tracking-widest text-[#1c1c1c] font-medium">{category.toUpperCase()}</h4>
                        </div>
                        <div className="flex flex-wrap xl:flex-col gap-2 xl:gap-4 mt-2">
                          {tags.map((t, i) => (
                            <span 
                              key={i} 
                              className="px-4 py-2 xl:px-0 xl:py-1 xl:bg-transparent bg-black/5 rounded-lg xl:rounded-none text-xs xl:text-sm text-[#5f5f5d] xl:border-none border border-transparent hover:text-accent hover:bg-black/10 xl:hover:bg-transparent xl:hover:translate-x-2 transition-all flex items-center w-auto xl:w-full"
                            >
                              <span className="hidden xl:inline-block w-1 h-1 bg-[#eceae4] rounded-full mr-3.5 flex-shrink-0" />
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}
