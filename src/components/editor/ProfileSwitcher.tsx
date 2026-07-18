import React, { useState, useRef, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileSwitcherProps {
  profiles: Record<string, any>;
  activeProfileId: string;
  switchProfile: (id: string) => void;
  createProfile: (name: string) => void;
  renameProfile: (id: string, name: string) => void;
  setProfileToDelete: (id: string | null) => void;
}

const ProfileSwitcher = React.memo(({
  profiles,
  activeProfileId,
  switchProfile,
  createProfile,
  renameProfile,
  setProfileToDelete,
}: ProfileSwitcherProps) => {
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

  const sortedProfiles = Object.values(profiles).sort((a: any, b: any) => {
    const getTs = (id: string) => {
      if (id === 'main') return 0;
      const match = id.match(/\d+/);
      return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
    };
    return getTs(a.id) - getTs(b.id);
  });

  const activeProfile = profiles[activeProfileId];

  return (
    <div className="relative z-[60]" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="glass px-5 py-3 rounded-full flex items-center justify-between gap-4 w-64 hover:bg-white/10 transition-colors border border-white/10 hover:border-white/20 hover-glow group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <LucideIcons.FileText className="w-4 h-4 text-accent shrink-0" />
          <span className="text-sm tracking-widest uppercase truncate font-medium text-white">{activeProfile?.name || 'Resume'}</span>
        </div>
        <LucideIcons.ChevronDown className={`w-4 h-4 text-text-secondary transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 glass p-2 rounded-2xl flex flex-col gap-1 w-80 border border-white/10 shadow-2xl backdrop-blur-xl bg-black/40"
          >
            <button
              onClick={() => { createProfile('New Resume'); setIsOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-text-secondary hover:text-white group"
            >
              <LucideIcons.Copy className="w-4 h-4 group-hover:text-accent transition-colors" />
              <span className="text-sm tracking-widest uppercase font-medium">Copy Current Profile</span>
            </button>
            
            <div className="w-full h-px bg-white/10 my-1" />
            
            <div className="max-h-64 overflow-y-auto glass-scrollbar flex flex-col gap-1">
              {sortedProfiles.map((profile: any) => (
                <div key={profile.id} className="flex items-center group relative rounded-xl hover:bg-white/5 transition-colors">
                  <button
                    onClick={() => { 
                      if (editingProfileId !== profile.id) {
                        switchProfile(profile.id);
                        setIsOpen(false);
                      }
                    }}
                    className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left truncate ${
                      activeProfileId === profile.id ? 'bg-accent/10 text-white border border-accent/20' : 'text-text-secondary hover:text-white border border-transparent'
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
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            if (e.currentTarget.value.trim()) renameProfile(profile.id, e.currentTarget.value.trim());
                            setEditingProfileId(null);
                          }
                        }}
                        onClick={e => e.stopPropagation()}
                        className="bg-black/20 border border-accent/50 outline-none text-sm w-full text-white px-2 py-1 rounded tracking-widest uppercase"
                      />
                    ) : (
                      <span className={`text-sm tracking-widest uppercase truncate font-medium ${activeProfileId === profile.id ? 'pl-2' : ''}`}>
                        {profile.name}
                      </span>
                    )}
                  </button>
                  
                  {editingProfileId !== profile.id && (
                    <div className="absolute right-2 flex gap-1 bg-gradient-to-l from-bg via-bg to-transparent pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingProfileId(profile.id); }}
                        className="p-2 text-text-secondary hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Edit Name"
                      >
                        <LucideIcons.Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {Object.keys(profiles).length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setProfileToDelete(profile.id); setIsOpen(false); }}
                          className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete Profile"
                        >
                          <LucideIcons.Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default ProfileSwitcher;
