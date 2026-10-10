/**
 * ImportResumeModal.tsx — AI-Powered Resume Import Modal
 *
 * A modal dialog that allows authenticated users to upload an existing resume
 * (PDF, JPG, or PNG) and have it automatically parsed by Google Gemini AI
 * into structured data that populates a new resume profile.
 *
 * Dual-Path Parsing Strategy:
 * 1. Server-side (preferred): POST /api/parse-resume → uses server's GEMINI_API_KEY
 *    - Returns 412 if no valid key is configured on the server
 * 2. Client-side fallback: Direct Gemini API call via frontend proxy
 *    - Used in AI Studio Free Tier where the key is injected at build time
 *
 * Rate Limiting:
 * - 5 imports per day per user, tracked in Firestore user_limits/{uid}
 * - Owner email (mujoecs@gmail.com) is exempted from limits
 *
 * File Constraints: Max 3MB, PDF/JPG/PNG only
 *
 * Props:
 * - isOpen: boolean — controls modal visibility
 * - onClose: () => void — called when modal should close
 * - onImport: (data) => void — called with parsed resume data on success
 *
 * Depends on: AuthContext, firebase.ts, @google/genai
 * Firestore reads/writes: user_limits/{uid}
 */
import React, { useState, useRef, useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { useFocusTrap } from '../hooks/useFocusTrap';


interface ImportResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any) => void;
}

export const ImportResumeModal: React.FC<ImportResumeModalProps> = ({ isOpen, onClose, onImport }) => {
  const { t } = useTranslation();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, isOpen);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!isOpen || isUploading) return; // same rule as the backdrop
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, isUploading, onClose]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isUploading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % 4);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isUploading]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 3MB for Vercel Free Tier compatibility)
    if (file.size > 3 * 1024 * 1024) {
      setError(t('importModal.errors.fileTooLarge'));
      return;
    }

    // Validate type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setError(t('importModal.errors.invalidType'));
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      if (!user) {
        throw new Error(t('importModal.errors.notLoggedIn'));
      }

      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error(t('importModal.errors.authFailed'));
      }

      // Convert file to Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise<void>((resolve, reject) => {
        reader.onload = () => resolve();
        reader.onerror = () => reject(new Error(t('importModal.errors.readFailed')));
      });

      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1]; // Remove data URL prefix

      let parsedData = null;

      try {
        // Step 1: Try secure backend parsing (For Vercel Production)
        const response = await fetch('/api/parse-resume', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            fileType: file.type,
            base64Data: base64Data
          })
        });

        if (response.status === 412) {
          // The backend specifically told us it has no Gemini key
          throw new Error("SERVER_UNAVAILABLE_OR_NO_KEY");
        } 
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `${t('common.error')}: ${response.status}`);
        }

        parsedData = await response.json();
      } catch (backendError: any) {
        if (backendError.message !== "SERVER_UNAVAILABLE_OR_NO_KEY") {
          throw backendError; // Stop if it's a real server error (like 500 or 400)
        }

        console.warn('Server-side parsing unavailable (412). No client-side fallback configured.');
        throw new Error(t('importModal.errors.serverUnavailable'), { cause: backendError });
      }

      onImport(parsedData);
      onClose();
    } catch (err: any) {
      console.error("Upload Error:", err);
      const errorStr = err.message || '';
      if (errorStr.includes('429')) {
        setError(t('importModal.errors.rateLimit', '目前解析人數過多，請稍後再試'));
      } else if (errorStr.includes('Failed to parse resume with AI') || errorStr.includes('500') || errorStr.includes('504')) {
        setError(t('importModal.errors.aiFailed', '無法解析此格式，建議您直接手動建立，或換一份純文字格式的 PDF 再試一次。'));
      } else {
        setError(errorStr || t('importModal.errors.unexpected'));
      }
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={() => !isUploading && onClose()}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-[101] overflow-hidden border border-[#eceae4]"
          >
            <div className="p-6 border-b border-[#eceae4] flex items-center justify-between">
              <h2 id={titleId} className="text-xl font-semibold text-[#1c1c1c] flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                {t('importModal.title')}
              </h2>
              <button 
                onClick={onClose}
                disabled={isUploading}
                className="p-2 text-[#5f5f5d] hover:text-[#1c1c1c] rounded-full hover:bg-black/5 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-[#5f5f5d] mb-6 text-sm text-center">
                {t('importModal.subtitle')}
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 rounded-xl flex border border-red-500/20 text-red-400 gap-3 items-start">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  isUploading ? 'border-[#eceae4] bg-black/5' : 'border-[#eceae4] bg-white hover:bg-black/5 hover:border-[#1c1c1c]/20 cursor-pointer '
                }`}
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    <p className="text-sm font-medium text-[#1c1c1c] transition-opacity duration-300">
                      {loadingStep === 0 && t('importModal.loading.step0', '正在上傳文件...')}
                      {loadingStep === 1 && t('importModal.loading.step1', 'AI 正在萃取工作經歷...')}
                      {loadingStep === 2 && t('importModal.loading.step2', '正在分析技能與學歷...')}
                      {loadingStep === 3 && t('importModal.loading.step3', '最後排版中，請稍候...')}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-[#eceae4]/50 rounded-full flex items-center justify-center shadow-sm mb-2 text-accent">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-[#1c1c1c]">{t('importModal.dropzoneText')}</p>
                    <p className="text-xs text-[#5f5f5d]">{t('importModal.supportedFormats')}</p>
                  </div>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".pdf,image/png,image/jpeg" 
                  onChange={handleFileChange}
                />
              </div>

              <div className="mt-6 p-4 bg-accent/10 rounded-lg border border-accent/20 flex gap-2 w-full items-start">
                  <AlertCircle className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  <p className="text-xs text-[#5f5f5d] leading-relaxed">
                    {t('importModal.privacyNotice')}
                  </p>
              </div>
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
};
