# Plan: daily AI-import quota per account + honest homepage / import copy

Track: **Everything else** (Gates 1–3). Branch `feat/daily-ai-quota-and-honest-copy`, off `main` (00104d8).

## Decisions (owner, 2026-10-18)

| # | Decision |
|---|---|
| A1 | Remove the whole pricing section and the "Pricing" nav links |
| Q4 b | Rewrite the "AI Job-Hunting Sidekick" feature card as the AI import that exists today |
| C1 | Import modal copy matches the code: PDF / JPG / PNG, max 3MB |
| D1 | Drop the "ATS-optimized" claim; describe what the PDF visibly is |
| Q1 b | AI parsing is limited **per account (uid)**, not per IP |
| Q3 a | Only admins (`admins/{uid}` exists) are exempt |
| Q5 | A 24-hour window **starts at the first import**; when it ends, the count is back to 5 even if not used up |
| Q6 b | The import modal asks the server for the quota when it opens; once a window has started it shows the remaining count and a countdown |

## What exists today (verified on `main`)

- `api/parse-resume.ts` checks `checkRateLimit(ip)` **before** login: Upstash `slidingWindow(5, '1 h')` per IP. Its `reset` is the end of a UTC-aligned bucket, not when a slot frees, so it cannot drive a countdown.
- A 429 shows raw English in the modal ("Too many requests from this IP…"): the server's message has no "429" in it, so the `includes('429')` check never matches.
- Homepage renders `home.pricing.free/pro.*` (auto-apply quotas, Pro $5/mo, "coming soon"); `home.pricing.freeFeature*/proFeature*/proPrice` (104 bot, $9, "5 per day") are defined but rendered nowhere.
- Import modal renders "Supports PDF, DOCX (Max 5MB)" and "Upload an existing PDF or DOCX…"; the code accepts `application/pdf`, `image/jpeg`, `image/png` up to `3 * 1024 * 1024`.

## Design sketch

### Quota module — `src/utils/aiQuota.ts` (new)

```ts
export const AI_IMPORT_LIMIT = 5;
export const AI_IMPORT_WINDOW_MS = 24 * 60 * 60 * 1000;

// The few Redis commands the quota needs (@upstash/redis satisfies it; tests pass an in-memory fake).
export interface QuotaStore {
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  get(key: string): Promise<number | string | null>;
  pttl(key: string): Promise<number>;          // -2 no key, -1 no expiry
  pexpire(key: string, ms: number): Promise<number>;
}

export interface QuotaState { remaining: number; limit: number; resetAt: number | null } // resetAt: ms epoch, null = no window running
export function createAiQuota(store: QuotaStore | null, now?: () => number): {
  consume(uid: string): Promise<QuotaState & { allowed: boolean }>;
  status(uid: string): Promise<QuotaState>;
};
export const aiQuota; // built from UPSTASH_REDIS_REST_URL / _TOKEN, null store when unset
```

- Key `presencecv:ai-import:<uid>` holds the count.
- `consume`: `INCR`. If the key has no expiry (`PTTL < 0`: this is the first import, or a crash left it without one) set `PEXPIRE 24h` — **the window starts at the first import**. If the count is now over 5, `DECR` it back (a rejected request does not count) and return `allowed: false`. `resetAt = now + PTTL`.
- `status`: no key → `{ remaining: 5, resetAt: null }`; otherwise `remaining = 5 − count`, `resetAt = now + PTTL`.
- When the window expires Redis deletes the key, so the next status is 5 / no countdown — nothing to reset by hand.
- Concurrency: two imports at count 4 → `INCR` gives 5 and 6; the 6 is rolled back and rejected. No over-use.
- No Upstash configured: development → always allowed, `{ remaining: 5, resetAt: null }`; production → fail closed (`allowed: false`, `resetAt: null`), same policy as today.
- Every accepted request counts, even if Gemini then fails (same as today).

### `api/parse-resume.ts` (POST)

New order: method check → verify ID token (get `uid`) → admin check (`adminDb.collection('admins').doc(uid).get()`, `.exists`) → if not admin `aiQuota.consume(uid)`; rejected → **429** `{ error: 'AI_IMPORT_LIMIT', remaining: 0, resetAt }` → Gemini as before. The per-IP check is removed (unauthenticated requests are already rejected at the token check, before any count).

### `api/ai-quota.ts` (new GET endpoint) + `server.ts`

