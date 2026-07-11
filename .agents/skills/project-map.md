---
name: project-map
description: >
  ALWAYS activate this skill for ANY task in the PresenceCV workspace.
  This skill defines the complete multi-agent pipeline, documentation
  format, git rules, and operational procedures. Read this file to
  understand HOW to execute the iron rules defined in AGENTS.md.
globs:
  - "**/*"
---

# Project Map Skill — PresenceCV 操作手冊

> **本檔案的定位**：`project-map.md` 是詳細的操作手冊（SOP），定義了 `AGENTS.md` 中鐵律的具體執行方式。本檔案不會自動注入 System Prompt，而是在 AI 遇到專案相關任務時按需讀取。

---

## 一、文件架構與定位

### `.agents/` 目錄中的檔案角色分工

| 檔案 | 格式 | 受眾 | 語言 | 用途 | Git 追蹤 |
|------|------|------|------|------|----------|
| `AGENTS.md` | Markdown | AI Agent | 中/英混合 | 最高優先級鐵律，自動注入 System Prompt | ✅ 追蹤 |
| `skills/project-map.md` | Markdown | AI Agent | 中/英混合 | 詳細 SOP 操作手冊，按需讀取 | ✅ 追蹤 |
| `AgentMap.yaml` | YAML | AI Agent | English | 機器可讀的專案架構快照 | ❌ 不追蹤 |
| `HumanMap.md` | Markdown | 人類開發者 | 繁體中文 | 人類可讀的專案歷史日誌與藍圖 | ❌ 不追蹤 |

> [!WARNING]
> **`AGENTS.md` 與 `skills/project-map.md` 會被 git 追蹤**（用於展示 AI 工作流規範設計）。
> **`AgentMap.yaml` 與 `HumanMap.md` 絕對不進 git**（可能包含敏感開發資訊如 API Key、Admin UID 等，且更新頻繁會造成 commit 雜訊）。

---

## 二、完整修改管線 (Full Pipeline) — 詳細 SOP

以下定義了 `AGENTS.md` 中「修改動作完整管線」各階段的具體執行方式。

### 階段 ① — 架構掃描 (Orchestrator)

1. **讀取 `.agents/AgentMap.yaml`**，掌握：
   - 專案整體架構（目錄結構、模組用途、技術堆疊）
   - `dependency_groups` 區段（跨檔案依賴分析）
   - `key_flows` 區段（功能流程追蹤）
2. **分析連動影響**：根據使用者的需求，判斷需要修改哪些檔案，以及這些檔案的修改是否會連帶影響其他模組。
3. **絕對不要在此階段讀取 `HumanMap.md`**，它是任務完成後才需要更新的人類日誌。

### 階段 ② — 計畫撰寫 (Orchestrator)

1. 產出一份結構化的**實作計畫報告**，內容包含：
   - 需求摘要（要做什麼）
   - 影響範圍分析（會動到哪些檔案、是否有連動）
   - 具體實作步驟
   - 風險評估

### 階段 ③ — 計畫審查 (Plan Critic Reviewer Sub-Agent)

1. 將計畫報告提交給 **Plan Critic Reviewer** sub-agent。
2. Plan Critic 將專注於：
   - 資安漏洞
   - 邊界情況（例如 Serverless 特性限制）
   - 架構設計缺陷
   - 遺漏的連動影響
3. **來回討論**：Orchestrator 與 Plan Critic 持續討論，直到 Plan Critic 對計畫表示滿意為止。
4. Orchestrator 整合討論結果，產出最終版本的實作計畫。

### 階段 ④ — 使用者核准 (視規模)

- **大功能**（新增功能、架構變更、跨多檔案修改）：將最終計畫呈報使用者，等待明確核准後才能進入實作階段。
- **小功能**（Bug 修復、單一元件調整）：Plan Critic 通過即可直接進入實作，不需額外等待使用者核准。

### 階段 ⑤ — 實作 (Full Stack Engineer Sub-Agent)

1. 將核准後的實作計畫交付給 **Full Stack Engineer** sub-agent 執行。
2. Full Stack Engineer 依計畫進行程式碼修改。
3. 實作過程中如發現計畫需要重大調整，須回報 Orchestrator 重新走 ②③。

