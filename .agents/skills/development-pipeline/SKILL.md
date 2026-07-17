---
name: development-pipeline
description: >
  Defines the standard multi-agent development pipeline for complex features.
  Trigger this skill when modifying architecture, adding large features, or
  doing anything that requires strict QA, security review, and planning.
---

# Development Pipeline (Complex Features)

When executing a complex feature, follow these steps strictly:

1. **Analyze**: Read `.agents/AgentMap.yaml` to understand the current architecture and identify dependency impacts. DO NOT read `HumanMap.md` yet.
2. **Plan**: Formulate an implementation plan report detailing the scope and impact.
3. **Review (Mandatory)**: Write the proposed plan to a temporary `task.md` or `pr_review.md` artifact. Invoke the `plan-critic` sub-agent to audit the raw artifact. Refine the plan based on feedback.
4. **User Approval**: Present the plan to the user and wait for explicit approval.
5. **Implement**: Invoke the `full-stack-engineer` to execute the code changes.
6. **Test**: Concurrently invoke the `qa-engineer` to write unit tests for the new code. Ensure all tests pass.
7. **Security Check**: Invoke the `security-engineer` to audit the final code before committing.
8. **Document**: Update `.agents/HumanMap.md` and `.agents/AgentMap.yaml` to reflect the changes. (Trigger the `update-humanmap` skill for formatting rules).
9. **Commit**: Use `git diff`, `git add <source_files>`, and `git commit -m "feat: description"` to save the changes. NEVER push.
