# PresenceCV — Agent Guide

AI-powered resume builder: React 19 + TypeScript 5.8 + Vite 6 + Tailwind 4 + Firebase 12 (Auth/Firestore/App Check), Gemini AI parsing, deployed on Vercel (SPA + serverless `api/`).

**Before starting any task, read `.agents/LESSONS.md`** — accumulated, hard-won gotchas (CSP + Firebase Auth, Safari print quirks, dnd/`React.memo` traps, `useResume` invariants). Append new non-obvious findings there when you hit one. It is local-only (gitignored), so it may be absent in a fresh clone or worktree.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Express + Vite middleware dev server on http://localhost:3000 |
| `npm run build` | `vite build` (frontend only — Vercel builds `api/` separately) |
| `npm run check` | `typecheck` + `lint` — the standard pre-done gate |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `eslint .` |
| `npm run test` | `vitest run` — **single run, not watch** |
| `npm run test:watch` | `vitest` in watch mode |
| `npm run test:rules` | Firestore rules tests via `firebase emulators:exec`. **Requires a Java JRE** (CI uses Temurin 21). Skip locally if Java is unavailable. |

Report results with evidence: paste the lines that prove the outcome (e.g. Vitest's `Test Files` / `Tests` totals, or the failing assertion) — never the whole log, and never claim a pass without output from a run in this session. For a large error sweep, redirect (`npm run check > tsc-errors.log`) to avoid flooding context.

---

## Deployment

**Deploy = anything that lands on `main`** (a push or a merged PR). Vercel auto-builds the SPA and `api/` serverless functions. `firestore.rules` deploys through the GitHub Action `.github/workflows/deploy-firestore-rules.yml` (runs `scripts/deploy-firestore-rules.mjs`) on pushes to `main` that touch `firestore.rules` or that workflow; a manual run deploys Dev from any branch but Prod only from `main`. GitHub runs the workflow file from the pushed commit, so branches created before that fix (merged in `dc0abd4`) still carry the old any-branch trigger — never push to them.

**`git push` and merging (`git merge`, `gh pr merge`) require the user's explicit instruction in the current conversation.** Never do either on your own initiative — not to finish a task, and not because a workflow step elsewhere (e.g. "push the branch and open the PR") says so; ask instead. An approval covers only the action named: "push" is not "merge". Never `git rebase`, `git reset --hard`, or force-add ignored files. Commit your own work as you finish each step — no need to ask (in TDD, the red test and the green fix are separate commits). Don't touch `.github/workflows/` or `vercel.json` without explicit permission.

---

## Key files

| Path | Role |
|---|---|
| `src/types.ts` | Shared interfaces (`ResumeData`, `Profile`, `Block`, `ListItem`, `ContactItem`) + the Zod `ParsedResumeSchema` for AI output |
| `src/hooks/useResume.ts` | Core state management (~830 lines): Firestore sync, profiles, blocks, sharing. Most data bugs live here |
| `src/pages/EditorPage.tsx` | Authenticated editor route (`/editor`); delegates to `components/editor/{Desktop,Mobile}EditLayout` |
| `src/pages/ViewerPage.tsx` | Read-only render + print/PDF layout; serves `/view`, `/share/:id`, `/print/:id` |
| `firestore.rules` | Security rules — the real enforcement of the 3-profile free tier |
| `api/parse-resume.ts` | Vercel serverless Gemini parser; also imported directly by `server.ts` |
| `src/i18n/` | `config.ts` + `locales/en.json`, `locales/zh-TW.json` |

Routes live in `src/App.tsx`. Pages are `HomePage`, `EditorPage`, `ViewerPage`, `PrivacyPage`, `TermsPage` — if you find docs referencing `LandingPage`/`EditPage`/`ViewPage`, they are stale.

---

## Firestore collections

| Path | Access |
|---|---|
| `users/{uid}/userState/{docId}` | Owner read/write; write gated at **≤ 3 profiles** unless in `users_pro` or `admins` |
| `users_pro/{uid}` | Owner read only (Pro flag) |
| `admins/{uid}` | Owner read only (admin flag; doc ID *is* the UID) |
| `sharedResumes/{id}` | Authenticated create, `get: if true`, no update/delete — snapshot links |
| `liveResumes/{id}` | Authenticated create, `get: if true`, update gated by `ownerUid` — live links |

A global `match /{document=**} { allow read, write: if false }` denies everything not listed. `allow get: if true` on the two share collections is **intentional** (anyone with the link can read), not a vulnerability.

---

## Iron rules

1. **`server.ts` ↔ `api/` sync.** `server.ts` imports `api/parse-resume.ts` directly, so handler logic can't drift — but the surrounding config can and does: `server.ts` sets `express.json({ limit: "50mb" })` while `api/parse-resume.ts` caps at `4mb` (Vercel's hard limit is 4.5MB). When you change either side, check the other for limits, CORS, and env-var handling.
2. **Stop after 3 consecutive failures.** If a test, typecheck, or build command fails three times in a row, halt, report a summary, and name the assumption you now doubt. Do not keep guessing.
3. **Never delete, skip, or weaken a test to make the suite pass.** Fix the code. If you think a test is wrong, stop and explain why; change it only after the user agrees, in its own commit. When you fix a bug, add a regression test that fails before the fix — the runner is the source of truth.
4. **Use the uncontrolled debounced-input pattern in editors.** Controlled `value`/`onChange` on every keystroke breaks Mac Zhuyin/IME composition and causes lag. `useDebouncedInput` (exported from `src/components/editor/InfoEditor.tsx`) returns props to spread onto an *uncontrolled* input:

