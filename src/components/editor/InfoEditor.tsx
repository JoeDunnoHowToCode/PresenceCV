/* eslint-disable react-hooks/refs, react-hooks/immutability -- Intentional: callback-ref assignments and ref access in event handlers for IME composition focus management */
import React, { useState, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import isEqual from 'fast-deep-equal';
import { ResumeData } from '../../types';

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
    <div className="flex flex-col items-center text-center space-y-12 py-12 w-full max-w-full overflow-x-hidden">
      <div className="w-full flex flex-col items-center max-w-full">
        { }
        <input
          ref={nameInput.ref as any}
          defaultValue={nameInput.defaultValue}
          onChange={nameInput.onChange}
          onBlur={nameInput.onBlur}
          className="text-3xl sm:text-5xl md:text-[64px] lg:text-[80px] font-semibold leading-[1.05] tracking-[-1px] sm:tracking-[-2.5px] text-accent mb-6 outline-none focus:border-b focus:border-accent/50 border-b border-transparent transition-colors min-w-0 text-center bg-transparent w-full max-w-full"
          placeholder="Your Name"
        />
        { }
        <input
          ref={titleInput.ref as any}
          defaultValue={titleInput.defaultValue}
          onChange={titleInput.onChange}
          onBlur={titleInput.onBlur}
          className="text-sm sm:text-lg md:text-xl tracking-[0.2em] sm:tracking-[0.4em] uppercase text-text-secondary outline-none focus:border-b focus:border-accent/50 border-b border-transparent transition-colors min-w-0 text-center bg-transparent w-full max-w-full"
          placeholder="Professional Title"
        />
      </div>

      <div className="flex flex-col items-center justify-center gap-4 w-full max-w-2xl">
        {data.profile.contactItems?.map((item) => {
          const Icon = item.icon === '' ? null : ((LucideIcons as any)[item.icon] || LucideIcons.Link);
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
        className="max-w-4xl w-full px-4 flex flex-col items-center group relative cursor-text max-w-full"
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
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all z-20 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto before:absolute before:-top-16 before:-left-10 before:-right-10 before:h-16 before:content-['']">
          <div className={`flex items-center gap-2 text-xs font-medium tracking-wider whitespace-nowrap ${countColor}`}>
             <span className="uppercase font-semibold opacity-70">Recommended Length: 250-400</span>
             <span className="font-mono ml-2 pl-2 border-l border-current/20">{charCount} chars</span>
             {charCount > 0 && (
               <span className="ml-1 opacity-90">{countStatus}</span>
             )}
          </div>
        </div>

        <div className="relative transition-all duration-300 w-full flex flex-col mt-4">
          
          <div 
            className="invisible whitespace-pre-wrap italic text-xl sm:text-2xl leading-relaxed p-4 -m-4 min-h-[100px] w-full break-words text-left"
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
            className="absolute inset-0 italic text-xl sm:text-2xl leading-relaxed text-[#5f5f5d] outline-none focus:bg-black/5 p-4 -m-4 rounded-xl transition-colors min-h-[100px] bg-transparent w-full resize-none overflow-hidden text-left"
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
  const [isIconMenuOpen, setIsIconMenuOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isConfirmingDelete) {
      const timer = setTimeout(() => setIsConfirmingDelete(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingDelete]);

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full max-w-full group relative p-3 sm:p-0 rounded-xl sm:rounded-none bg-black/5 sm:bg-transparent border sm:border-none border-[#eceae4]">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="relative shrink-0">
          {Icon ? (
            <Icon onClick={() => setIsIconMenuOpen(!isIconMenuOpen)} className="w-5 h-5 text-accent hover:text-[#1c1c1c] transition-colors cursor-pointer" />
          ) : (
            <div 
              onClick={() => setIsIconMenuOpen(!isIconMenuOpen)} 
              className="w-5 h-5 rounded-full border border-dashed border-[#eceae4] hover:border-accent transition-colors cursor-pointer"
            />
          )}
          {isIconMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsIconMenuOpen(false)} />
              <div className="absolute top-full left-0 mt-2 bg-white border border-[#eceae4] shadow-lg rounded-xl p-3 grid grid-cols-4 gap-3 z-50 w-max">
                <div 
                  className="w-4 h-4 cursor-pointer flex items-center justify-center hover:text-accent transition-colors"
                  onClick={() => { updateContactItem(item.id, 'icon', ''); setIsIconMenuOpen(false); }}
                  title="No Icon"
                >
                  🚫
                </div>
                {AVAILABLE_ICONS.map((iconName: string) => {
                  const OptionIcon = (LucideIcons as any)[iconName];
                  return OptionIcon ? (
                    <OptionIcon 
                      key={iconName} 
                      className="w-4 h-4 cursor-pointer text-[#5f5f5d] hover:text-accent transition-colors" 
                      onClick={() => { updateContactItem(item.id, 'icon', iconName); setIsIconMenuOpen(false); }}
                    />
                  ) : null;
                })}
              </div>
            </>
          )}
        </div>
        <input
          ref={textInput.ref as any}
          defaultValue={textInput.defaultValue}
          onChange={textInput.onChange}
          onBlur={textInput.onBlur}
          placeholder="Display Text"
          className="flex-1 min-w-0 w-full bg-transparent border-b border-[#eceae4] focus:border-accent outline-none text-base sm:text-lg text-[#1c1c1c] transition-colors"
        />
      </div>
      <input
        ref={urlInput.ref as any}
        defaultValue={urlInput.defaultValue}
        onChange={urlInput.onChange}
        onBlur={urlInput.onBlur}
        placeholder="URL (optional)"
        className="flex-1 min-w-0 w-full bg-transparent border-b border-[#eceae4] focus:border-accent outline-none text-xs sm:text-sm text-[#5f5f5d] transition-colors"
      />
      {isConfirmingDelete ? (
        <button
          onClick={() => {
            removeContactItem(item.id);
            setIsConfirmingDelete(false);
          }}
          className="px-2.5 py-1 bg-red-500 text-white text-xs rounded-lg font-medium hover:bg-red-600 transition-all self-end sm:self-center shrink-0 shadow-sm"
        >
          Confirm?
        </button>
      ) : (
        <button 
          onClick={() => setIsConfirmingDelete(true)}
          className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-[#5f5f5d] hover:text-red-400 transition-all self-end sm:self-center p-1"
          title="Remove Link"
        >
          <LucideIcons.X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return isEqual(prevProps.item, nextProps.item);
});

export default InfoEditor;
