# PresenceCV

> **Your AI-Powered Professional Presence** — Build stunning, shareable resumes in minutes.

PresenceCV is a modern, AI-powered online resume builder built with React, TypeScript, and Firebase. It features a rich editing experience with drag-and-drop sections, real-time sharing, PDF export, multi-language (i18n) support, and Gemini AI–powered resume importing.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **AI Resume Import** | Upload a PDF, JPG, or PNG and Gemini AI extracts structured data automatically |
| **Live Share Links** | Generate a URL that updates in real-time as you edit |
| **Snapshot Links** | Capture a point-in-time version of your resume to share |
| **PDF Export** | Clean, A4-optimized print layout with auto-scaling |
| **Multi-Profile** | Create and manage multiple resume versions for different opportunities |
| **Multi-Language (i18n)** | Seamless internationalization with English and Traditional Chinese UI switching |
| **XSS & URL Sanitization** | DOMPurify-powered sanitization preventing `javascript:` XSS script execution |
| **Rate Limiting & Security** | Upstash Redis API rate limiter and Firebase App Check bot protection |
| **Theme Accent Colors** | 6 preset accent colors + custom hex color picker |
| **Photo Upload** | Upload and crop a profile photo with an in-browser cropper |
| **Drag & Drop** | Reorder sections and items with smooth drag-and-drop |
| **Warm Glassmorphic UI** | Premium warm cream-tone aesthetic with glassmorphic cards and animated smoke background |

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Firebase project](https://console.firebase.google.com/) with **Authentication** (Google provider) and **Firestore Database** enabled
- (Optional) A [Gemini API key](https://aistudio.google.com/apikey) for AI resume import

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd PresenceCV
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
# ------------------------------------------------------------------------------
# 1. Firebase Client Configuration (Required for Frontend)
# ------------------------------------------------------------------------------
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_ID=                    # Optional: Non-default Firestore DB ID

# ------------------------------------------------------------------------------
# 2. AI Features Configuration (Required for AI Resume Import)
# ------------------------------------------------------------------------------
GEMINI_API_KEY=your_gemini_api_key

# ------------------------------------------------------------------------------
# 3. Security & Admin Configuration (Required for Serverless Admin SDK)
# ------------------------------------------------------------------------------
FIREBASE_SERVICE_ACCOUNT_KEY= # Stringified JSON of your Firebase Admin Service Account Key

# ------------------------------------------------------------------------------
# 4. Serverless API Rate Limiting (Optional but Recommended)
# ------------------------------------------------------------------------------
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# ------------------------------------------------------------------------------
# 5. Firebase App Check & Security (Optional)
# ------------------------------------------------------------------------------
# Optional: Google reCAPTCHA v3 Site Key for App Check. Safely bypassed if omitted.
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

> **Note:** Frontend-accessible variables must be prefixed with `VITE_` (Vite requirement). Server-side credentials (`GEMINI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_KEY`, `UPSTASH_*`) do NOT need the prefix and remain hidden from client bundles.

### 3. Run in Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — this starts an Express server with Vite middleware for hot module replacement.

### 4. Build for Production

```bash
npm run build
npm start
```

### 5. Running Tests

To run unit, integration, and security rules tests:

```bash
# Run tests once (Vitest)
npm run test

# Run tests in watch mode
npm run test:watch

# Run Firestore security rules tests (requires a Java JRE for the emulator)
npm run test:rules
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.8, TailwindCSS 4 |
| UI & i18n Libraries | lucide-react, Motion (Framer Motion), @hello-pangea/dnd, react-easy-crop, i18next, i18next-browser-languagedetector, DOMPurify |
| Routing | react-router-dom v7 |
| Build | Vite 6 |
| Dev Server | Express 4 + Vite middleware |
| AI | Google Gemini (@google/genai) |
| Backend & Security | Firebase Authentication (Google OAuth), Firestore, Firebase App Check (reCAPTCHA v3), Upstash Redis Rate Limiter |
| Testing | Vitest, React Testing Library, jsdom, @firebase/rules-unit-testing |
| Deployment | Vercel (SPA + Serverless Functions) |

---

## 📂 Project Structure

```
PresenceCV/
├── index.html              # SPA entry point
├── server.ts               # Express dev server + API proxy
├── vite.config.ts           # Vite configuration
├── vitest.config.ts         # Vitest configuration
├── tsconfig.json            # TypeScript configuration
├── firebase.json            # Firebase config
├── firestore.rules          # Firestore security rules
├── vercel.json              # Vercel deployment config
├── .env.example             # Environment variables template
├── package.json             # Dependencies and scripts
│
├── api/
│   └── parse-resume.ts      # Vercel serverless functions (AI parser)
│
├── public/
│   └── favicon.png          # Monogram CV logo & favicon
│
├── tests/                   # Vitest unit & security rules tests
│   ├── EditorPage.test.tsx
│   ├── ImportResumeModal.test.tsx
│   ├── LanguageSwitcher.test.tsx
│   ├── ViewerPage.test.tsx
│   ├── api.parse-resume.test.ts
│   ├── firestore.rules.test.ts
│   ├── htmlSanitizer.test.ts
│   ├── performance.test.tsx
│   ├── rateLimiter.test.ts
│   ├── useResume.test.ts
│   └── utils.test.ts
│
└── src/
    ├── main.tsx             # React DOM entry
    ├── App.tsx              # Root component (routing + auth)
    ├── setupTests.ts        # Vitest setup (jest-dom, whatwg-fetch)
    ├── types.ts             # Shared TypeScript interfaces
    ├── constants.ts         # Application constants
    ├── index.css            # Global styles + print layout
    │
    ├── components/          # Reusable UI components (Editor, Viewer, Modal, i18n)
    ├── contexts/            # React context providers (AuthContext)
    ├── data/                # Static resume templates
    ├── hooks/               # Custom hooks (useResume — core state mgmt)
    ├── i18n/                # Internationalization config and translations
    ├── lib/                 # Firebase init, error handling, App Check
    ├── pages/               # Route-level page components (Editor, Viewer, Share)
    └── utils/               # Sanitization (DOMPurify), RateLimiter, Exporters
```

---

## 🔒 Security & Admin

- **Authentication**: Google OAuth only — no password storage
- **Data Isolation**: Firestore security rules enforce strict per-user access (UID matching)
- **App Check Bot Protection**: Optional Firebase App Check (reCAPTCHA v3) integration preventing unauthorized script access
- **API Rate Limiting**: Upstash Redis serverless rate limiter restricting `/api/parse-resume` abuse
- **XSS Defense**: DOMPurify sanitization filtering out malicious `javascript:` schemes in URLs
- **Session Cleanup**: Sign-out clears all localStorage data to prevent cross-session leaks
- **Shared Links**: Read-only access; cannot be updated or deleted after creation
- **Live Links**: Updates are gated by `ownerUid` verification
- **Admin Privileges**: To grant admin privileges (bypassing the 3 profiles limit), you must manually create a document inside the `admins` Firestore collection where the Document ID is exactly the user's Firebase UID.

---

## 🚢 Deployment (Vercel)

1. Connect your repo to [Vercel](https://vercel.com)
2. Add environment variables in Vercel project settings:
   - All `VITE_FIREBASE_*` variables
   - `GEMINI_API_KEY` (for server-side AI parsing)
   - `FIREBASE_SERVICE_ACCOUNT_KEY` (for server-side token verification)
   - `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN` (optional rate limiter)
   - `VITE_RECAPTCHA_SITE_KEY` (optional App Check)
3. Deploy — Vercel auto-detects Vite and uses `api/` for serverless functions
4. The `vercel.json` SPA rewrite handles client-side routing

---

## ⚠️ Known Limitations

- **Single-Page PDF**: PDF export is optimized for one A4 page; very long resumes may be auto-scaled down significantly
- **No Offline Mode**: Requires an internet connection for Firebase operations
- **Browser Compatibility**: `contentEditable` fields may behave differently across browsers
- **Image Storage**: Photos are stored as base64 in Firestore documents, which limits practical photo size

---

## 📄 License

Apache-2.0 — see the license header in source files.

---

<p align="center">Crafted with care by <a href="mailto:mujoecs@gmail.com">Joe</a></p>
