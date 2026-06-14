# PresenceCV 專案架構說明

## 專案概要

PresenceCV 是一個以 AI 驅動的線上履歷建構工具，讓使用者能夠快速建立、編輯、分享及匯出精美的專業履歷。

---

## 技術堆疊

| 層級 | 技術 |
|------|------|
| **前端框架** | React 19 + TypeScript 5.8 |
| **樣式系統** | TailwindCSS v4（透過 `@tailwindcss/vite` 整合） |
| **動畫** | Motion（Framer Motion）、CSS 動畫 |
| **拖放排序** | @hello-pangea/dnd |
| **圖片裁切** | react-easy-crop |
| **路由** | react-router-dom v7 |
| **圖示** | lucide-react |
| **建置工具** | Vite 6 |
| **開發伺服器** | Express 4（`server.ts`，整合 Vite middleware） |
| **AI 解析** | Google Gemini API（`@google/genai`） |
| **後端 / 資料庫** | Firebase（Authentication + Firestore） |
| **部署** | Vercel（前端 SPA + Serverless API） |

---

## 資料流與架構

```
使用者瀏覽器
    │
    ├─ Landing Page ("/")
    │     └─ Google OAuth 登入 → Firebase Auth
    │
    ├─ Edit Page ("/app") [需登入]
    │     ├─ useResume Hook ← → localStorage（即時）
    │     │                  ← → Firestore users/{uid}/userState（1.5秒防抖同步）
    │     ├─ AI 匯入 → POST /api/parse-resume（Express/Vercel）
    │     │              └─ 若伺服器無金鑰 → 前端直接呼叫 Gemini API
    │     ├─ 分享 → Firestore sharedResumes / liveResumes
    │     └─ PDF 匯出 → 開啟 /view?print=true → window.print()
    │
    ├─ View Page ("/view")
    │     ├─ 本地預覽模式（使用 useResume 資料）
    │     ├─ 分享模式（?id= 或 ?live= 從 Firestore 讀取）
    │     └─ 列印模式（?print=true → A4 排版 → 自動縮放 → 觸發列印）
    │
    └─ 靜態頁面 ("/privacy", "/terms")
```

### 關鍵資料流

1. **認證流程**：LandingPage → Google 登入彈窗 → `onAuthStateChanged` → 建立/讀取 `users/{uid}` 文件
2. **資料同步**：編輯 → `setAppState` → localStorage 立即寫入 + Firestore 延遲（1.5 秒）寫入
3. **AI 匯入**：上傳檔案 → Base64 編碼 → 伺服器端 Gemini 解析（或前端代理模式） → 建立新 Profile
4. **分享流程**：快照連結（一次性寫入 `sharedResumes`）或即時連結（持續同步至 `liveResumes`）

---

## 目錄結構

