# PresenceCV — Agent Guide (Codex)

**The single source of truth for this project is [`CLAUDE.md`](./CLAUDE.md) in the repo root. Read it before doing anything.**

It covers: the stack, the command table (`dev` / `build` / `check` / `typecheck` / `lint` / `test` / `test:watch` / `test:rules`), how deployment works, the key-file map, Firestore collections, the i18n workflow, the definition of done, and known traps.

This file exists only so Codex discovers the same rules Claude does. It is deliberately not a second copy — duplicated docs in this repo have gone stale before, which is exactly what `CLAUDE.md` replaced.

## The four rules that must never be missed

Even if you read nothing else, these are non-negotiable:

1. **Never `git push`, `git merge`, or `git rebase`.** Deploy is a human pushing to `main`; Vercel auto-builds and `firestore.rules` ships via GitHub Action. Commit only when asked.
2. **Stop after 3 consecutive failures** of the same test/typecheck/build command. Report a summary instead of guessing again.
3. **Never delete, skip, or weaken a test to make the suite pass.** Fix the code, and add a regression test for every bug you fix.
4. **Read `.agents/LESSONS.md` first**, and append new non-obvious gotchas there when you find one. (Local-only/gitignored — it may be absent in a fresh clone.)

## Verification gate

```bash
npm run check && npm run test
```

`npm run test` is a single Vitest run, not watch mode. `npm run test:rules` needs a Java JRE for the Firebase emulator.
