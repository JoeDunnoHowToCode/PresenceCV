---
name: hotfix-workflow
description: >
  Defines the streamlined emergency hotfix workflow.
  Trigger this skill when the production environment is broken or a critical bug
  needs immediate fixing, bypassing the heavy review pipelines.
---

# Hotfix Workflow (Emergency)

When handling an emergency hotfix:

1. **Analyze Quickly**: Read `.agents/AgentMap.yaml` to locate the source of the bug.
2. **Implement Immediately**: Skip the sub-agent reviews and planning phases. Execute the code changes directly.
3. **Verify Locally**: Run `npx vitest run` or `npm run lint`. Even though this is an emergency, if local verification fails, you MUST STOP and fix the issue before proceeding. Do not deploy broken code.
4. **Document (Post-mortem)**: 
   - Update `.agents/HumanMap.md` (trigger `update-humanmap` skill) to record the incident and fix.
   - Update `.agents/AgentMap.yaml` if architecture changed.
5. **Commit**: `git add <source_files>` and `git commit -m "fix: emergency hotfix description"`.