```
PresenceCV/
├── index.html              # HTML 入口（Vite SPA）
├── server.ts               # Express 開發伺服器 + API 代理
├── vite.config.ts           # Vite 設定（React、Tailwind、環境變數）
├── tsconfig.json            # TypeScript 設定
├── firebase.json            # Firebase Hosting + Firestore Rules 指定
├── firestore.rules          # Firestore 安全規則
├── vercel.json              # Vercel SPA 重寫規則
├── .env.example             # 環境變數範本
├── package.json             # 依賴與腳本
│
├── api/
│   └── parse-resume.ts      # Vercel Serverless 函式：AI 履歷解析端點
│
├── public/
│   └── favicon.png          # 品牌 Logo 兼瀏覽器 Favicon（簡約幾何「CV」字母圖）
│
├── src/
│   ├── main.tsx             # React DOM 渲染入口
│   ├── App.tsx              # 根元件：路由、AuthProvider、Firebase 設定檢查
│   ├── types.ts             # 核心 TypeScript 介面定義
│   ├── index.css            # 全域樣式：Tailwind 主題、玻璃態效果、列印排版
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx   # 認證狀態管理（Google 登入/登出、新用戶偵測）
│   │
│   ├── hooks/
│   │   └── useResume.ts     # 核心履歷狀態管理（多 Profile CRUD、Firestore 同步、清理邏輯）
│   │
│   ├── components/
│   │   ├── ProtectedRoute.tsx      # 路由守衛（未登入 → 重導至首頁）
│   │   ├── FirebaseSetupGuide.tsx  # Firebase 設定缺失時的全螢幕錯誤提示
│   │   └── ImportResumeModal.tsx   # AI 履歷匯入對話框
│   │
│   ├── pages/
│   │   ├── LandingPage.tsx  # 行銷首頁（Hero、功能、定價），使用 favicon.png 作為品牌 Logo
│   │   ├── EditPage.tsx     # 主編輯器（1273 行，拖放、內嵌編輯、主題、分享、匯出）
│   │   ├── ViewPage.tsx     # 公開履歷展示 + 列印排版
│   │   ├── PrivacyPage.tsx  # 隱私政策
│   │   └── TermsPage.tsx    # 服務條款
│   │
│   ├── data/
│   │   ├── defaultResume.ts       # 預設履歷範本（Alex Rivera）
│   │   └── personalBackup.ts      # 專案所有者的個人履歷備份
│   │
│   └── lib/
│       ├── firebase.ts      # Firebase 初始化（App、Auth、Firestore）
│       └── errorHandling.ts # 結構化 Firestore 錯誤處理
│
└── .agents/
    ├── AgentMap.yaml         # AI Agent 專用專案地圖
    ├── HumanMap.md           # 本文件（人類可讀的專案說明）
    └── skills/
        └── project-map.md   # Agent 技能定義檔
```

---

## 功能清單

### 1. Google 登入認證
- **涉及檔案**：`AuthContext.tsx`、`firebase.ts`、`LandingPage.tsx`
- **流程**：Google OAuth 彈窗 → Firebase Auth → Firestore 用戶文件建立
- **安全機制**：`select_account` 提示防止帳號混淆；`browserPopupRedirectResolver` 提升 iframe 相容性

### 2. 履歷編輯器
- **涉及檔案**：`EditPage.tsx`、`useResume.ts`、`types.ts`
- **功能**：
  - 內嵌式文字編輯（`contentEditable`）
  - 拖放排序區塊（使用 `@hello-pangea/dnd`）
  - 6 種預設主題色 + 自訂顏色選擇器
  - 背景動畫開關
  - 聯繫資訊 CRUD（自動偵測 email/電話格式）

### 3. 多 Profile 管理
- **涉及檔案**：`useResume.ts`、`EditPage.tsx`
- **功能**：建立、複製、重新命名、刪除履歷 Profile
- **限制**：至少保留一個 Profile

### 4. 大頭照上傳與裁切
- **涉及檔案**：`EditPage.tsx`
- **技術**：react-easy-crop → Canvas 裁切 → Base64 JPEG（最大 600px，85% 品質）
- **支援格式**：JPG、PNG、HEIF/HEIC

### 5. AI 履歷匯入
- **涉及檔案**：`ImportResumeModal.tsx`、`server.ts`、`api/parse-resume.ts`
- **流程**：上傳 PDF/圖片 → Base64 → Gemini 解析 → 結構化 JSON → 建立新 Profile
- **限制**：每日 5 次（透過 Firestore `user_limits` 追蹤），檔案最大 3MB
- **雙路徑**：伺服器端優先 → 前端代理備援

### 6. 分享功能
- **涉及檔案**：`EditPage.tsx`、`firestore.rules`
- **模式**：
  - **快照連結**：將當前狀態寫入 `sharedResumes`，產生一次性 URL
  - **即時連結**：寫入 `liveResumes`，後續編輯自動同步更新
- **安全**：即時連結更新需 `ownerUid` 或 `updateToken` 驗證

### 7. PDF 匯出
- **涉及檔案**：`EditPage.tsx`、`ViewPage.tsx`、`index.css`
- **流程**：localStorage 傳遞資料 → 開啟 `/view?print=true` → 二元搜尋自動縮放 → `window.print()`
- **排版**：精確 A4 尺寸（794×1122px），含階段式縮放媒體查詢

