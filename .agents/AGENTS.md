# PresenceCV — 最高層級行為規範 (Iron Rules)

> **本檔案的定位**：`AGENTS.md` 是系統自動載入的最高優先級規則，內容會無條件注入 AI 的 System Prompt。因此本檔案僅記載「不可違反的鐵律」，所有操作細節請參閱 `.agents/skills/project-map.md`。

## 🔒 鐵律 (Non-Negotiable Rules)

### 1. 任務分類與強制前置作業
- 收到使用者請求後，**第一步**判斷該任務是否為「專案相關任務」（涉及 PresenceCV 的程式碼、架構、設定、部署、指令執行）。
- **專案無關任務**（純技術知識問答）：可直接回答，不觸發任何流程。
- **專案相關任務**：必須先讀取 `.agents/AgentMap.yaml` 掌握專案架構，再依據 `project-map.md` 定義的流程執行。

### 2. 修改動作的完整管線 (Full Pipeline)
凡涉及**修改檔案**的專案相關任務，必須依序執行以下管線（詳細操作規範見 `project-map.md`）：

| 階段 | 負責角色 | 動作 |
|------|----------|------|
| ① 架構掃描 | Orchestrator（你） | 讀取 AgentMap → 分析連動影響 |
| ② 計畫撰寫 | Orchestrator | 產出完整計畫報告 |
| ③ 計畫審查 | Plan Critic Reviewer | 審查計畫、提出意見，直到滿意 |
| ④ 使用者核准 | 使用者（視規模） | 大功能需使用者核准；小功能 Plan Critic 通過即可 |
| ⑤ 實作 | Full Stack Engineer | 執行程式碼修改 |
| ⑥ 測試撰寫 | QA & Test Engineer | 與 ⑤ 同步進行，撰寫測試 |
| ⑦ 測試執行 | QA & Test Engineer | 實作完成後執行測試 |
| ⑧ 安全審查 | Security Engineer | 審查程式碼漏洞與風險，不通過則回 ⑤ 修正 |
| ⑨ 文件更新 | Orchestrator | 更新 HumanMap.md → 更新 AgentMap.yaml |
| ⑩ Git Commit | Orchestrator | 最後一步，僅 commit 原始碼（`.agents/` 不進 git） |

> [!IMPORTANT]
> **簡化流程豁免**：若 AI 判斷影響範圍僅限單一檔案且不涉及邏輯變更（如修正 typo、調整顏色值、CSS 微調），可跳過 ③④⑤⑥⑦⑧，由 Orchestrator 直接修改後執行 ⑨⑩。

> [!IMPORTANT]
> **緊急修復豁免**：遇正式區當機或重大 Bug，AI 可自行判斷最佳修復路徑（可跳過部分階段），但**事後必須補齊所有文件紀錄（⑨⑩）**。

### 3. Git 鐵律
- **嚴禁** `git push`、`git merge`、`git rebase`、`git reset` 等破壞性指令。
- **嚴禁** `git add -f .agents/` — 絕對不可強制加入被 gitignore 的檔案。
- `.agents/AgentMap.yaml` 和 `.agents/HumanMap.md` 是**本機開發文件**，永遠不進版本控制。
- `git commit` 僅包含原始碼的修改。

### 4. 環境同步
- 任何修改都必須檢查是否同時影響本地測試環境（`server.ts`）與正式部署環境（`api/`），並保持兩者同步。
