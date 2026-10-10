import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotice } from '../../contexts/NoticeContext';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface ProfileSwitcherProps {
  isCollapsed?: boolean;
  profiles: Record<string, any>;
  profileOrder?: string[];
  activeProfileId: string;
  switchProfile: (id: string) => void;
  createProfile: (name: string) => void;
  renameProfile: (id: string, name: string) => void;
  setProfileToDelete: (id: string | null) => void;
  reorderProfiles?: (startIndex: number, endIndex: number) => void;
  isPro?: boolean;
  isAdmin?: boolean;
}

const ProfileSwitcher = React.memo(({
  profiles,
  profileOrder,
  activeProfileId,
  switchProfile,
  createProfile,
  renameProfile,
  setProfileToDelete,
  reorderProfiles,
  isCollapsed,
  isPro,
  isAdmin,
}: ProfileSwitcherProps) => {
  const { t } = useTranslation();
  const { notify } = useNotice();
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setEditingProfileId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortedProfiles = useMemo(() => {
    if (profileOrder && profileOrder.length > 0) {
      const map = new Map(Object.entries(profiles));
      const result: any[] = [];
      for (const id of profileOrder) {
        if (map.has(id)) {
          result.push(map.get(id));
          map.delete(id);
        }
      }
      for (const profile of map.values()) {
        result.push(profile);
      }
      return result;
    }
    return Object.values(profiles).sort((a: any, b: any) => {
      const getTs = (id: string) => {
        if (id === 'main') return 0;
        const match = id.match(/\d+/);
        return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
      };
      return getTs(a.id) - getTs(b.id);
    });
  }, [profiles, profileOrder]);

  const activeProfile = profiles[activeProfileId];

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !reorderProfiles) return;
    if (result.destination.index === result.source.index) return;
    reorderProfiles(result.source.index, result.destination.index);
  };

  return (
    <div className="relative z-[60] w-full" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`p-2 rounded-2xl lg:rounded-full flex items-center justify-between gap-2 lg:gap-4 w-full bg-white/50 hover:bg-white transition-colors border border-[#eceae4] shadow-sm group ${isCollapsed ? 'lg:p-3 lg:justify-center lg:rounded-2xl' : 'px-3 py-1.5 lg:px-5 lg:py-3'}`}
      >
        <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
          <LucideIcons.FileText className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-accent shrink-0" />
          <span className={`text-xs lg:text-sm tracking-widest truncate font-medium text-[#1c1c1c] ${isCollapsed ? 'hidden' : 'inline-block'}`}>{activeProfile?.name || t('editor.profileSwitcher.defaultName')}</span>
        </div>
        <LucideIcons.ChevronDown className={`w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#5f5f5d] transition-transform shrink-0 ${isCollapsed ? 'hidden' : 'inline-block'} ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 bg-white p-2 rounded-2xl flex flex-col gap-1 w-80 border border-[#eceae4] shadow-xl z-50"
          >
            <button
              onClick={() => {
                if (!isPro && !isAdmin && Object.keys(profiles).length >= 3) {
                  notify(t('editor.profileSwitcher.limitReached'));
                  return;
                }
                createProfile(t('editor.profileSwitcher.newProfileName'));
                setIsOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 transition-colors text-[#5f5f5d] hover:text-[#1c1c1c] group"
            >
              <LucideIcons.Copy className="w-4 h-4 group-hover:text-accent transition-colors" />
              <span className="text-sm tracking-widest font-medium">{t('editor.profileSwitcher.createNew')}</span>
            </button>
            
            <div className="w-full h-px bg-[#eceae4] my-1" />
            
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="profiles-list" type="profiles">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="max-h-64 overflow-y-auto flex flex-col gap-1">
                    {sortedProfiles.map((profile: any, index: number) => (
                      // @ts-expect-error hello-pangea/dnd types don't officially include key but React requires it
                      <Draggable key={profile.id} draggableId={profile.id} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center group relative rounded-xl hover:bg-black/5 transition-colors ${
                              snapshot.isDragging ? 'z-50 shadow-2xl bg-white border border-[#eceae4]' : ''
                            }`}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="pl-2 pr-1 text-[#a3a3a0] hover:text-accent cursor-grab active:cursor-grabbing transition-colors shrink-0"
                              title="Drag to reorder"
                            >
                              <LucideIcons.GripVertical className="w-3.5 h-3.5" />
                            </div>

                            <button
                              onClick={() => { 
                                if (editingProfileId !== profile.id) {
                                  switchProfile(profile.id);
                                  setIsOpen(false);
                                }
                              }}
                              className={`flex-1 flex items-center gap-3 pl-2 pr-20 py-3 rounded-xl transition-all text-left min-w-0 ${
                                activeProfileId === profile.id ? 'bg-[#f7f4ed] text-[#1c1c1c] border border-[#eceae4]' : 'text-[#5f5f5d] hover:text-[#1c1c1c] border border-transparent'
                              }`}
                            >
                              {activeProfileId === profile.id && editingProfileId !== profile.id && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-accent rounded-r-full" />
                              )}
                              
                              {editingProfileId === profile.id ? (
                                <input
                                  autoFocus
                                  defaultValue={profile.name}
                                  onBlur={(e) => {
                                    if (e.target.value.trim()) renameProfile(profile.id, e.target.value.trim());
                                    setEditingProfileId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      renameProfile(profile.id, e.currentTarget.value);
                                      setEditingProfileId(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingProfileId(null);
                                    }
                                  }}
                                  className="w-full bg-transparent border-none outline-none text-sm tracking-widest font-medium text-[#1c1c1c]"
                                />
                              ) : (
                                <span className="text-sm tracking-widest font-medium truncate flex-1 min-w-0">
                                  {profile.name}
                                </span>
                              )}
                            </button>
                            
                            <div className="absolute right-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center gap-0.5 z-10">
                              {sortedProfiles.length > 1 && reorderProfiles && (
                                <>
                                  <button
                                    disabled={index === 0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (index > 0) reorderProfiles(index, index - 1);
                                    }}
                                    className="p-1 rounded-lg text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-black/10 transition-colors disabled:opacity-20 disabled:hover:bg-transparent"
                                    title="Move Up"
                                  >
                                    <LucideIcons.ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    disabled={index === sortedProfiles.length - 1}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (index < sortedProfiles.length - 1) reorderProfiles(index, index + 1);
                                    }}
                                    className="p-1 rounded-lg text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-black/10 transition-colors disabled:opacity-20 disabled:hover:bg-transparent"
                                    title="Move Down"
                                  >
                                    <LucideIcons.ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingProfileId(profile.id);
                                }}
                                className="p-1.5 rounded-lg text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-black/10 transition-colors"
                                title={t('editor.profileSwitcher.rename')}
                              >
                                <LucideIcons.Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {Object.keys(profiles).length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProfileToDelete(profile.id);
                                  }}
                                  className="p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  title={t('editor.profileSwitcher.delete')}
                                >
                                  <LucideIcons.Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default ProfileSwitcher;
