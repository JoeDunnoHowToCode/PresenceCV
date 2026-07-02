import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const summaryAlign = data.profile.summaryAlign || 'center';

  const nameInput = useDebouncedInput(data.profile.name, (val) => updateProfile('name', val));
  const titleInput = useDebouncedInput(data.profile.title, (val) => updateProfile('title', val));
  const summaryInput = useDebouncedInput(data.profile.summary, (val) => updateProfile('summary', val));

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ATS and Word Count states
  const [targetRole, setTargetRole] = useState(data.profile.title || '');
  const [showAts, setShowAts] = useState(false);
  const [isAtsLoading, setIsAtsLoading] = useState(false);
  const [atsResult, setAtsResult] = useState<{ score: number, matchedKeywords: string[], missingKeywords: string[], aiSuggestion: string } | null>(null);



  // 中文字一個算一字元，標點符號不算 (移除所有標點與空白)
  const charCount = (summaryInput.localValue || '').replace(/[\p{P}\p{S}\s]/gu, '').length;
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

  const handleAtsCheck = async () => {
    if (!targetRole.trim()) return;
    
    setIsAtsLoading(true);
    try {
      let parsedData = null;
      try {
        const response = await fetch('/api/ats-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resumeData: data,
            jobDescription: targetRole
          })
        });

        if (response.status === 412 || response.status >= 500) {
          throw new Error("SERVER_UNAVAILABLE_OR_NO_KEY");
        } 
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        parsedData = await response.json();
      } catch (backendError: any) {
        if (backendError.message !== "SERVER_UNAVAILABLE_OR_NO_KEY") {
          throw backendError;
        }

        console.log("Backend unable to process, routing securely via AI Studio frontend proxy...");
        
        const { GoogleGenAI, Type } = await import("@google/genai");
        const { ATS_EVALUATION_SYSTEM_PROMPT } = await import("../../lib/aiPrompt");

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const result = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-preview",
          contents: [
            { text: ATS_EVALUATION_SYSTEM_PROMPT },
            { text: `Resume Data: ${JSON.stringify(data)}\n\nJob Description: ${targetRole}` }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER },
                matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                aiSuggestion: { type: Type.STRING },
              },
            },
          },
        });

        const jsonStr = result.text?.trim();
        if (!jsonStr) throw new Error("Empty response from AI");

        parsedData = JSON.parse(jsonStr);
      }
      
      setAtsResult(parsedData);
    } catch (err: any) {
      console.error("ATS Check Error:", err);
      alert(err.message || "Failed to perform ATS check");
    } finally {
      setIsAtsLoading(false);
    }
  };



  return (
    <div className="flex flex-col items-center text-center space-y-12 py-12 w-full">
      <div className="w-full flex flex-col items-center">
        <input
          ref={nameInput.ref as any}
          defaultValue={nameInput.defaultValue}
          onChange={nameInput.onChange}
          onBlur={nameInput.onBlur}
          className="font-serif text-6xl md:text-8xl font-light leading-none text-accent mb-6 outline-none focus:border-b focus:border-accent/50 border-b border-transparent transition-colors min-w-[100px] hover-glow text-center bg-transparent w-full"
          placeholder="Your Name"
        />
        <input
          ref={titleInput.ref as any}
          defaultValue={titleInput.defaultValue}
          onChange={titleInput.onChange}
          onBlur={titleInput.onBlur}
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
          if (textarea && target.tagName !== 'BUTTON' && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
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
            <button 
              onClick={() => setShowAts(true)} 
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors px-2 py-1 rounded-md hover:bg-white/5 ${showAts ? 'text-accent font-semibold bg-white/5 shadow-[0_0_10px_rgba(255,255,255,0.05)]' : 'text-text-secondary hover:text-white'}`}
            >
              <LucideIcons.Target className="w-3.5 h-3.5" />
              <span>ATS Check</span>
            </button>
          </div>
        </div>

        <div className="relative transition-all duration-300 w-full flex flex-col mt-4">
          <span className="absolute -left-8 top-0 text-3xl font-serif italic text-text-secondary pointer-events-none z-10">"</span>
          
          <div 
            className="invisible whitespace-pre-wrap italic text-2xl leading-relaxed p-4 -m-4 min-h-[100px] font-['Georgia'] w-full break-words"
            style={{ textAlign: summaryAlign as any }}
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
            className="absolute inset-0 italic text-2xl leading-relaxed text-text-secondary outline-none focus:bg-white/5 p-4 -m-4 rounded-xl transition-colors min-h-[100px] hover-glow-text font-['Georgia'] bg-transparent w-full resize-none overflow-hidden"
            style={{ textAlign: summaryAlign as any }}
            placeholder="A short summary about yourself..."
          />
          <span className="absolute -right-8 bottom-0 text-3xl font-serif italic text-text-secondary pointer-events-none z-10">"</span>
        </div>
        </div>
      
        {/* ATS Check Side Drawer */}
        {createPortal(
          <AnimatePresence>
          {showAts && (
            <div className="fixed inset-0 z-[100] flex justify-end">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAts(false)}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto cursor-default"
              />
              
              {/* Drawer Container */}
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="relative w-full max-w-[420px] h-full bg-[#141414] border-l border-white/10 shadow-2xl p-6 flex flex-col pointer-events-auto z-10 text-left"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-accent/10 text-accent">
                      <LucideIcons.Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">ATS Keyword Matcher</h3>
                      <p className="text-[10px] text-white/40 tracking-wider uppercase font-medium mt-0.5">Gemini AI Assistant</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowAts(false)}
                    className="p-1.5 text-white/40 hover:text-white/80 transition-colors rounded-full hover:bg-white/5"
                  >
                    <LucideIcons.X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                        <LucideIcons.FileText className="w-4 h-4 text-accent" />
                        Target Job Description
                      </label>
                      <span className="text-[10px] text-white/30 font-medium">({targetRole.length}/5000)</span>
                    </div>
                    <p className="text-[11px] text-white/40 leading-relaxed bg-white/5 p-2.5 rounded-lg border border-white/5">
                      💡 <strong>提示：</strong>請貼上目標職稱與完整的**工作要求 (Job Description / Qualifications)**，越完整 AI 提取關鍵字與改寫的精準度越高！若只輸入單個字詞（例如 "sales"），AI 可能會因缺乏上下文而無法萃取關鍵字。
                    </p>
                    <textarea 
                      value={targetRole} 
                      onChange={e => setTargetRole(e.target.value)} 
                      placeholder="貼上完整的職缺說明、必要技能與工作條件（上限 5000 字）..." 
                      maxLength={5000}
                      className="w-full h-40 bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-accent transition-colors placeholder-white/20 resize-none custom-scrollbar"
                    />
                    <button 
                      onClick={handleAtsCheck} 
                      disabled={isAtsLoading || !targetRole.trim()}
                      className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-medium py-3 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(var(--theme-accent-rgb),0.2)] hover:shadow-[0_0_25px_rgba(var(--theme-accent-rgb),0.3)] disabled:opacity-30 disabled:pointer-events-none"
                    >
                      {isAtsLoading ? <LucideIcons.Loader2 className="w-4 h-4 animate-spin" /> : <LucideIcons.Sparkles className="w-4 h-4" />}
                      {isAtsLoading ? "AI 分析中..." : "開始 ATS 契合度分析"}
                    </button>
                  </div>

                  {atsResult && (
                    <div className="space-y-6 pt-6 border-t border-white/10">
                      <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4 border border-white/5">
                        <span className="text-xs font-semibold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                          <LucideIcons.Search className="w-4 h-4 text-accent" />
                          ATS Match Score
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-3xl font-extrabold tracking-tight ${atsResult.score > 70 ? 'text-green-400' : atsResult.score > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {atsResult.score}
                          </span>
                          <span className="text-xs text-white/40 font-semibold">%</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                            Found Keywords ({atsResult.matchedKeywords?.length || 0})
                          </div>
                          <div className="text-[11px] font-medium text-green-400 flex flex-wrap gap-1.5">
                            {atsResult.matchedKeywords?.length ? atsResult.matchedKeywords.map(k => (
                              <span key={k} className="bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg">{k}</span>
                            )) : <span className="text-white/30 italic text-xs">無匹配的關鍵字</span>}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                            Missing Keywords ({atsResult.missingKeywords?.length || 0})
                          </div>
                          <div className="text-[11px] font-medium text-red-400/80 flex flex-wrap gap-1.5">
                            {atsResult.missingKeywords?.length ? atsResult.missingKeywords.map(k => (
                              <span key={k} className="bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">{k}</span>
                            )) : <span className="text-white/30 italic text-xs">無漏失的關鍵字</span>}
                          </div>
                        </div>

                        {atsResult.aiSuggestion && (
                          <div className="bg-accent/5 p-4 rounded-xl border border-accent/15 space-y-3">
                            <div className="text-xs text-accent uppercase tracking-wider font-semibold flex items-center gap-1.5">
                              <LucideIcons.Wand2 className="w-4 h-4" />
                              AI Suggested Summary
                            </div>
                            <p className="text-sm text-white/90 leading-relaxed italic bg-black/20 p-3 rounded-lg border border-white/5">
                              "{atsResult.aiSuggestion}"
                            </p>
                            <button 
                              onClick={() => {
                                updateProfile('summary', atsResult.aiSuggestion);
                              }}
                              className="w-full flex items-center justify-center gap-1.5 bg-accent hover:bg-accent/90 text-bg py-3 rounded-xl text-xs font-bold transition-all shadow-[0_4px_12px_rgba(var(--theme-accent-rgb),0.2)]"
                            >
                              <LucideIcons.Check className="w-4 h-4" />
                              Apply Suggestion (一鍵套用自我介紹)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
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
        ref={textInput.ref as any}
        defaultValue={textInput.defaultValue}
        onChange={textInput.onChange}
        onBlur={textInput.onBlur}
        placeholder="Display Text"
        className="flex-1 bg-transparent border-b border-white/20 focus:border-accent outline-none text-lg transition-colors hover-glow-text font-['Georgia']"
      />
      <input
        ref={urlInput.ref as any}
        defaultValue={urlInput.defaultValue}
        onChange={urlInput.onChange}
        onBlur={urlInput.onBlur}
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