### 8. 履歷展示頁面
- **涉及檔案**：`ViewPage.tsx`
- **功能**：深色玻璃態設計、標籤導航、動畫過場
- **技能標籤解析**：自動識別「分類：技能1, 技能2」格式，分組呈現

---

## Firebase / API 整合

### Firebase Authentication
- 使用 Google 作為唯一登入提供者
- `signInWithPopup` + `browserPopupRedirectResolver`
- 登入後自動在 `users/{uid}` 建立用戶文件

### Firestore 集合結構

| 集合路徑 | 用途 | 存取權限 |
|----------|------|----------|
| `users/{uid}` | 用戶基本資料 | 僅本人讀寫 |
| `users/{uid}/userState/state` | 完整應用程式狀態（所有 Profile） | 僅本人讀寫 |
| `user_limits/{uid}` | AI 匯入每日使用次數 | 僅本人讀寫 |
| `sharedResumes/{id}` | 快照分享連結 | 任何人可讀、僅可建立、不可修改/刪除 |
| `liveResumes/{id}` | 即時分享連結 | 任何人可讀、建立需登入、更新需 ownerUid 驗證 |

### Gemini AI API
- **伺服器端**：`server.ts`（開發）和 `api/parse-resume.ts`（Vercel 生產）
- **前端備援**：`ImportResumeModal.tsx` 直接呼叫（適用 AI Studio 免費層）
- **模型**：`gemini-3.1-flash-lite-preview`（伺服器）/ `gemini-3-flash-preview`（前端）

---

## 開發者指南

### 新增功能時的建議起手式

1. **理解資料模型**：先閱讀 `src/types.ts`，了解 `ResumeData`、`Profile`、`Block` 的結構
2. **修改狀態管理**：幾乎所有資料操作都在 `src/hooks/useResume.ts`，這是最核心的檔案
3. **新增 UI 區塊**：在 `EditPage.tsx` 中新增編輯界面 + `ViewPage.tsx` 中新增展示界面
4. **新增路由**：修改 `src/App.tsx` 中的 `<Routes>` 設定
5. **新增 Firestore 集合**：同步更新 `firestore.rules` 的安全規則

### 同時需要注意的檔案群組

| 當你修改... | 同時檢查... |
|-------------|-------------|
| `types.ts` | `useResume.ts`、`EditPage.tsx`、`ViewPage.tsx` |
| `useResume.ts` | `EditPage.tsx`（消費者）、`firestore.rules`（權限） |
| `EditPage.tsx` 的分享邏輯 | `ViewPage.tsx`（接收端）、`firestore.rules` |
| `firebase.ts` | `.env.example`、`server.ts` |
| `index.css` 的列印樣式 | `ViewPage.tsx` 的列印模式邏輯 |

### 開發環境啟動

```bash
cp .env.example .env    # 填入 Firebase + Gemini 金鑰
npm install
npm run dev             # 啟動 Express + Vite（http://localhost:3000）
```

---

## 未來維護建議

### 技術債

1. **`EditPage.tsx` 過於龐大**（1273 行）：建議拆分為子元件：
   - `ProfileSwitcher` — Profile 標籤列
   - `ThemePicker` — 主題色選擇器
   - `BlockTabBar` — 區塊標籤拖放列
   - `InfoEditor` — 個人資訊編輯區
   - `ListBlockEditor` — 列表區塊編輯器
   - `TagBlockEditor` — 標籤區塊編輯器
   - `ShareModal` — 分享對話框
   - `PhotoUploader` — 照片上傳與裁切

2. **重複的 AI Prompt**：`server.ts`、`api/parse-resume.ts`、`ImportResumeModal.tsx` 中有三份類似的 Gemini prompt，應抽取為共用模組

