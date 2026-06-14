---
description: >
  ALWAYS activate this skill for ANY task in the PresenceCV workspace.
  This skill encodes project-wide understanding via AgentMap and HumanMap.
  It ensures the agent always has current context and keeps documentation
  synchronized after every change.
globs:
  - "**/*"
---

# Project Map Skill — PresenceCV

This skill is a **self-discipline module** for the AI agent operating in the PresenceCV workspace. It enforces mandatory consultation and maintenance of two project knowledge artifacts.

## Artifacts

| File | Format | Audience | Language | Agent Access |
|------|--------|----------|----------|--------------|
| `.agents/AgentMap.yaml` | YAML | Agent (machine) | English | Read before task, update after task |
| `.agents/HumanMap.md` | Markdown | Human developer | 繁體中文 | Read & update **only after** task completion |

## Rules

### Before ANY Task

1. **Read `.agents/AgentMap.yaml`** to refresh your understanding of the project structure, tech stack, module purposes, data models, dependency groups, and cross-file dependencies.
2. Use `AgentMap.yaml` to quickly locate relevant modules, files, and their dependency groups for the current task.
3. **Do NOT read `HumanMap.md` at this stage.** It is a human-facing report, not an agent reference.

### During Task Execution

- Use `AgentMap.yaml` to identify which files implement the feature or module you are working on.
- Use the `dependency_groups` section in `AgentMap.yaml` to identify which files must be checked together when modifying a specific area.
- Track which features, components, services, or data models are affected by your changes.
- If you need to understand a specific flow (auth, sharing, PDF export, etc.), refer to the `key_flows` section in `AgentMap.yaml`.

### After ANY Task That Changes Behavior, Structure, or Data Models

1. **Update `.agents/AgentMap.yaml`** to accurately reflect the new state of the project. This includes:
   - New or removed files/modules
   - Changed dependencies or data flows
   - Modified data models or Firestore collections
   - New or changed environment variables
   - Updated dependency groups if cross-file relationships changed

2. **Read `.agents/HumanMap.md`** to understand the current documented state.

3. **Update `.agents/HumanMap.md`**（以繁體中文）:
   - If the overall architecture changed (new folders, files, moved files, removed files, etc.), update the relevant sections (目錄結構, 功能清單, 技術堆疊, etc.) to reflect the current state, including the file's purpose and its location in the directory tree.
   - **更新紀錄分區與格式規範**：將更新紀錄切分為以下兩個獨立大區塊：
     1. **專案本體更新紀錄 (Project Updates)**：關於 PresenceCV 網站本身的功能、樣式、資料結構等異動。
     2. **作業與規範更新紀錄 (Workflow & Rule Updates)**：關於 Agent 協作規則、工作流程、作業模式（例如 `.agents/` 目錄下檔案）的更改。
   - **更新紀錄的詳細排版**：
     - 在各大區塊下，以「日期區塊」（例如 `#### YYYY-MM-DD`）將同日的紀錄包覆。
     - 同一日期區塊內，每次修改僅標示「時:分」（例如 `- **15:05** - [改動內容]...」），不需要重複輸出完整日期。
     - 每一筆紀錄（時:分列表項）之間**必須相隔一個空白行**（方便人類閱讀）。
     - 每筆紀錄應描述：改動了哪些檔案、新增或修改了什麼功能、是否影響現有流程或資料模型、以及連帶影響的檔案。

4. **Do NOT skip** updating these artifacts. They are mandatory deliverables for every task.

5. These post-task documentation updates may be delegated to a sub-agent or completed in a separate session, but they must NOT be omitted.

### Git Rules

- **自動 git add**：當你修改或建立了專案檔案，在任務執行完成後，**必須自動執行 `git add <修改的檔案>` 指令**。此操作不需經過使用者事前同意。
- **自動 git commit**：在 `git add` 執行完成後，你**必須自動發起 `git commit -m "[詳細且完整的訊息]"` 指令並執行**。此指令會以 `run_command` 的方式呼叫，讓使用者可在其終端或介面上收到並確認該 commit 請求。
- **嚴格禁止 Git Push 等破壞性指令**：你**嚴格禁止**自行執行 `git push`、`git merge`、`git rebase`、`git reset` 或其他可能直接變更遠端分支、強制覆寫歷史的破壞性 Git 指令。

## Usage

### For Future Agents

This skill is implicitly activated for any task in this workspace because the `globs` pattern matches all files. You do not need to manually activate it.

**Steps you MUST follow:**

1. **Before starting work**: Read `.agents/AgentMap.yaml` only.
2. **While working**: Use `AgentMap.yaml` as your navigation and dependency analysis reference for the codebase.
3. **After completing work**: Update `AgentMap.yaml` first, then read and update `HumanMap.md`.

### Failure to Comply

If you skip reading or updating these artifacts, you risk:
- Making changes that conflict with existing architecture
- Duplicating functionality that already exists
- Breaking cross-file dependencies you weren't aware of
- Leaving stale documentation that misleads future agents and developers
