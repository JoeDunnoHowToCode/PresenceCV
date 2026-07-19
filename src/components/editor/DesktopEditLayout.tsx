import React, { CSSProperties } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { ICONS, AVAILABLE_BLOCK_ICONS, THEME_COLORS, AVAILABLE_ICONS } from '../../constants';
import ProfileSwitcher from './ProfileSwitcher';
import ThemePicker from './ThemePicker';
import PhotoUploadCrop from './PhotoUploadCrop';
import InfoEditor from './InfoEditor';
import ListBlockEditor from './ListBlockEditor';
import TagsBlockEditor from './TagsBlockEditor';
import { EditorLayoutProps } from './EditorLayoutProps';

export default function DesktopEditLayout(props: EditorLayoutProps) {
  const {
    data, appState, user, activeTab, isMobileMenuOpen, setIsMobileMenuOpen,
    isMobile, openIconMenuId, setOpenIconMenuId, isSidebarCollapsed,
    setIsSidebarCollapsed, setProfileToDelete, setBlockToDelete,
    setIsLogoutModalOpen, openShareModal, isSharing, tabsContainerRef,
    handleTabClick, switchProfile, createProfile, renameProfile, deleteProfile,
    updateThemeColor, updateBlockTitle, updateBlockIcon, removeBlock, snapshotUrl,
    setSnapshotUrl, copiedSection, setCopiedSection, isInitializingLive,
    handleCopyLink, ensureLiveLink, handleExportPDF, updateProfile,
    addContactItem, updateContactItem, removeContactItem,
    addListItem, updateListItem, removeListItem, addTagItem, updateTagItem, removeTagItem,
    addBlock, isShareModalOpen, setIsShareModalOpen, blockToDelete, profileToDelete, setIsImportModalOpen, setActiveTab
  } = props;

  const activeBlock = data.blocks[activeTab];

  return (
    <>
      <div 
        className="min-h-screen bg-bg relative overflow-x-hidden flex flex-row font-sans"
        style={{ '--theme-accent': data.themeColor } as CSSProperties}
      >
        {/* The Animated Background */}
        <div className={`depth-bg ${data.enableAnimation ? 'animated' : ''} absolute inset-0 z-0 pointer-events-none`} />

        {isShareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
            <div className="bg-white p-8 rounded-2xl max-w-lg w-full flex flex-col items-center text-center border border-[#eceae4] shadow-xl relative">
              <button
                onClick={() => { setIsShareModalOpen(false); setSnapshotUrl(null); setCopiedSection(null); }}
                className="absolute top-4 right-4 text-[#5f5f5d] hover:text-[#1c1c1c] transition-colors p-2"
              >
                <LucideIcons.X className="w-5 h-5" />
              </button>

              <LucideIcons.Share2 className="w-10 h-10 text-accent mb-4" />
              <h3 className="text-2xl text-[#1c1c1c] mb-2">Share Your Resume</h3>
              <p className="text-sm text-[#5f5f5d] mb-8">
                Choose how you want to share your profile with the world.
              </p>

              <div className="flex flex-col gap-5 w-full">
                <div className="flex flex-col gap-2 w-full text-left p-4 rounded-xl border border-[#eceae4] bg-[#f9f8f5]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#1c1c1c] font-medium">
                      <LucideIcons.Camera className="w-4 h-4 text-accent" />
                      Snapshot Link
                    </div>
                  </div>
                  <p className="text-xs text-[#5f5f5d]">
                    Captures your resume exactly as it is right now. Automatically updates only when you make changes.
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {isSharing ? (
                      <div className="flex-1 flex items-center gap-2 text-xs text-[#5f5f5d] bg-white border border-[#eceae4] rounded-lg px-3 py-2">
                        <LucideIcons.Loader2 className="w-3 h-3 animate-spin shrink-0" />
                        Generating…
                      </div>
                    ) : snapshotUrl ? (
                      <input
                        readOnly
                        value={snapshotUrl}
                        onClick={e => (e.target as HTMLInputElement).select()}
                        className="flex-1 text-xs bg-white border border-[#eceae4] rounded-lg px-3 py-2 text-[#5f5f5d] outline-none cursor-text select-all"
                      />
                    ) : (
                      <div className="flex-1 text-xs text-red-400 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        Failed to generate. Close and reopen to retry.
                      </div>
                    )}
                    <button
                      onClick={() => snapshotUrl && handleCopyLink(snapshotUrl, 'snapshot')}
                      disabled={!snapshotUrl || isSharing}
                      className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-[#eceae4] hover:bg-[#dcdbd7] disabled:opacity-40 transition-colors"
                    >
                      {copiedSection === 'snapshot'
                        ? <><LucideIcons.Check className="w-3 h-3 text-green-600" /> Copied!</>
                        : <><LucideIcons.Copy className="w-3 h-3" /> Copy</>}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full text-left p-4 rounded-xl border border-accent/20 bg-accent/5">
                  <div className="flex items-center gap-2 text-[#1c1c1c] font-medium">
                    <LucideIcons.Radio className="w-4 h-4 text-accent" />
                    Live Link
                    {data.liveId && (
                      <span className="ml-auto text-[10px] uppercase tracking-widest text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#5f5f5d]">
                    A permanent link that always reflects your latest edits. Tied to this profile — deleting the profile removes the link.
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {isInitializingLive ? (
                      <div className="flex-1 flex items-center gap-2 text-xs text-[#5f5f5d] bg-white border border-[#eceae4] rounded-lg px-3 py-2">
                        <LucideIcons.Loader2 className="w-3 h-3 animate-spin shrink-0" />
                        Creating live link…
                      </div>
                    ) : data.liveId ? (
                      <input
                        readOnly
                        value={`${window.location.origin}/view?live=${data.liveId}`}
                        onClick={e => (e.target as HTMLInputElement).select()}
                        className="flex-1 text-xs bg-white border border-[#eceae4] rounded-lg px-3 py-2 text-[#5f5f5d] outline-none cursor-text select-all"
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
                        className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-[#eceae4] text-[#1c1c1c] hover:bg-[#dcdbd7] transition-colors"
                      >
                        {copiedSection === 'live'
                          ? <><LucideIcons.Check className="w-3 h-3 text-green-600" /> Copied!</>
                          : <><LucideIcons.Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full text-left p-4 rounded-xl border border-[#eceae4] bg-[#f9f8f5]">
                  <div className="flex items-center gap-2 text-[#1c1c1c] font-medium">
                    <LucideIcons.Download className="w-4 h-4 text-accent" />
                    Export PDF
                  </div>
                  <p className="text-xs text-[#5f5f5d]">
                    Generate and download a high-quality PDF version of your resume.
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={handleExportPDF}
                      className="flex-1 flex items-center justify-center gap-2 text-xs text-[#1c1c1c] bg-[#eceae4] border border-[#eceae4] rounded-lg px-3 py-2 hover:bg-[#dcdbd7] transition-colors"
                    >
                      <LucideIcons.Download className="w-3 h-3" />
                      Generate PDF
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {blockToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-2xl max-w-md w-full flex flex-col items-center text-center border border-[#eceae4] shadow-xl"
            >
              <LucideIcons.AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
              <h3 className="text-xl font-medium text-[#1c1c1c] mb-2">Delete Section?</h3>
              <p className="text-sm text-[#5f5f5d] mb-8">
                Are you sure you want to delete "{data.blocks[blockToDelete]?.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => setBlockToDelete(null)}
                  className="flex-1 py-3 rounded-xl bg-[#f7f4ed] hover:bg-[#eceae4] transition-colors text-[#1c1c1c] font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    removeBlock(blockToDelete);
                    if (activeTab === blockToDelete) setActiveTab('info');
                    setBlockToDelete(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 transition-colors text-white font-medium"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {profileToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white p-8 rounded-2xl max-w-md w-full flex flex-col items-center text-center border border-[#eceae4] shadow-xl"
            >
              <LucideIcons.FileWarning className="w-12 h-12 text-red-500 mb-4" />
              {Object.keys(appState.profiles).length <= 1 ? (
                <>
                  <h3 className="text-xl font-medium text-[#1c1c1c] mb-2">Unable to delete the profile</h3>
                  <p className="text-sm text-[#5f5f5d] mb-8">
                    At least one profile must be retained
                  </p>
                  <div className="flex gap-4 w-full">
                    <button
                      onClick={() => setProfileToDelete(null)}
                      className="flex-1 py-3 rounded-xl bg-[#f7f4ed] hover:bg-[#eceae4] transition-colors text-[#1c1c1c] font-medium"
                    >
                      Okay
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-medium text-[#1c1c1c] mb-2">Delete Resume?</h3>
                  <p className="text-sm text-[#5f5f5d] mb-8">
                    Are you sure you want to delete "{appState.profiles[profileToDelete]?.name}"? This action cannot be undone.
                  </p>
                  <div className="flex gap-4 w-full">
                    <button
                      onClick={() => setProfileToDelete(null)}
                      className="flex-1 py-3 rounded-xl bg-[#f7f4ed] hover:bg-[#eceae4] transition-colors text-[#1c1c1c] font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        deleteProfile(profileToDelete);
                        setProfileToDelete(null);
                      }}
                      className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 transition-colors text-white font-medium"
                    >
                      Confirm
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}

        {/* --- Responsive Left Sidebar (Visible on all screens) --- */}
        <div className={`flex flex-col gap-4 py-6 px-3 lg:p-6 shrink-0 z-[60] sticky top-0 h-screen border-r border-[#eceae4] bg-white/60 backdrop-blur-md overflow-visible transition-all duration-300 relative ${isSidebarCollapsed ? 'w-20 md:w-24 lg:p-4' : 'w-20 md:w-24 lg:w-72'}`}>
          
          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white border border-[#eceae4] text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-[#f7f4ed] shadow-sm z-50 transition-colors"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <LucideIcons.ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
          
          {/* Row 1: Logo & Brand */}
          <Link 
            to="/"
            className={`flex items-center gap-3 p-2 group overflow-visible shrink-0 relative lg:ml-2 ${isSidebarCollapsed ? 'justify-center lg:ml-0 lg:p-3' : ''}`}
          >
            <img 
              src="/favicon.png" 
              alt="PresenceCV Logo" 
              className="w-8 h-8 lg:w-9 lg:h-9 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300 min-w-[32px] lg:min-w-[36px]" 
              style={{ mixBlendMode: 'multiply' }}
            />
            <span className={`text-[#1c1c1c] font-semibold tracking-widest text-lg lg:text-xl transition-all whitespace-nowrap lg:relative z-50 lg:pointer-events-auto ${isSidebarCollapsed ? 'hidden' : 'hidden lg:inline-block'}`}>
              PresenceCV
            </span>
          </Link>

          <div className="w-full h-px bg-[#eceae4] my-2 shrink-0" />

          {/* Row 2: User Avatar & Logout */}
          <div className={`flex items-center gap-3 lg:px-5 lg:py-3 p-2 rounded-2xl border border-[#eceae4] bg-white/50 shadow-sm justify-center shrink-0 relative z-40 ${isSidebarCollapsed ? 'flex-col lg:p-3 lg:rounded-2xl' : 'flex-col lg:flex-row lg:justify-start lg:rounded-full'}`}>
             {user?.photoURL ? (
               <img src={user.photoURL} alt="User avatar" className="w-8 h-8 lg:w-7 lg:h-7 rounded-full border border-[#eceae4] shrink-0 object-cover min-w-[32px] lg:min-w-[28px]" />
             ) : (
               <div className="w-8 h-8 lg:w-7 lg:h-7 rounded-full bg-[#1c1c1c]/5 flex items-center justify-center shrink-0 min-w-[32px] lg:min-w-[28px]">
                 <LucideIcons.User className="w-4 h-4 text-[#1c1c1c]" />
               </div>
             )}
             <div className={`flex-1 min-w-0 ${isSidebarCollapsed ? 'hidden' : 'hidden lg:block'}`}>
               <div className="text-xs text-[#5f5f5d] font-medium truncate">{user?.email || 'User'}</div>
             </div>
             
             {/* Log Out Buttons */}
             <button 
               onClick={() => setIsLogoutModalOpen(true)}
               className={`text-[#5f5f5d] hover:text-[#1c1c1c] transition-colors p-2 rounded-full hover:bg-black/5 shrink-0 ${isSidebarCollapsed ? 'hidden' : 'hidden lg:block'}`}
               title="Log Out"
             >
               <LucideIcons.LogOut className="w-4 h-4" />
             </button>
             <button 
               onClick={() => setIsLogoutModalOpen(true)}
               className={`flex items-center justify-center p-2 rounded-full text-[#5f5f5d] hover:text-[#1c1c1c] transition-all hover:bg-black/5 shrink-0 mt-2 border border-[#eceae4] bg-white/50 shadow-sm ${isSidebarCollapsed ? 'lg:flex lg:mt-0 lg:border-none lg:bg-transparent lg:shadow-none' : 'lg:hidden'}`}
               title="Log Out"
             >
               <LucideIcons.LogOut className="w-4 h-4" />
             </button>
          </div>

          <div className="w-full h-px bg-[#eceae4] my-2 shrink-0 hidden lg:block" />

          {/* Row 3: Profile Switcher Dropdown */}
          <ProfileSwitcher 
            profiles={appState.profiles}
            activeProfileId={appState.activeProfileId}
            switchProfile={switchProfile}
            createProfile={createProfile}
            renameProfile={renameProfile}
            setProfileToDelete={setProfileToDelete}
            isCollapsed={isSidebarCollapsed}
          />

          {/* Row 3: Theme Picker Dropdown */}
          <ThemePicker 
            themeColor={data.themeColor}
            updateThemeColor={updateThemeColor}
            THEME_COLORS={THEME_COLORS}
            isCollapsed={isSidebarCollapsed}
          />

          {/* Row 5: Share Button */}
          <button
            onClick={openShareModal}
            disabled={isSharing}
            className={`p-3 lg:px-5 lg:py-3 rounded-full flex items-center justify-center lg:justify-between gap-4 w-full bg-white/50 text-[#1c1c1c] hover:bg-white transition-colors disabled:opacity-50 border border-[#eceae4] shadow-sm group shrink-0 ${isSidebarCollapsed ? 'lg:p-3 lg:justify-center lg:rounded-2xl' : ''}`}
          >
            <div className="flex items-center gap-3">
              <LucideIcons.Share2 className="w-4 h-4 text-accent shrink-0 lg:w-4 lg:h-4" />
              <span className={`text-sm tracking-widest uppercase font-medium ${isSidebarCollapsed ? 'hidden' : 'hidden lg:block'}`}>Share</span>
            </div>
          </button>
        </div>

        {/* --- Main Content Area --- */}
        <div className="flex-1 flex flex-col relative z-10 h-screen overflow-y-auto min-w-0">
          <div className="max-w-5xl mx-auto w-full flex flex-col gap-6 lg:gap-8 mb-16 p-4 lg:p-6 pt-6 lg:pt-10 shrink-0">
          
          {/* Row 1: Main Tabs & Add Block */}
          <div 
            className="flex items-center justify-between gap-2 bg-white/60 p-2 rounded-3xl backdrop-blur-md border border-[#eceae4] w-full relative z-[55] shadow-sm"
          >
            {isMobile ? (
              <div className="relative flex-1 min-w-0">
                 <div 
                   className="flex items-center justify-between w-full px-4 py-2.5 rounded-full whitespace-nowrap bg-[#1c1c1c] text-white font-medium cursor-pointer"
                   onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                 >
                   <div className="flex items-center gap-2 flex-1 min-w-0">
                     {activeTab === 'info' ? <LucideIcons.User className="w-4 h-4 shrink-0" /> : (() => {
                       const block = data.blocks[activeTab];
                       const FinalIcon = block?.icon ? (LucideIcons as any)[block.icon] || LucideIcons.Briefcase : ICONS[activeTab] || LucideIcons.Briefcase;
                       return (
                         <div className="relative shrink-0 flex items-center justify-center">
                           <FinalIcon 
                             onClick={(e: any) => { e.stopPropagation(); setOpenIconMenuId(openIconMenuId === activeTab ? null : activeTab); }}
                             className="w-4 h-4 text-white/70 hover:text-white transition-colors cursor-pointer" 
                           />
                           {openIconMenuId === activeTab && (
                             <div className="absolute top-full left-0 mt-2 bg-[#1c1c1c] border border-white/10 shadow-lg rounded-xl p-3 grid grid-cols-4 gap-3 z-50 w-max">
                               {AVAILABLE_BLOCK_ICONS.map((iconName: string) => {
                                 const OptionIcon = (LucideIcons as any)[iconName];
                                 return OptionIcon ? (
                                   <OptionIcon 
                                     key={iconName} 
                                     className="w-4 h-4 cursor-pointer text-white/50 hover:text-white transition-colors" 
                                     onClick={(e: any) => { e.stopPropagation(); updateBlockIcon(activeTab, iconName); setOpenIconMenuId(null); }}
                                   />
                                 ) : null;
                               })}
                             </div>
                           )}
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
                         className="text-sm tracking-widest uppercase truncate bg-transparent outline-none border-b border-white/20 focus:border-white w-full text-white font-medium pb-0.5 min-w-0"
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
                       className="absolute top-14 left-0 right-0 bg-white rounded-3xl flex flex-col p-2 gap-1 z-50 border border-[#eceae4] shadow-xl min-w-[200px]"
                     >
                       <button
                         onClick={() => { handleTabClick('info'); setIsMobileMenuOpen(false); }}
                         className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'info' ? 'bg-[#f7f4ed] text-[#1c1c1c]' : 'text-[#5f5f5d] hover:bg-black/5 hover:text-[#1c1c1c]'}`}
                       >
                         <LucideIcons.User className="w-4 h-4" />
                         <span className="text-sm tracking-widest uppercase font-medium">Info</span>
                       </button>
                       {data.blockOrder.map(blockId => {
                         const block = data.blocks[blockId];
                         if (!block) return null;
                         return (
                           <div key={blockId} className="group flex items-center gap-2 px-4 py-3 rounded-2xl transition-all cursor-pointer hover:bg-black/5 text-[#5f5f5d] hover:text-[#1c1c1c]" onClick={() => { handleTabClick(blockId); setIsMobileMenuOpen(false); }}>
                             <div className="flex-1 flex items-center gap-3 min-w-0">
                               {block.type === 'list' ? <LucideIcons.List className="w-4 h-4 shrink-0 text-accent" /> : <LucideIcons.Tags className="w-4 h-4 shrink-0 text-accent" />}
                               <span className="text-sm tracking-widest uppercase font-medium truncate">{block.title}</span>
                             </div>
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setBlockToDelete(blockId);
                               }}
                               className="p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                               title="Delete Section"
                             >
                               <LucideIcons.X className="w-3 h-3" />
                             </button>
                           </div>
                         )
                       })}

                        {/* Mobile Controls */}
                        <div className="pt-2 border-t border-[#eceae4] flex flex-col gap-2 pb-1 mt-1">
                          <ProfileSwitcher 
                            profiles={appState.profiles}
                            activeProfileId={appState.activeProfileId}
                            switchProfile={switchProfile}
                            createProfile={createProfile}
                            renameProfile={renameProfile}
                            deleteProfile={deleteProfile}
                            user={user}
                          />
                          <ThemePicker 
                            themeColor={data.themeColor}
                            updateThemeColor={updateThemeColor}
                            THEME_COLORS={THEME_COLORS}
                          />
                        </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>
            ) : (
              <>
                <button
                  onClick={() => handleTabClick('info')}
                  data-active={activeTab === 'info'}
                  className={`mr-2 flex items-center gap-2 px-6 py-2.5 rounded-full transition-all whitespace-nowrap  shrink-0 ${
                    activeTab === 'info' 
                      ? 'bg-[#1c1c1c] text-white font-medium ' 
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
                      className="flex items-center overflow-x-auto glass-scrollbar flex-1 px-2 overscroll-x-contain"
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
                                className={`mr-2 relative flex items-center gap-2 px-6 py-2.5 rounded-full transition-all whitespace-nowrap  shrink-0 group ${snapshot.isDragging ? 'z-50 shadow-2xl' : ''} ${
                                  isActive 
                                    ? 'bg-[#1c1c1c] text-white font-medium ' 
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
                                        {FinalIcon ? (
                                          <FinalIcon 
                                            onClick={(e: any) => { e.stopPropagation(); setOpenIconMenuId(blockId); }}
                                            className="w-4 h-4 text-white/70 hover:text-white transition-colors cursor-pointer" 
                                          />
                                        ) : (
                                          <div 
                                            onClick={(e: any) => { e.stopPropagation(); setOpenIconMenuId(blockId); }}
                                            className="w-4 h-4 rounded-full border border-dashed border-white/30 hover:border-white transition-colors cursor-pointer"
                                          />
                                        )}
                                        {openIconMenuId === blockId && (
                                          <>
                                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenIconMenuId(null); }} />
                                            <div className="absolute top-full left-0 mt-2 bg-white border border-[#eceae4] shadow-lg rounded-xl p-3 grid grid-cols-5 gap-3 z-50 w-max" onClick={e => e.stopPropagation()}>
                                              <div 
                                                className="w-4 h-4 cursor-pointer flex items-center justify-center hover:text-accent transition-colors text-base"
                                                onClick={() => { updateBlockIcon(blockId, ''); setOpenIconMenuId(null); }}
                                                title="No Icon"
                                              >
                                                🚫
                                              </div>
                                              {AVAILABLE_BLOCK_ICONS.map((iconName: string) => {
                                                const OptionIcon = (LucideIcons as any)[iconName];
                                                return OptionIcon ? (
                                                  <OptionIcon 
                                                    key={iconName} 
                                                    className="w-4 h-4 cursor-pointer text-[#5f5f5d] hover:text-accent transition-colors" 
                                                    onClick={() => { updateBlockIcon(blockId, iconName); setOpenIconMenuId(null); }}
                                                  />
                                                ) : null;
                                              })}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                      <input 
                                        value={block.title}
                                        onChange={e => updateBlockTitle(blockId, e.target.value)}
                                        className="text-sm tracking-widest uppercase bg-transparent outline-none border-b border-white/20 focus:border-white w-24 sm:w-32 text-center pb-0.5 text-white font-medium"
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
                                  onClick={(e) => { e.stopPropagation(); setBlockToDelete(blockId); }}
                                  className="w-6 h-6 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 bg-white/10 hover:bg-white/20 text-white"
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
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[10px] sm:text-xs uppercase tracking-widest text-text-secondary hover:text-accent hover:bg-white/5 transition-colors  whitespace-nowrap ${isMobile ? 'flex-1 border border-white/10 bg-white/5' : ''}`}
              >
                <LucideIcons.Plus className="w-3 h-3" /> List View
              </button>
              <button
                onClick={() => {
                  const newId = addBlock('tags');
                  handleTabClick(newId);
                  if (isMobile) setIsMobileMenuOpen(false);
                }}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[10px] sm:text-xs uppercase tracking-widest text-text-secondary hover:text-accent hover:bg-white/5 transition-colors  whitespace-nowrap ${isMobile ? 'flex-1 border border-white/10 bg-white/5' : ''}`}
              >
                <LucideIcons.Plus className="w-3 h-3" /> Tag View
              </button>
            </div>
          </div>

          {/* Row 2: Actions */}
          <div 
            className="flex flex-wrap justify-center gap-4"
          >
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-white px-6 py-3 rounded-full flex items-center justify-center gap-2 text-xs md:text-sm uppercase tracking-widest hover:bg-[#eceae4] transition-colors text-[#1c1c1c] border border-[#eceae4] shadow-sm whitespace-nowrap"
            >
              <LucideIcons.Upload className="w-4 h-4 text-accent" /> Upload Resume
            </button>
            <Link
              to="/view"
              className="bg-white px-6 py-3 rounded-full flex items-center justify-center gap-2 text-xs md:text-sm uppercase tracking-widest hover:bg-[#eceae4] transition-colors text-[#1c1c1c] border border-[#eceae4] shadow-sm whitespace-nowrap"
            >
              <LucideIcons.Eye className="w-4 h-4 text-accent" /> Profile Preview
            </Link>
          </div>
        </div>

        <main className="max-w-4xl mx-auto w-full flex-1 relative px-4 lg:px-6 pb-24 shrink-0 min-w-0">
            {activeTab === 'info' ? (
              <div 
                key="info"
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
              </div>
            ) : activeBlock ? (
              <div key={activeBlock.id}>
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
              </div>
            ) : null}
        </main>
      </div>
    </div>

    </>
  );
}