3. **硬編碼的使用者 Email**：`mujoecs@gmail.com` 在 `ImportResumeModal.tsx`（無限制）和 `EditPage.tsx`（個人備份按鈕）中硬編碼，應改為環境變數或 Firestore admin flag

4. **缺少錯誤邊界**：目前無 React Error Boundary，任何元件錯誤會導致整個應用白屏

5. **缺少測試**：無單元測試或整合測試

6. **`any` 型別過多**：`useResume.ts` 中的 items 使用 `any[]`、多處事件處理使用 `any`

### 可改善之處

- **離線支援**：可利用 Firestore 的 `enablePersistence()` 提供基本離線編輯能力
- **版本歷史**：考慮加入履歷版本管理（Firestore 子集合）
- **國際化 (i18n)**：目前 UI 全為英文，可加入多語言支援
- **無障礙 (a11y)**：`contentEditable` 元素缺少 ARIA 標籤
- **SEO**：SPA 結構不利於 SEO，分享連結可考慮加入 SSR 或 Open Graph meta tags

---

## 更新紀錄

### 專案本體更新紀錄 (Project Updates)

#### 2026-05-05
- **初始建立**：完整掃描專案並撰寫架構文件。

#### 2026-05-08
- **功能修復**：
  1. 在建立/複製履歷 Profile 時清除 `liveId` 與 `updateToken`，確保每個 Profile 有獨立的分享連結。
  2. 新增 `copyTextToClipboard` 包含 `execCommand` 備用方案，解決手機版 Safari 無法複製連結的問題。

#### 2026-06-06
- **11:35** - **品牌識別更新**：
  1. 生成簡約幾何「CV」Logo 圖並放置於 `public/favicon.png`。
  2. `index.html` 新增 `<link rel="icon">` 標籤。
  3. `LandingPage.tsx`（導覽列 + 頁尾）、`PrivacyPage.tsx`、`TermsPage.tsx` 全部將原本的 `LucideIcons.Box` 圖示替換為 `<img src="/favicon.png">` 並加上 `mixBlendMode: 'multiply'` 使白底融入乳白色背景。

#### 2026-06-14
- **15:20** - **文件對齊更新**：
  1. 修正 `README.md` 的技術堆疊表格，補上遺漏的 `react-fast-marquee`。
  2. 更新 `README.md` 中的專案目錄結構，補齊 `public/favicon.png` 與根目錄設定檔以如實呈現網站本體結構。

---

### 作業與規範更新紀錄 (Workflow & Rule Updates)

#### 2026-06-14
- **15:05** - **Agent 規範重構**：
  1. 重寫 `.agents/skills/project-map.md`：修正任務前僅需讀取 AgentMap（不讀 HumanMap）、任務後才讀取並更新 HumanMap、新增嚴格的 Git 規則、更新紀錄時間戳記改為精確到分鐘。
  2. `AgentMap.yaml` 新增 `dependency_groups` 區段（跨檔案依賴分析）與 `static_assets` 區段（品牌資源）。
  3. `HumanMap.md` 目錄結構新增 `public/` 資料夾與 `favicon.png` 描述。

- **15:25** - **排版規範調整**：更新 `.agents/skills/project-map.md`，明訂 HumanMap.md 更新紀錄表格中，每筆紀錄行之間必須相隔一個空白行，以提升人類可讀性。

- **15:32** - **工作模式與重構更新**：
  1. 更新 `.agents/skills/project-map.md` 的 Git 規則：每次執行完後自動執行 `git add <Modified Files>`（不需使用者同意），再提出 `git commit -m` 請求供使用者確認。
  2. 更新 `.agents/skills/project-map.md` 的紀錄格式：將更新紀錄切分為「專案本體」與「作業規範」，並改用日期區塊包覆、僅標示「時:分」的格式。
  3. 重構 `HumanMap.md` 歷史更新紀錄至此新格式。

- **15:40** - **Git 工作規範調整**：更新 `.agents/skills/project-map.md` 的 Git 規則，允許並要求 Agent 在 `git add` 後自動執行 `git commit`（發起 run_command 以提供確認通知給使用者）。