```tsx
// Signature: useDebouncedInput(initialValue, onSave, delay = 1000)
// Returns: { ref, defaultValue, onChange, onBlur, localValue }
const nameInput = useDebouncedInput(data.profile.name, (val) => updateProfile('name', val));

// DO NOT: controlled input — interrupts IME composition
<input value={name} onChange={(e) => setName(e.target.value)} />

// DO: uncontrolled + debounced save
<input
  ref={nameInput.ref as any}
  defaultValue={nameInput.defaultValue}
  onChange={nameInput.onChange}
  onBlur={nameInput.onBlur}
/>
```

It syncs external changes only while the field is unfocused, and flushes on blur and unmount. Read `nameInput.localValue` for live derived UI (e.g. character counts).

---

## i18n workflow

Every user-facing string goes through i18next — no hardcoded copy in components.

1. Add the key to **both** `src/i18n/locales/en.json` and `src/i18n/locales/zh-TW.json`. A key present in only one locale is a bug: `en` is the `fallbackLng`, so a missing `zh-TW` key silently renders English.
2. Read it via `const { t } = useTranslation()` then `t('editor.info.summaryPlaceholder')`.
3. Keep the two files structurally identical; supported languages are `en` and `zh-TW` only.

---

## Definition of done

- [ ] Bug fixes and features: failing test written and committed first (red), then the fix (green). Changes that alter no behavior (docs, comments, renames) need no new test
- [ ] `npm run test` passes
- [ ] `npm run check` passes
- [ ] `npm run build` passes for build-affecting changes
- [ ] New user-facing strings exist in both locale files
- [ ] New gotchas appended to `.agents/LESSONS.md`

## Known traps

- The rules suite (`tests/firestore.rules.test.ts`) runs only under `npm run test:rules` (Firestore emulator, needs Java); plain `npm test` skips it. `test:rules` fails if any rules test is skipped (`scripts/check-rules-report.mjs`) — never hard-skip it again.
- The per-user daily AI-import quota (`user_limits`) was removed; only a per-IP Upstash limit of **5 requests/hour** on `/api/parse-resume` remains. Stale comments in `src/components/ImportResumeModal.tsx` still describe the old quota.
- `DesktopEditLayout.tsx` and `MobileEditLayout.tsx` are deliberately duplicated for now — don't "fix" it by merging them unprompted.
