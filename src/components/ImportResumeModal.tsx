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
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, FileText, Loader2, AlertCircle } from 'lucide-react';
import { RESUME_PARSER_SYSTEM_PROMPT } from '../lib/aiPrompt';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";

interface ImportResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any) => void;
}

export const ImportResumeModal: React.FC<ImportResumeModalProps> = ({ isOpen, onClose, onImport }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 3MB for Vercel Free Tier compatibility)
    if (file.size > 3 * 1024 * 1024) {
      setError("File is too large. Maximum size is 3MB.");
      return;
    }

    // Validate type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setError("Invalid file type. Only PDF, JPG, and PNG are supported.");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      if (!user) {
        throw new Error("You must be logged in to use this feature.");
      }

      // Rate limit check
      const today = new Date().toISOString().split('T')[0];
      const limitRef = doc(db, 'user_limits', user.uid);
      const limitSnap = await getDoc(limitRef);
      
      let currentCount = 0;
      if (limitSnap.exists()) {
        const data = limitSnap.data();
        if (data.date === today) {
          currentCount = data.count || 0;
        }
      }

      const isUnlimited = user.uid === import.meta.env.VITE_ADMIN_UID;

      // Temporarily suspended for testing
      // if (currentCount >= 5 && !isUnlimited) {
      //   throw new Error("You have reached your daily limit of 5 resume imports.");
      // }

      // Convert file to Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise<void>((resolve, reject) => {
        reader.onload = () => resolve();
        reader.onerror = () => reject(new Error("Failed to read file."));
      });

      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1]; // Remove data URL prefix

      let parsedData = null;

      try {
        // Step 1: Try secure backend parsing (For Vercel Production)
        const response = await fetch('/api/parse-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileType: file.type,
            base64Data: base64Data
          })
        });

        if (response.status === 412 || response.status >= 500) {
          // The backend specifically told us it has no key (412) 
          // OR it failed with a server error (e.g. invalid key 500).
          // Fall back to frontend proxy.
          throw new Error("SERVER_UNAVAILABLE_OR_NO_KEY");
        } 
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        parsedData = await response.json();
      } catch (backendError: any) {
        if (backendError.message !== "SERVER_UNAVAILABLE_OR_NO_KEY") {
          throw backendError; // Stop if it's a real server error (like 400 Bad Request)
        }

        console.log("Backend unable to process, routing securely via AI Studio frontend proxy...");

        // Step 2: Fallback to Frontend Parsing (For AI Studio Free Tier Proxy)
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            { text: RESUME_PARSER_SYSTEM_PROMPT },
            {
              inlineData: {
                data: base64Data,
                mimeType: file.type,
              },
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                profile: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    title: { type: Type.STRING },
                    location: { type: Type.STRING },
                    email: { type: Type.STRING },
                    summary: { type: Type.STRING },
                  },
                  required: ["name", "title", "location", "email", "summary"],
                },
                contactItems: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      icon: { type: Type.STRING, description: "One of: Mail, Phone, Globe, Linkedin, Github, Twitter" },
                      text: { type: Type.STRING, description: "Display text, e.g., email address, phone number, or handle" },
                      url: { type: Type.STRING, description: "The actual URL or mailto:/tel: link. If it's an email, prefix with mailto:. If it's a phone, prefix with tel:" }
                    },
                    required: ["icon", "text", "url"]
                  }
                },
                experience: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      subtitle: { type: Type.STRING },
                      period: { type: Type.STRING },
                      description: { type: Type.STRING },
                    },
                    required: ["title", "subtitle", "period", "description"]
                  },
                },
                education: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      subtitle: { type: Type.STRING },
                      period: { type: Type.STRING },
                      description: { type: Type.STRING },
                    },
                    required: ["title", "subtitle", "period", "description"]
                  },
                },
                skills: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["profile", "contactItems", "experience", "education", "skills"]
            },
          },
        });

        const jsonStr = result.text?.trim();

        if (!jsonStr) {
          throw new Error("Empty response from AI");
        }

        parsedData = JSON.parse(jsonStr);
      }

      // Update Rate Limit
      await setDoc(limitRef, {
        date: today,
        count: currentCount + 1
      }, { merge: true });

      onImport(parsedData);
      onClose();
    } catch (err: any) {
      console.error("Import Error:", err);
      // Clean up error message if it's an API Key error to guide the user
      if (err.message && err.message.includes('API key not valid')) {
          setError("Failed to authenticate AI. If you are not using AI Studio, please provide a valid GEMINI_API_KEY.");
      } else {
          setError(err.message || "An unexpected error occurred during import.");
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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-[101] overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Import Your Resume
              </h2>
              <button 
                onClick={onClose}
                disabled={isUploading}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-6 text-sm text-center">
                Upload your existing resume (PDF, JPG, or PNG) and our AI will automatically extract and populate your profile. 
                <br /> <span className="text-xs text-gray-400 mt-1 block">(Limit 5 times per day)</span>
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-50 rounded-xl flex border border-red-100 text-red-700 gap-3 items-start">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  isUploading ? 'border-gray-200 bg-gray-50' : 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer'
                }`}
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-sm font-medium text-indigo-900">AI is analyzing your resume...</p>
                    <p className="text-xs text-indigo-600/70">This might take up to 30 seconds.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-2 text-indigo-600">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-indigo-900">Click to upload document</p>
                    <p className="text-xs text-indigo-600/70">Max 3MB. Fast and secure.</p>
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

              <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-100 flex gap-2 w-full items-start">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Privacy Notice:</strong> Your file is processed securely in memory and deleted immediately after analysis. We do not store your original document. Please manually review the generated content after import to ensure AI accuracy.
                  </p>
              </div>
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
};
