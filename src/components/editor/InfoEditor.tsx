import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
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
    setValue(initialValue);
    isDirty.current = false;
  }, [initialValue]);

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
  const summaryWidth = data.profile.summaryWidth || 100;
  const summaryAlign = data.profile.summaryAlign || 'center';

  const nameInput = useDebouncedInput(data.profile.name, (val) => updateProfile('name', val));
  const titleInput = useDebouncedInput(data.profile.title, (val) => updateProfile('title', val));
  const summaryInput = useDebouncedInput(data.profile.summary, (val) => updateProfile('summary', val));

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

      <div className="max-w-4xl w-full px-4 flex flex-col items-center group relative">
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all glass px-4 py-2 rounded-full z-20 pointer-events-none group-hover:pointer-events-auto shadow-xl">
          <div className="flex items-center gap-1 border-r border-white/10 pr-4">
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
          <div className="flex items-center gap-3 pl-2">
            <LucideIcons.Maximize2 className="w-4 h-4 text-text-secondary" />
            <input
              type="range"
              min="40"
              max="100"
              value={summaryWidth}
              onChange={(e) => updateProfile('summaryWidth', parseInt(e.target.value))}
              className="w-24"
            />
            <span className="text-xs text-text-secondary w-8">{summaryWidth}%</span>
          </div>
        </div>

        <div style={{ width: `${summaryWidth}%` }} className="relative transition-all duration-300">
          <span className="absolute -left-8 top-0 text-3xl font-serif italic text-text-secondary">"</span>
          <textarea
            value={summaryInput.value}
            onChange={(e) => summaryInput.handleChange(e.target.value)}
            onBlur={summaryInput.handleBlur}
            className="italic text-2xl leading-relaxed text-text-secondary outline-none focus:bg-white/5 p-4 -m-4 rounded-xl transition-colors min-h-[100px] hover-glow-text font-['Georgia'] bg-transparent w-full resize-none"
            style={{ textAlign: summaryAlign as any }}
            placeholder="A short summary about yourself..."
          />
          <span className="absolute -right-8 bottom-0 text-3xl font-serif italic text-text-secondary">"</span>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.data.profile) === JSON.stringify(nextProps.data.profile);
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
  return JSON.stringify(prevProps.item) === JSON.stringify(nextProps.item);
});

export default InfoEditor;
