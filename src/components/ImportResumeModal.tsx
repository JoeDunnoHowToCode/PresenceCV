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

      if (currentCount >= 5 && !isUnlimited) {
        throw new Error("You have reached your daily limit of 5 resume imports.");
      }

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
        
        const prompt = `You are an expert ATS (Applicant Tracking System) data extractor.
Extract ALL resume details from the provided document with 100% completeness.
Do NOT skip, summarize, or infer any data that is not explicitly present in the document.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1 — CONTACT ITEMS (HIGHEST PRIORITY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scan the ENTIRE document for every URL, link, handle, email, and phone number.
Extract each one into "contactItems" as a separate object: { "label": "...", "url": "..." }.

Rules by type — follow EXACTLY:

EMAIL
  - label: "Email"
  - url: MUST start with "mailto:" → e.g., "mailto:john@example.com"

PHONE
  - label: "Phone"
  - url: MUST start with "tel:" → e.g., "tel:+886912345678"
    If no country code is present, infer from context (Taiwan → +886, US → +1, UK → +44).
    Remove spaces, dashes, and parentheses from the number.

LINKEDIN
  - label: "LinkedIn"
  - url: MUST start with "https://www.linkedin.com/in/"
    Examples of input → output:
      "linkedin.com/in/johndoe"      → "https://www.linkedin.com/in/johndoe"
      "/in/johndoe"                  → "https://www.linkedin.com/in/johndoe"
      "LinkedIn: johndoe"            → "https://www.linkedin.com/in/johndoe"

GITHUB
  - label: "GitHub"
  - url: MUST start with "https://github.com/"
    Examples of input → output:
      "github.com/johndoe"           → "https://github.com/johndoe"
      "@johndoe (GitHub)"            → "https://github.com/johndoe"
      "GitHub: johndoe"              → "https://github.com/johndoe"

TWITTER / X
  - label: "Twitter" or "X"
  - url: MUST start with "https://x.com/" or "https://twitter.com/"
    Examples of input → output:
      "@johndoe (Twitter)"           → "https://x.com/johndoe"
      "twitter.com/johndoe"          → "https://twitter.com/johndoe"

BEHANCE
  - label: "Behance"
  - url: MUST start with "https://www.behance.net/"
    Example: "behance.net/johndoe"   → "https://www.behance.net/johndoe"

DRIBBBLE
  - label: "Dribbble"
  - url: MUST start with "https://dribbble.com/"
    Example: "dribbble.com/johndoe"  → "https://dribbble.com/johndoe"

MEDIUM / SUBSTACK / BLOG
  - label: "Medium", "Substack", or "Blog"
  - url: Prepend "https://" if no protocol is present.
    Example: "medium.com/@johndoe"   → "https://medium.com/@johndoe"

PORTFOLIO / WEBSITE / OTHER URL
  - label: Use a descriptive name (e.g., "Portfolio", "Website", "Personal Site")
  - url: MUST start with "https://" — if "http://" is shown, keep as-is; if no protocol, prepend "https://"
    Example: "johndoe.com"           → "https://johndoe.com"

IMPORTANT:
  - Never output a bare domain like "linkedin.com/in/johndoe" — always include the full protocol.
  - Never set "url" to null, "", or "#" if a usable link or identifier is present.
  - If a URL appears outside the contact section (e.g., a project link, a publication link), still include it in contactItems with an appropriate label.
  - Each contactItem must be a distinct object — do not combine multiple links into one.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2 — WORK EXPERIENCE & EDUCATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Extract ALL entries in chronological order as they appear. Do not merge, skip, or truncate any.

For each entry:
  - "title": Job title OR degree name
      Examples: "Senior Product Manager", "Software Engineer Intern",
                "Bachelor of Business Administration", "MSc in Computer Science"
  - "subtitle": Company name OR school name, including location if stated in the document
      Examples: "Google, Mountain View, CA", "National Taiwan University, Taipei",
                "McKinsey & Company", "HSBC, Hong Kong"
  - "period": Exact date range as written in the document
      Examples: "Jul 2023 – Sep 2023", "2021 – 2024", "Mar 2020 – Present"
      Use "Present" if the role is ongoing. Do NOT invent or estimate dates.
  - "description": Reproduce ALL bullet points, responsibilities, achievements, and details.
      Use "•" as the bullet character and "\n" between each item.
      Do NOT leave this empty if the source contains any content for this entry.
      Examples of well-formatted descriptions:
        Tech role:
          "• Developed RESTful APIs using Node.js serving 500K daily active users\n• Reduced page load time by 40% through lazy loading and code splitting\n• Mentored 3 junior engineers and conducted bi-weekly code reviews"
        Business/Finance role:
          "• Led cross-functional team of 12 to deliver $2M product launch on time and under budget\n• Analyzed market entry strategy for Southeast Asia, resulting in 18% revenue growth\n• Prepared board-level presentations and quarterly financial reports for C-suite"
        Marketing role:
          "• Managed $500K annual digital advertising budget across Google, Meta, and LinkedIn\n• Increased organic traffic by 65% through SEO strategy and content optimization\n• Launched influencer campaign reaching 2M impressions with 4.2% engagement rate"
        Design role:
          "• Redesigned onboarding flow, improving user activation rate from 32% to 58%\n• Conducted 20+ usability tests and translated insights into design iterations\n• Maintained and extended a design system used by 8 product teams"
        Education entry:
          "• Major: Finance, Minor: Data Analytics\n• GPA: 3.8/4.0, Dean's List 2022–2023\n• Thesis: The Impact of Open Banking on Consumer Financial Behavior"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3 — SKILLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Group all skills from the document into intelligent domain categories.
Format each entry STRICTLY as: "Category: Skill1, Skill2, Skill3"

Choose category names appropriate to the candidate's field. Examples by domain:

Software / Engineering:
  "Languages & Frameworks: TypeScript, React, Next.js, Node.js"
  "Blockchain: Sui Move, Solana, Web3.js, Ethers.js"
  "Cloud & DevOps: GCP, AWS, Docker, GitHub Actions, Vercel"
  "Tools & Platforms: GitHub, VS Code, UiPath, Figma, Postman"
  "Databases: PostgreSQL, MongoDB, Redis, Supabase"

Business / Finance / Consulting:
  "Strategy & Analysis: Market Research, Competitive Analysis, Business Development"
  "Finance: Financial Modeling, DCF Valuation, P&L Management, Excel"
  "Project Management: Agile, Scrum, Stakeholder Management, OKRs"
  "Tools: PowerPoint, Tableau, Salesforce, SAP, Bloomberg Terminal"

Marketing / Creative:
  "Digital Marketing: SEO, SEM, Google Analytics, Meta Ads, Email Marketing"
  "Content & Brand: Copywriting, Brand Strategy, Content Calendar Management"
  "Design Tools: Figma, Adobe Photoshop, Illustrator, Canva"
  "Analytics: Google Analytics 4, Mixpanel, A/B Testing, Hotjar"

General (all candidates):
  "Spoken Languages: English (Fluent), Mandarin (Native), Japanese (Intermediate)"
  "Certifications: AWS Certified Developer, CFA Level II, Google Analytics Certified"
  "Soft Skills: Leadership, Public Speaking, Cross-functional Collaboration"

IMPORTANT:
  - Only include skills explicitly stated in the document.
  - Do not fabricate skills not present in the source.
  - If a skill fits multiple categories, place it in the most relevant one only.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Return ONLY valid JSON matching the required schema.
- Do NOT hallucinate, infer, or fabricate any data not present in the document.
- Do NOT include markdown code fences (\`\`\`), commentary, or any text outside the JSON object.
- All string values must be properly escaped (e.g., use \n for newlines inside strings).
- If a field has no data in the document, return null for that field — do not omit the key.`;

        const result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            { text: prompt },
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
                  required: ["name"],
                },
                contactItems: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      icon: { type: Type.STRING, description: "One of: Mail, Phone, Globe, Linkedin, Github, Twitter" },
                      text: { type: Type.STRING, description: "Display text, e.g., email address, phone number, or handle" },
                      url: { type: Type.STRING, description: "The actual URL or mailto:/tel: link. If it's an email, prefix with mailto:. If it's a phone, prefix with tel:" }
                    }
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
                  },
                },
                skills: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
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