### 階段 ⑥ — 測試撰寫 (QA & Test Engineer Sub-Agent) [與 ⑤ 同步進行]

1. 在 Full Stack Engineer 開始實作的**同時**，將計畫同步提交給 **QA & Test Engineer** sub-agent。
2. QA & Test Engineer 負責撰寫針對該功能的單元測試或整合測試。

### 階段 ⑦ — 測試執行 (QA & Test Engineer Sub-Agent)

1. 待 Full Stack Engineer 完成實作後，QA & Test Engineer 執行所有已撰寫的測試。
2. 若測試未通過，將失敗報告回傳給 Orchestrator，由 Full Stack Engineer 修正後重新測試。
3. 直到所有測試 100% 通過。

### 階段 ⑧ — 安全審查 (Security Engineer Sub-Agent)

1. 將測試通過的程式碼與修改報告提交給 **Security Engineer** sub-agent。
2. Security Engineer 檢查：
   - 是否有硬編碼的敏感資訊（API Key、Admin UID 等）
   - Firestore 安全規則是否完善
   - API 端點是否有 Rate Limiting 保護
   - 前端是否暴露了不該暴露的資訊
3. 若 Security Engineer 提出問題或風險，須修正後重新提交，直到 Security Engineer 滿意為止。

### 階段 ⑨ — 文件更新 (Orchestrator)

#### 9a. 更新 HumanMap.md

1. **讀取** `.agents/HumanMap.md` 了解目前的文件狀態。
2. **更新內容**（以繁體中文撰寫）：
   - 若整體架構有變（新增/移除/搬移檔案），更新相關章節（目錄結構、功能清單、技術堆疊等）。
   - 在對應的更新紀錄區塊新增本次修改紀錄。

3. **更新紀錄分區與格式規範**：
   紀錄分為兩大獨立區塊：
   - **專案本體更新紀錄 (Project Updates)**：PresenceCV 網站本體的功能、樣式、資料結構等異動。
   - **作業與規範更新紀錄 (Workflow & Rule Updates)**：Agent 協作規則、工作流程、作業模式的更改。

4. **排版規範**：
   - 以日期區塊 `#### YYYY-MM-DD` 包覆同日紀錄。
   - 同日區塊內每次修改僅標示「時:分」：`- **HH:MM** - [改動內容]...`
   - 每筆紀錄之間**必須相隔一個空白行**。
   - 每筆紀錄應描述：改動了哪些檔案、新增或修改了什麼功能、是否影響現有流程或資料模型。

5. **歸檔檢查**：若兩個紀錄區塊的總筆數超過 20 筆，執行歸檔流程（見本文件「UpdateLog 歸檔規則」章節）。

#### 9b. 更新 AgentMap.yaml

更新 `.agents/AgentMap.yaml` 以反映最新的專案狀態，包含：
- 新增或移除的檔案/模組
- 改變的依賴關係或資料流
- 修改的資料模型或 Firestore collections
- 新增或改變的環境變數
- 更新 `dependency_groups`（若跨檔案關係有變）

#### 9c. 注意事項

- **HumanMap.md 與 AgentMap.yaml 是本機檔案**，僅做本機寫入，絕對不執行 `git add` 將它們加入版本控制。
- 這是鐵律，見 `AGENTS.md` 第 3 條。

### 階段 ⑩ — Git Commit (Orchestrator)

1. 使用 `git diff` 列出本次變更的原始碼檔案。
2. 僅 `git add` 原始碼檔案（排除 `.agents/` 底下的所有檔案）。
3. 執行 `git commit -m "描述性訊息"` 提交變更。
4. **嚴禁** `git push` 或其他破壞性 Git 指令（由使用者自行決定何時 push）。

---

## 三、簡化流程 (Simplified Pipeline)

當 AI 判斷修改**僅限單一檔案且不涉及邏輯變更**時（例如修正 typo、調整顏色值、CSS 微調），可走以下簡化流程：

1. 讀取 `AgentMap.yaml`（確認無連動影響）
2. Orchestrator 直接修改檔案
3. 更新 HumanMap.md 與 AgentMap.yaml（階段 ⑨）
4. Git Commit（階段 ⑩）

