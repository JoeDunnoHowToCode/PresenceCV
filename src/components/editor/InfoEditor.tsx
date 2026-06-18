import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import isEqual from 'fast-deep-equal';
import { ContactItem, ResumeData } from '../../types';

interface InfoEditorProps {
  data: ResumeData;
  updateProfile: <K extends keyof ResumeData['profile']>(field: K, value: ResumeData['profile'][K]) => void;
  updateContactItem: (id: string, field: string, value: string) => void;
  removeContactItem: (id: string) => void;
  addContactItem: () => void;
  AVAILABLE_ICONS: string[];
}

// Custom hook for debounced local state
export function useDebouncedInput(
  initialValue: string,
  onSave: (value: string) => void,
  delay: number = 1000
) {
  const [value, setValue] = useState(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDirty = useRef(false);

  useEffect(() => {
    if (initialValue === value) {
      isDirty.current = false;
    }
    if (!isDirty.current) {
      setValue(initialValue);
    }
  }, [initialValue, value]);

  useEffect(() => {
    return () => {
      // Force save on unmount if dirty
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (isDirty.current) {
        onSave(value);
      }
    };
  }, [value, onSave]);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    isDirty.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onSave(newValue);
      isDirty.current = false;
    }, delay);
  };

  const handleBlur = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (isDirty.current) {
      onSave(value);
      isDirty.current = false;
    }
  };

  return { value, handleChange, handleBlur };
}

