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

  useEffect(() => {
    if (!targetRole && data.profile.title) {
      setTargetRole(data.profile.title);
    }
  }, [data.profile.title, targetRole]);

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
            {!showAts ? (
              <button onClick={() => setShowAts(true)} className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/5">
                <LucideIcons.Target className="w-3.5 h-3.5" />
                <span>ATS Check</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-xl p-3 relative flex-col w-[350px] shadow-2xl z-50">
                <div className="flex w-full justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-white/80 flex items-center gap-1.5"><LucideIcons.FileText className="w-3.5 h-3.5 text-accent" /> Job Description</span>
                  <button onClick={() => { setShowAts(false); setAtsResult(null); }} className="text-white/40 hover:text-white/80 transition-colors p-1" title="Close">
                    <LucideIcons.X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea 
                  value={targetRole} 
                  onChange={e => setTargetRole(e.target.value)} 
                  placeholder="Paste the full job description here (max 5000 chars)..." 
                  maxLength={5000}
                  className="bg-black/20 text-xs text-white outline-none w-full h-24 p-2 rounded-lg placeholder-white/30 resize-none custom-scrollbar"
                />
                <button 
                  onClick={handleAtsCheck} 
                  disabled={isAtsLoading || !targetRole.trim()}
                  className="mt-1 w-full flex items-center justify-center gap-2 bg-accent/20 hover:bg-accent/40 text-accent hover:text-white transition-colors py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  {isAtsLoading ? <LucideIcons.Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LucideIcons.Sparkles className="w-3.5 h-3.5" />}
                  {isAtsLoading ? "Analyzing..." : "Analyze ATS Match"}
                </button>

                {atsResult && (
                  <div className="w-full mt-3 pt-3 border-t border-white/10 text-left">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-white uppercase tracking-wider flex items-center gap-1.5">
                        <LucideIcons.Search className="w-3.5 h-3.5 text-accent" />
                        ATS Match
                      </span>
                      <span className={`text-sm font-bold ${atsResult.score > 70 ? 'text-green-400' : 'text-yellow-400'}`}>{atsResult.score}%</span>
                    </div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                      <div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Found Keywords</div>
                        <div className="text-[11px] font-medium text-green-400 flex flex-wrap gap-1">
                          {atsResult.matchedKeywords?.length ? atsResult.matchedKeywords.map(k => <span key={k} className="bg-green-500/10 px-1.5 py-0.5 rounded">{k}</span>) : 'None'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Missing Keywords</div>
                        <div className="text-[11px] font-medium text-red-400/80 flex flex-wrap gap-1">
                          {atsResult.missingKeywords?.length ? atsResult.missingKeywords.map(k => <span key={k} className="bg-red-500/10 px-1.5 py-0.5 rounded">{k}</span>) : 'None'}
                        </div>
                      </div>
                      {atsResult.aiSuggestion && (
                        <div className="bg-accent/5 p-2.5 rounded-lg border border-accent/10">
                          <div className="text-[10px] text-accent uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-1">
                            <LucideIcons.Wand2 className="w-3 h-3" />
                            AI Suggested Summary
                          </div>
                          <p className="text-xs text-white/90 leading-relaxed italic mb-2">"{atsResult.aiSuggestion}"</p>
                          <button 
                            onClick={() => {
                              updateProfile('summary', atsResult.aiSuggestion);
                            }}
                            className="w-full flex items-center justify-center gap-1.5 bg-accent text-white py-1.5 rounded-md text-[11px] font-medium hover:bg-accent/90 transition-colors"
                          >
                            <LucideIcons.Check className="w-3 h-3" />
                            Apply Suggestion
                          </button>
                        </div>
                      )}
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