> [!IMPORTANT]
> 如果「簡化流程」中途發現修改範圍擴大（需要改多個檔案或涉及邏輯變更），必須**立即升級為完整管線**。

---

## 四、緊急修復流程 (Emergency Hotfix)

遇到正式區當機或使用者回報重大 Bug 時：

1. AI 自行判斷最佳修復路徑（可跳過 Plan Critic、QA、Security 等階段）。
2. 優先快速修復問題。
3. **事後必須補齊**：
   - 更新 HumanMap.md 與 AgentMap.yaml
   - Git Commit
   - 在 ErrorLog 中記錄該錯誤（見「ErrorLog 規則」章節）

---

## 五、Git 追蹤規則 (混合方案)

### `.gitignore` 設定

`.agents/` 整個資料夾在 `.gitignore` 中被排除，但以下兩個檔案**需要被追蹤**（用於展示 AI 工作流規範設計）：

```gitignore
# Agent development files (local only)
.agents/

# Exception: track workflow rules for portfolio showcase
!.agents/AGENTS.md
!.agents/skills/
!.agents/skills/project-map.md
```

### 追蹤 vs 不追蹤

| 檔案 | 追蹤？ | 理由 |
|------|--------|------|
| `.agents/AGENTS.md` | ✅ | 展示 AI 工作流設計規範，無敏感資訊 |
| `.agents/skills/project-map.md` | ✅ | 展示 AI 操作 SOP 設計，無敏感資訊 |
| `.agents/AgentMap.yaml` | ❌ | 更新頻繁、可能含內部架構細節 |
| `.agents/HumanMap.md` | ❌ | 可能含 API Key、Admin UID 等敏感開發紀錄 |

---

## 六、UpdateLog 歸檔規則

- **目錄**：`UpdateLog/`（專案根目錄）
- **用途**：當 `HumanMap.md` 的更新紀錄過長（總筆數超過 20 筆）時，將較舊的紀錄歸檔至此。
- **歸檔流程**：
  1. 計算 HumanMap.md 中兩個更新紀錄區塊（專案本體 + 作業規範）的總紀錄筆數。
  2. 若總筆數 > 20，將最舊的紀錄（保留最近 15 筆）剪下。
  3. 依紀錄所屬季度寫入 `UpdateLog/YYYY_QN.md`（例如 `UpdateLog/2026_Q2.md`）。歸檔檔案內必須與 `HumanMap.md` 相同，維持「專案本體更新紀錄」與「作業與規範更新紀錄」兩大分類的分區結構。
  4. 在 HumanMap.md 更新紀錄區塊頂部加入歸檔連結：`[查看更早的歷史紀錄](UpdateLog/YYYY_QN.md)`。
- **歸檔時機**：在每次 post-task 更新 HumanMap.md 時檢查筆數，若超標則自動執行歸檔。
- 詳細規則請參考 `UpdateLog/README.md`。

---

## 七、ErrorLog 錯誤紀錄規則

- **目錄**：`ErrorLog/`（專案根目錄）
- **用途**：記錄使用者在使用 PresenceCV 時回報的錯誤訊息，以便開發者除錯。
- **檔案命名**：`YYYY-MM-DD.md`（按日期分檔）。
- **紀錄時機**：當使用者回報錯誤、提供錯誤截圖、或貼上 console error 時，Agent 應將錯誤結構化記錄至對應日期的 ErrorLog 檔案。
- **紀錄格式**（每筆錯誤）：
  ```
  ### HH:MM — [錯誤摘要]
  - **頁面/模組**：[頁面或元件名稱]
  - **錯誤類型**：[Exception 類型]
  - **錯誤訊息**：[完整 error.message]
  - **Stack Trace**（如有）
  - **重現步驟**：[操作描述]
  - **影響範圍**：[影響的功能]
  - **狀態**：🔴 未修復 / 🟡 調查中 / 🟢 已修復（附 commit hash）
  ```
- **需捕捉的例外類別**：Firebase/Firestore 錯誤、Gemini AI API 錯誤、前端 UI 操作異常、網路/環境問題、分享與匯出功能失敗。
- 詳細的例外分類清單請參考 `ErrorLog/README.md`。