const InfoEditor = React.memo(({ data, updateProfile, updateContactItem, removeContactItem, addContactItem, AVAILABLE_ICONS }: InfoEditorProps) => {
  const summaryAlign = data.profile.summaryAlign || 'center';

  const nameInput = useDebouncedInput(data.profile.name, (val) => updateProfile('name', val));
  const titleInput = useDebouncedInput(data.profile.title, (val) => updateProfile('title', val));
  const summaryInput = useDebouncedInput(data.profile.summary, (val) => updateProfile('summary', val));

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ATS and Word Count states
  const [targetRole, setTargetRole] = useState(data.profile.title || '');
  const [showAts, setShowAts] = useState(false);
  const [mockAtsResult, setMockAtsResult] = useState<{ score: number, matched: string[], missing: string[] } | null>(null);

  useEffect(() => {
    if (!targetRole && data.profile.title) {
      setTargetRole(data.profile.title);
    }
  }, [data.profile.title, targetRole]);

  // 中文字一個算一字元，標點符號不算 (移除所有標點與空白)
  const charCount = (summaryInput.value || '').replace(/[\p{P}\p{S}\s]/gu, '').length;
  let countColor = 'text-text-secondary';
  let countStatus = 'Type your summary';
  if (charCount > 0) {
    if (charCount < 150) {
      countColor = 'text-yellow-400';
      countStatus = 'Too short (optimal: 150-250)';
    } else if (charCount >= 150 && charCount <= 250) {
      countColor = 'text-green-400';
      countStatus = 'Optimal length!';
    } else {
      countColor = 'text-yellow-400';
      countStatus = 'A bit long (ATS prefers concise)';
    }
  }

  const handleAtsCheck = () => {
    if (!targetRole.trim()) return;
    const text = summaryInput.value.toLowerCase();
    const roleKeywords = targetRole.toLowerCase().split(/\s+/).filter(w => w.trim().length > 0);
    // Add some generic strong keywords to check
    const keywords = [...(roleKeywords.length ? roleKeywords : [targetRole.trim().toLowerCase()]), 'experience', 'strategy', 'impact'];
    const matched = keywords.filter(k => text.includes(k));
    const missing = keywords.filter(k => !text.includes(k));
    setMockAtsResult({ 
      score: Math.round((matched.length / keywords.length) * 100) || 0, 
      matched, 
      missing 
    });
  };



  return (
    <div className="flex flex-col items-center text-center space-y-12 py-12 w-full">
      <div className="w-full flex flex-col items-center">
        <input
          value={nameInput.value}
          onChange={(e) => nameInput.handleChange(e.target.value)}
          onBlur={nameInput.handleBlur}
          className="font-serif text-6xl md:text-8xl font-light leading-none text-accent mb-6 outline-none focus:border-b focus:border-accent/50 border-b border-transparent transition-colors min-w-[100px] hover-glow text-center bg-transparent w-full"
          placeholder="Your Name"
        />
        <input
          value={titleInput.value}
          onChange={(e) => titleInput.handleChange(e.target.value)}
          onBlur={titleInput.handleBlur}
          className="text-lg md:text-xl tracking-[0.4em] uppercase text-text-secondary outline-none focus:border-b focus:border-accent/50 border-b border-transparent transition-colors min-w-[100px] hover-glow-text text-center font-['Georgia'] bg-transparent w-full"
          placeholder="Professional Title"
        />
      </div>

      <div className="flex flex-col items-center justify-center gap-4 w-full max-w-2xl">
        {data.profile.contactItems?.map((item) => {
          const Icon = (LucideIcons as any)[item.icon] || LucideIcons.Link;
          return (
            <ContactItemEditor
              key={item.id}
              item={item}
              Icon={Icon}
              updateContactItem={updateContactItem}
              removeContactItem={removeContactItem}
              AVAILABLE_ICONS={AVAILABLE_ICONS}
            />
          );
        })}
        <button
          onClick={addContactItem}
          className="mt-2 flex items-center gap-2 text-xs uppercase tracking-widest text-text-secondary hover:text-accent transition-colors"
        >
          <LucideIcons.Plus className="w-3 h-3" /> Add Link
        </button>
      </div>

      <div 
        className="max-w-4xl w-full px-4 flex flex-col items-center group relative cursor-text"
        onClick={(e) => {
          const textarea = textareaRef.current;
          const target = e.target as HTMLElement;
          if (textarea && target.tagName !== 'BUTTON' && target.tagName !== 'INPUT') {
            textarea.focus();
            if (target !== textarea) {
              const len = textarea.value.length;
              textarea.setSelectionRange(len, len);
            }
          }
        }}
      >
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all glass px-4 py-2 rounded-full z-20 pointer-events-none group-hover:pointer-events-auto shadow-xl before:absolute before:-top-16 before:-left-10 before:-right-10 before:h-16 before:content-['']">
          <div className="flex items-center gap-1">
            {['left', 'center', 'right', 'justify'].map(align => (
              <button
                key={align}
                onClick={() => updateProfile('summaryAlign', align)}
                className={`p-1.5 rounded-md transition-colors ${summaryAlign === align ? 'bg-white/20 text-white' : 'text-text-secondary hover:bg-white/10'}`}
                title={`Align ${align}`}
              >
                {align === 'left' && <LucideIcons.AlignLeft className="w-4 h-4" />}
                {align === 'center' && <LucideIcons.AlignCenter className="w-4 h-4" />}
                {align === 'right' && <LucideIcons.AlignRight className="w-4 h-4" />}
                {align === 'justify' && <LucideIcons.AlignJustify className="w-4 h-4" />}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-white/20 mx-1"></div>
          
          <div className={`flex items-center gap-1.5 text-xs font-medium tracking-wider ${countColor}`} title={countStatus}>
             <LucideIcons.BarChart2 className="w-3.5 h-3.5" />
             <span>{charCount} / 250</span>
          </div>

          <div className="w-px h-6 bg-white/20 mx-1"></div>

          <div className="flex items-center gap-2 relative">
            {!showAts ? (
              <button onClick={() => setShowAts(true)} className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/5">
                <LucideIcons.Target className="w-3.5 h-3.5" />
                <span>ATS Check</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 relative">
                <input 
                  type="text" 
                  value={targetRole} 
                  onChange={e => setTargetRole(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleAtsCheck()}
                  placeholder="Target Role (e.g. Designer)" 
                  className="bg-transparent text-xs text-white outline-none w-36 placeholder-white/40"
                />
                <button onClick={handleAtsCheck} className="text-accent hover:text-white transition-colors" title="Run ATS Analysis">
                  <LucideIcons.Sparkles className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setShowAts(false); setMockAtsResult(null); }} className="text-white/40 hover:text-white/80 transition-colors border-l border-white/20 pl-2 ml-1" title="Close">
                  <LucideIcons.X className="w-3 h-3" />
                </button>

                {mockAtsResult && (
                  <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-64 bg-[#1a1a1a] border border-white/10 rounded-xl p-4 shadow-2xl z-50 text-left">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-white uppercase tracking-wider flex items-center gap-1.5">
                        <LucideIcons.Search className="w-3.5 h-3.5 text-accent" />
                        ATS Match
                      </span>
                      <span className={`text-sm font-bold ${mockAtsResult.score > 70 ? 'text-green-400' : 'text-yellow-400'}`}>{mockAtsResult.score}%</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Found Keywords</div>
                        <div className="text-xs font-medium text-green-400 flex flex-wrap gap-1">
                          {mockAtsResult.matched.length ? mockAtsResult.matched.map(k => <span key={k} className="bg-green-500/10 px-1.5 py-0.5 rounded">{k}</span>) : 'None'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Missing / Suggested</div>
                        <div className="text-xs font-medium text-red-400/80 flex flex-wrap gap-1">
                          {mockAtsResult.missing.length ? mockAtsResult.missing.map(k => <span key={k} className="bg-red-500/10 px-1.5 py-0.5 rounded">{k}</span>) : 'None'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-white/40 italic">
                      Note: This is a static mock. AI integration will be added in the next phase.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="relative transition-all duration-300 w-full flex flex-col mt-4">
          <span className="absolute -left-8 top-0 text-3xl font-serif italic text-text-secondary pointer-events-none z-10">"</span>
          
          <div 
            className="invisible whitespace-pre-wrap italic text-2xl leading-relaxed p-4 -m-4 min-h-[100px] font-['Georgia'] w-full break-words"
            style={{ textAlign: summaryAlign as any }}
          >
            {summaryInput.value + ' '}
          </div>

          <textarea
            ref={textareaRef}
            value={summaryInput.value}
            onChange={(e) => summaryInput.handleChange(e.target.value)}
            onBlur={summaryInput.handleBlur}
            className="absolute inset-0 italic text-2xl leading-relaxed text-text-secondary outline-none focus:bg-white/5 p-4 -m-4 rounded-xl transition-colors min-h-[100px] hover-glow-text font-['Georgia'] bg-transparent w-full resize-none overflow-hidden"
            style={{ textAlign: summaryAlign as any }}
            placeholder="A short summary about yourself..."
          />
          <span className="absolute -right-8 bottom-0 text-3xl font-serif italic text-text-secondary pointer-events-none z-10">"</span>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return isEqual(prevProps.data.profile, nextProps.data.profile);
});

const ContactItemEditor = React.memo(({ item, Icon, updateContactItem, removeContactItem, AVAILABLE_ICONS }: any) => {
  const textInput = useDebouncedInput(item.text, (val) => updateContactItem(item.id, 'text', val));
  const urlInput = useDebouncedInput(item.url || '', (val) => updateContactItem(item.id, 'url', val));

  return (
    <div className="flex items-center gap-3 w-full group relative">
      <div className="relative">
        <select
          value={item.icon}
          onChange={(e) => updateContactItem(item.id, 'icon', e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full"
        >
          {AVAILABLE_ICONS.map((iconName: string) => (
            <option key={iconName} value={iconName}>{iconName}</option>
          ))}
        </select>
        <Icon className="w-5 h-5 text-accent hover:text-white transition-colors cursor-pointer" />
      </div>
      <input
        value={textInput.value}
        onChange={(e) => textInput.handleChange(e.target.value)}
        onBlur={textInput.handleBlur}
        placeholder="Display Text"
        className="flex-1 bg-transparent border-b border-white/20 focus:border-accent outline-none text-lg transition-colors hover-glow-text font-['Georgia']"
      />
      <input
        value={urlInput.value}
        onChange={(e) => urlInput.handleChange(e.target.value)}
        onBlur={urlInput.handleBlur}
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
}, (prevProps, nextProps) => {
  return isEqual(prevProps.item, nextProps.item);
});

export default InfoEditor;