`GET /api/ai-quota` with `Authorization: Bearer <idToken>` → `{ unlimited: true }` for admins, else `{ limit, remaining, resetAt }`. 401 without a valid token, 405 for other methods. Same CORS headers as `parse-resume`. `server.ts` gets the matching `app.get('/api/ai-quota', …)` route (Iron rule 1). A separate file keeps `parse-resume` POST-only (its existing 405 test stays valid).

### Import modal — `src/components/ImportResumeModal.tsx`

- On open (signed in): fetch `/api/ai-quota`. If it fails, show nothing and allow upload (the server still enforces).
- Admin (`unlimited`) or no window yet (`resetAt: null`): show nothing.
- Window running, `remaining > 0`: "AI 匯入剩 {{remaining}} 次，{{time}} 後補滿 5 次" / "{{remaining}} AI imports left, back to 5 in {{time}}".
- `remaining === 0`: "AI 匯入次數已用完，{{time}} 後補滿 5 次" / "No AI imports left, back to 5 in {{time}}"; the upload area is disabled.
- `{{time}}` is `HH:MM:SS`, ticking each second. At 0 the modal shows nothing again and upload is enabled.
- A 429 from `parse-resume` sets the same state from its `resetAt` (replaces the raw English error).
- A successful import closes the modal (as today); the next open shows the new count and countdown.

### Copy (en + zh-TW)

| Key | Before (zh-TW) | After (zh-TW) | After (en) |
|---|---|---|---|
| `importModal.supportedFormats` | 支援 PDF、DOCX 格式 (最大 5MB) | 支援 PDF、JPG、PNG (最大 3MB) | Supports PDF, JPG, PNG (Max 3MB) |
| `importModal.subtitle` | 上傳現有的 PDF 或 DOCX 檔案… | 上傳現有的 PDF 或圖片檔，透過 AI 自動解析並填入您的履歷資料。 | Upload an existing PDF or image to automatically populate your profile using AI. |
| `home.features.pdfTitle` | ATS 最佳化 PDF | 乾淨俐落的 PDF | Clean, Simple PDF |
| `home.features.pdfDesc` | …更確保 ATS 系統能完美解析。 | 捨棄令人眼花撩亂的複雜排版。單一、乾淨的版型，文字可選取、可複製，招募人員一目了然。 | Skip the overly-decorated layouts. One clean format with selectable, copyable text that recruiters can read at a glance. |
| `home.features.aiJobHuntingTitle` → `aiImportTitle` | AI 求職得力助手 | AI 匯入履歷 | AI Resume Import |
| `home.features.aiJobHuntingDesc` → `aiImportDesc` | …全自動化幫您投遞… | 上傳現有的 PDF 或圖片，AI 自動整理成可編輯的履歷。每個帳號 24 小時內可匯入 5 次。 | Upload an existing PDF or image and AI turns it into an editable resume. 5 imports per account every 24 hours. |

- The AI card loses its "Coming soon" badge; icon `Bot` → `FileUp`.
- Removed keys: all of `home.pricing.*`, `home.nav.pricing`, `importModal.dailyLimitExceeded` (unused, said "try tomorrow"), `importModal.errors.rateLimit` (replaced by the quota messages).
- New keys: `importModal.quota.remaining`, `importModal.quota.exhausted`.

### Docs
`CLAUDE.md` Known traps (per-IP 5/hour → per-account 5 per 24 h from first import, admins exempt), `README.md` rate-limit lines, the stale header comments in `ImportResumeModal.tsx` and `HomePage.tsx`.

