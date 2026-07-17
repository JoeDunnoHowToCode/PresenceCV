---
name: update-humanmap
description: >
  Defines the exact formatting, archiving, and structure rules for updating HumanMap.md.
  Trigger this skill whenever you need to update project documentation after finishing a task.
---

# HumanMap Update Rules

When updating `.agents/HumanMap.md`, follow these formatting and archiving rules strictly:

## 1. Documentation Structure
The log is divided into two strict sections:
- **Project Updates**: Core features, UI, data model changes.
- **Workflow & Rule Updates**: Changes to Agent rules, pipelines, and `.agents/` structure.

## 2. Formatting Guidelines
- Use Traditional Chinese.
- Wrap daily logs in a date block: `#### YYYY-MM-DD`.
- Add a blank line between every log entry.
- Prefix time: `- **HH:MM** - [Content]...`

## 3. Archiving Rule (The Ratchet System)
To keep the main file lightweight and prevent copy-paste hallucination risks:
1. Always run the archiving script before writing new entries:
   `python3 .agents/skills/update-humanmap/scripts/archive-log.py`
2. This script automatically scans `.agents/HumanMap.md` for date blocks that are NOT today's date, cuts them, and saves them to `UpdateLog/YYYY-MM-DD.md` safely.
3. Ensure `> [查看歷史歸檔紀錄](UpdateLog/)` remains at the top of the update sections.

## 4. AgentMap.yaml Sync
Always sync `.agents/AgentMap.yaml` alongside `HumanMap.md` if the codebase architecture (files, env vars, dependencies) changed.

> **CRITICAL**: Neither `HumanMap.md` nor `AgentMap.yaml` should ever be added to git version control.
