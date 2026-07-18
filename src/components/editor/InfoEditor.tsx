/* eslint-disable react-refresh/only-export-components */

/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/immutability */

/* eslint-disable react-hooks/refs */
 
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

// Uncontrolled debounced input to prevent Mac Zhuyin IME composition interruptions
export function useDebouncedInput(
  initialValue: string,
  onSave: (value: string) => void,
  delay: number = 1000
) {
  const [localValue, setLocalValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external changes ONLY if the input is not actively focused
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      if (inputRef.current.value !== initialValue) {
        inputRef.current.value = initialValue;
        setLocalValue(initialValue);
      }
    }
  }, [initialValue]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        onSave(inputRef.current?.value || localValue);
      }
    };
  }, [localValue, onSave]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onSave(newValue);
      timeoutRef.current = null;
    }, delay);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      onSave(e.target.value);
    }
  };

  return { 
    ref: inputRef,
    defaultValue: initialValue, 
    onChange: handleChange, 
    onBlur: handleBlur,
    localValue 
  };
}

const InfoEditor = React.memo(({ data, updateProfile, updateContactItem, removeContactItem, addContactItem, AVAILABLE_ICONS }: InfoEditorProps) => {
  const nameInput = useDebouncedInput(data.profile.name, (val) => updateProfile('name', val));
  const titleInput = useDebouncedInput(data.profile.title, (val) => updateProfile('title', val));
  const summaryInput = useDebouncedInput(data.profile.summary, (val) => updateProfile('summary', val));

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 中文字一個算一字元，標點符號不算 (移除所有標點與空白)
  const charCount = (summaryInput.localValue || '').replace(/[\p{P}\p{S}\s]/gu, '').length;
  let countColor = 'text-text-secondary';
  let countStatus = 'Type your summary';
  if (charCount > 0) {
    if (charCount < 100) {
      countColor = 'text-red-400';
      countStatus = 'Too short';
    } else if (charCount < 250) {
      countColor = 'text-yellow-400';
      countStatus = 'A bit short';
    } else if (charCount <= 400) {
      countColor = 'text-green-400';
      countStatus = 'Optimal length';
    } else if (charCount <= 500) {
      countColor = 'text-yellow-400';
      countStatus = 'A bit long';
    } else {
      countColor = 'text-red-400';
      countStatus = 'Too long';
    }
  }

  return (
    <div className="flex flex-col items-center text-center space-y-12 py-12 w-full">
      <div className="w-full flex flex-col items-center">
        <input
          ref={nameInput.ref as any}
          defaultValue={nameInput.defaultValue}
          onChange={nameInput.onChange}
          onBlur={nameInput.onBlur}
          className="font-serif text-6xl md:text-8xl font-light leading-none text-accent mb-6 outline-none focus:border-b focus:border-accent/50 border-b border-transparent transition-colors min-w-[100px]  text-center bg-transparent w-full"
          placeholder="Your Name"
        />
        <input
          ref={titleInput.ref as any}
          defaultValue={titleInput.defaultValue}
          onChange={titleInput.onChange}
          onBlur={titleInput.onBlur}
          className="text-lg md:text-xl tracking-[0.4em] uppercase text-text-secondary outline-none focus:border-b focus:border-accent/50 border-b border-transparent transition-colors min-w-[100px]  text-center font-['Georgia'] bg-transparent w-full"
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
          if (textarea && target.tagName !== 'BUTTON' && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
            textarea.focus();
            if (target !== textarea) {
              const len = textarea.value.length;
              textarea.setSelectionRange(len, len);
            }
          }
        }}
      >
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all bg-white border border-[#eceae4] shadow-sm px-6 py-2 rounded-full z-20 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto before:absolute before:-top-16 before:-left-10 before:-right-10 before:h-16 before:content-['']">
          <div className={`flex items-center gap-2 text-xs font-medium tracking-wider ${countColor}`}>
             <LucideIcons.PenTool className="w-4 h-4" />
             <span className="uppercase font-semibold opacity-70">Recommended Length: 250-400</span>
             <span className="font-mono ml-2 pl-2">{charCount} chars</span>
             {charCount > 0 && (
               <span className="ml-1 opacity-90">{countStatus}</span>
             )}
          </div>
        </div>

        <div className="relative transition-all duration-300 w-full flex flex-col mt-4">
          
          <div 
            className="invisible whitespace-pre-wrap italic text-2xl leading-relaxed p-4 -m-4 min-h-[100px] font-['Georgia'] w-full break-words text-left"
          >
            {summaryInput.localValue + ' '}
          </div>

          <textarea
            ref={(el) => {
              (textareaRef as any).current = el;
              (summaryInput.ref as any).current = el;
            }}
            defaultValue={summaryInput.defaultValue}
            onChange={summaryInput.onChange}
            onBlur={summaryInput.onBlur}
            className="absolute inset-0 italic text-2xl leading-relaxed text-[#5f5f5d] outline-none focus:bg-black/5 p-4 -m-4 rounded-xl transition-colors min-h-[100px]  font-['Georgia'] bg-transparent w-full resize-none overflow-hidden text-left"
            placeholder="A short summary about yourself..."
          />
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
        <Icon className="w-5 h-5 text-accent hover:text-[#1c1c1c] transition-colors cursor-pointer" />
      </div>
      <input
        ref={textInput.ref as any}
        defaultValue={textInput.defaultValue}
        onChange={textInput.onChange}
        onBlur={textInput.onBlur}
        placeholder="Display Text"
        className="flex-1 bg-transparent border-b border-[#eceae4] focus:border-accent outline-none text-lg text-[#1c1c1c] transition-colors  font-['Georgia']"
      />
      <input
        ref={urlInput.ref as any}
        defaultValue={urlInput.defaultValue}
        onChange={urlInput.onChange}
        onBlur={urlInput.onBlur}
        placeholder="URL (optional)"
        className="flex-1 bg-transparent border-b border-[#eceae4] focus:border-accent outline-none text-sm text-[#5f5f5d] transition-colors"
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