### Edge cases
Window expiry mid-countdown (modal resets to "nothing shown"); clock skew between server and browser (countdown uses the server's `resetAt`; a few seconds off is acceptable, the server is the authority); admin doc read fails → treat as not admin (counts); quota fetch fails → no display, server still enforces.

### Out of scope
Pro users (`users_pro`) stay limited (Q3 a). No quota display before the first import. `RateLimiter` class in `src/utils/rateLimiter.ts` is pre-existing dead code (only tests use it) — reported, not removed. Upstash env vars on Vercel are assumed set as today (cannot be checked from here).

### Existing tests this changes (approving the plan = agreeing; each in its own commit)
- `tests/api.parse-resume.test.ts`:
  - "returns 429 if IP rate limit exceeded" encodes the per-IP rule being replaced → rewritten for the per-account quota.
  - The shared `adminDb` mock gains `get()`, because the handler now reads `admins/{uid}`.
- `checkRateLimit` becomes unused once the API stops calling it, so it is removed together with its test in `tests/rateLimiter.test.ts` ("returns allowed when Upstash is not configured").

### Merge conflicts to expect
Open PRs #11 (HomePage nav, ImportResumeModal dialog, locales), #12 (`tests/api.parse-resume.test.ts` mocks), #13 and #14 touch the same files. Merging them first means this branch must take `main` in later — a `git merge`, which needs your go-ahead at that point.

## Tests

| Behavior | Test file |
|---|---|
| Quota: first import starts a 24 h window, 4 left, `resetAt` = first import + 24 h | `tests/aiQuota.test.ts` |
| Quota: the 6th import in a window is rejected and not counted | `tests/aiQuota.test.ts` |
| Quota: after the window, back to 5 with no countdown | `tests/aiQuota.test.ts` |
| Quota: no Upstash — allowed in development, rejected in production | `tests/aiQuota.test.ts` |
| parse-resume counts per account, after login (no count for a bad token) | `tests/api.parse-resume.test.ts` |
| parse-resume: admins are not counted | `tests/api.parse-resume.test.ts` |
| parse-resume: over the quota → 429 with `remaining: 0` and `resetAt` | `tests/api.parse-resume.test.ts` |
| ai-quota endpoint: 401 / 405 / admin unlimited / user status | `tests/api.ai-quota.test.ts` |
| Modal: shows nothing before the first import or for admins | `tests/ImportResumeModal.quota.test.tsx` |
| Modal: shows the remaining count and a ticking countdown | `tests/ImportResumeModal.quota.test.tsx` |
| Modal: used up → upload disabled; at 0 → enabled, message gone | `tests/ImportResumeModal.quota.test.tsx` |
| Modal: a 429 shows the countdown, not raw English | `tests/ImportResumeModal.quota.test.tsx` |
| Modal: supported formats text matches what it accepts (PDF/JPG/PNG, 3MB) | `tests/ImportResumeModal.quota.test.tsx` |
| Homepage: no pricing section or pricing link | `tests/HomePage.content.test.tsx` |
| Homepage: no ATS / auto-apply claims; the AI import card is shown | `tests/HomePage.content.test.tsx` |

## Checklist

- [ ] quota: first import starts a 24 h window -> verify: `npx vitest run tests/aiQuota.test.ts`
- [ ] quota: 6th import rejected, not counted -> verify: `npx vitest run tests/aiQuota.test.ts`
- [ ] quota: back to 5 after the window -> verify: `npx vitest run tests/aiQuota.test.ts`
- [ ] quota: no Upstash — dev allowed, production rejected -> verify: `npx vitest run tests/aiQuota.test.ts`
- [ ] test update (own commit): parse-resume tests mock the quota module and `admins/{uid}`; the per-IP 429 test is replaced -> verify: `npx vitest run tests/api.parse-resume.test.ts`
- [ ] parse-resume counts per account after login -> verify: `npx vitest run tests/api.parse-resume.test.ts`
- [ ] parse-resume skips the count for admins -> verify: `npx vitest run tests/api.parse-resume.test.ts`
- [ ] parse-resume 429 carries `remaining` / `resetAt` -> verify: `npx vitest run tests/api.parse-resume.test.ts`
- [ ] remove `checkRateLimit` and its test (own commit) -> verify: `npx vitest run tests/rateLimiter.test.ts`
- [ ] ai-quota endpoint (401, 405, admin, user) + `server.ts` route -> verify: `npx vitest run tests/api.ai-quota.test.ts`
- [ ] modal shows nothing before first import / for admins -> verify: `npx vitest run tests/ImportResumeModal.quota.test.tsx`
- [ ] modal shows remaining + countdown -> verify: `npx vitest run tests/ImportResumeModal.quota.test.tsx`
- [ ] modal used up → disabled; at 0 → enabled -> verify: `npx vitest run tests/ImportResumeModal.quota.test.tsx`
- [ ] modal 429 → countdown, not raw English -> verify: `npx vitest run tests/ImportResumeModal.quota.test.tsx`
- [ ] modal format text = PDF/JPG/PNG, 3MB -> verify: `npx vitest run tests/ImportResumeModal.quota.test.tsx`
- [ ] homepage has no pricing section or link -> verify: `npx vitest run tests/HomePage.content.test.tsx`
- [ ] homepage: no ATS / auto-apply claims, AI import card shown -> verify: `npx vitest run tests/HomePage.content.test.tsx`
- [ ] docs: CLAUDE.md, README, stale comments -> verify: `git grep -n -i -E "per-IP|5 requests/hour|DOCX|5MB" -- CLAUDE.md README.md src`
- [ ] full suite -> verify: `npm test && npm run check && npm run build`
- [ ] real browser: modal countdown + homepage (harness from `.agents/LESSONS.md`) -> verify: screenshots / observed text recorded here
