# PresenceCV

> **Your AI-Powered Professional Presence** — Build stunning, shareable resumes in minutes.

PresenceCV is a modern, AI-powered online resume builder built with React, TypeScript, and Firebase. It features a rich editing experience with drag-and-drop sections, real-time sharing, PDF export, and Gemini AI–powered resume importing.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **AI Resume Import** | Upload a PDF, JPG, or PNG and Gemini AI extracts structured data automatically |
| **Live Share Links** | Generate a URL that updates in real-time as you edit |
| **Snapshot Links** | Capture a point-in-time version of your resume to share |
| **PDF Export** | Clean, A4-optimized print layout with auto-scaling |
| **Multi-Profile** | Create and manage multiple resume versions for different opportunities |
| **Theme Colors** | 6 preset themes + custom hex color picker |
| **Photo Upload** | Upload and crop a profile photo with an in-browser cropper |
| **Drag & Drop** | Reorder sections and items with smooth drag-and-drop |
| **Dark Glassmorphic UI** | Premium dark-mode design with animated backgrounds |

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
# Firebase Configuration (required)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_ID=                    # Optional, for non-default Firestore DB

# AI Features (optional — enables AI resume import)
GEMINI_API_KEY=your_gemini_api_key
```

> **Note:** Frontend-accessible variables must be prefixed with `VITE_` (Vite requirement). The `GEMINI_API_KEY` is used server-side only and does NOT need the prefix.

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

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.8, TailwindCSS 4 |
| UI Libraries | lucide-react, Motion (Framer Motion), @hello-pangea/dnd, react-easy-crop |
| Routing | react-router-dom v7 |
| Build | Vite 6 |
| Dev Server | Express 4 + Vite middleware |
| AI | Google Gemini (@google/genai) |
| Backend | Firebase Authentication (Google OAuth) + Firestore |
| Deployment | Vercel (SPA + Serverless Functions) |

---

## 📂 Project Structure

```
PresenceCV/
├── index.html          # SPA entry point
├── server.ts           # Express dev server + API proxy
├── api/                # Vercel serverless functions
├── src/
│   ├── main.tsx        # React DOM entry
│   ├── App.tsx         # Root component (routing + auth)
│   ├── types.ts        # Shared TypeScript interfaces
│   ├── index.css       # Global styles + print layout
│   ├── contexts/       # React context providers
│   ├── hooks/          # Custom hooks (useResume — core state mgmt)
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route-level page components
│   ├── data/           # Static resume templates
│   └── lib/            # Firebase init, error handling
├── firebase.json       # Firebase config
├── firestore.rules     # Firestore security rules
└── vercel.json         # Vercel deployment config
```

For a comprehensive architecture overview, see [**進階專案架構說明**](.agents/HumanMap.md).

---

## 🔒 Security

- **Authentication**: Google OAuth only — no password storage
- **Data Isolation**: Firestore security rules enforce strict per-user access (UID matching)
- **Session Cleanup**: Sign-out clears all localStorage data to prevent cross-session leaks
- **Shared Links**: Read-only access; cannot be updated or deleted after creation
- **Live Links**: Updates are gated by `ownerUid` verification

---

## 🚢 Deployment (Vercel)

1. Connect your repo to [Vercel](https://vercel.com)
2. Add environment variables in Vercel project settings:
   - All `VITE_FIREBASE_*` variables
   - `GEMINI_API_KEY` (for server-side AI parsing)
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
