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

| File | Format | Audience | Language |
|------|--------|----------|----------|
| `.agents/AgentMap.yaml` | YAML | Agent (machine) | English |
| `.agents/HumanMap.md` | Markdown | Human developer | 繁體中文 |

## Rules

### Before ANY Task

1. **Read `.agents/AgentMap.yaml`** to refresh your understanding of the project structure, tech stack, module purposes, data models, and cross-file dependencies.
2. **Read `.agents/HumanMap.md`** to align with the human-facing description and check for any recent update records (更新紀錄).
3. Use `AgentMap.yaml` to quickly locate relevant modules and files for the current task.

### During Task Execution

- Use `AgentMap.yaml` to identify which files implement the feature or module you are working on.
- Track which features, components, services, or data models are affected by your changes.
- If you need to understand a specific flow (auth, sharing, PDF export, etc.), refer to the `key_flows` section in `AgentMap.yaml`.

### After ANY Task That Changes Behavior, Structure, or Data Models

1. **Update `.agents/AgentMap.yaml`** to accurately reflect the new state of the project. This includes:
   - New or removed files/modules
   - Changed dependencies or data flows
   - Modified data models or Firestore collections
   - New or changed environment variables

2. **Update `.agents/HumanMap.md`**（以繁體中文）by appending a new entry to the `更新紀錄` table at the bottom:
   - 改動了哪些檔案
   - 新增或修改了什麼功能
   - 是否影響現有流程或資料模型

3. **Do NOT skip** updating these artifacts. They are mandatory deliverables for every task.

## Usage

### For Future Agents

This skill is implicitly activated for any task in this workspace because the `globs` pattern matches all files. You do not need to manually activate it.

**Steps you MUST follow:**

1. **Before starting work**: Read both `.agents/AgentMap.yaml` and `.agents/HumanMap.md`.
2. **While working**: Use `AgentMap.yaml` as your navigation reference for the codebase.
3. **After completing work**: Update both artifacts to reflect your changes.

### Failure to Comply

If you skip reading or updating these artifacts, you risk:
- Making changes that conflict with existing architecture
- Duplicating functionality that already exists
- Breaking cross-file dependencies you weren't aware of
- Leaving stale documentation that misleads future agents and developers
