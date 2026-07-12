import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { motion } from 'framer-motion';

interface ProfileSwitcherProps {
  profiles: Record<string, any>;
  activeProfileId: string;
  switchProfile: (id: string) => void;
  createProfile: (name: string) => void;
  renameProfile: (id: string, name: string) => void;
  setProfileToDelete: (id: string | null) => void;
  user: any;
  isMobile: boolean;
  navigate: (path: string) => void;
}

const ProfileSwitcher = React.memo(({
  profiles,
  activeProfileId,
  switchProfile,
  createProfile,
  renameProfile,
  setProfileToDelete,
  user,
  isMobile,
  navigate
}: ProfileSwitcherProps) => {
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  const sortedProfiles = Object.values(profiles).sort((a: any, b: any) => {
    const getTs = (id: string) => {
      if (id === 'main') return 0;
      const match = id.match(/\d+/);
      return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
    };
    return getTs(a.id) - getTs(b.id);
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-4 p-2 w-full border-b border-white/5 pb-6"
    >
      <div className="flex items-center gap-2 overflow-x-auto glass-scrollbar pb-2 pt-1 flex-1">
        {sortedProfiles.map((profile: any) => (
          <div key={profile.id} className="relative group flex items-center shrink-0">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all cursor-pointer ${
                activeProfileId === profile.id
                  ? 'bg-accent/10 border border-accent/20 text-white'
                  : 'bg-white/5 text-text-secondary hover:bg-white/10'
              }`}
              onClick={() => switchProfile(profile.id)}
            >
              <LucideIcons.FileText className={`w-3.5 h-3.5 ${activeProfileId === profile.id ? 'text-accent' : ''}`} />
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
                  className="bg-transparent border-b border-accent outline-none text-sm w-24 text-white"
                />
              ) : (
                <span className="text-sm font-medium tracking-wide">
                  {profile.name}
                </span>
              )}
            </div>
            
            {activeProfileId === profile.id && (
              <div className={`absolute -top-2 -right-2 flex gap-1 transition-opacity drop-shadow-md ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingProfileId(profile.id); }}
                  className="p-1.5 rounded-full bg-blue-500 hover:bg-blue-400 text-white shadow-lg"
                  title="Rename Resume"
                >
                  <LucideIcons.Edit2 className="w-3.5 h-3.5" />
                </button>
                {Object.keys(profiles).length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setProfileToDelete(profile.id); }}
                    className="p-1.5 rounded-full bg-red-500 hover:bg-red-400 text-white shadow-lg"
                    title="Delete Resume"
                  >
                    <LucideIcons.X className="w-3.5 h-3.5" />
                  </button>
                )}
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
  );
});

export default ProfileSwitcher;
