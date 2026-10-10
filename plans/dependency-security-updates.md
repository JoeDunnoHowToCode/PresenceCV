# Plan: dependency security updates

Track: **Refactor-style maintenance** (Gates 1 and 3, no Gate 2). Observable behavior must not change: the full suite is pasted before the first step and after the last, each step is verified with the full suite, and no existing test is edited. If a step needs a test edit, the step is dropped and reported instead.

## Starting point (2026-10-09, `dc0abd4`)

`npm audit`: 62 vulnerabilities (5 critical, 30 high, 25 moderate, 2 low). 47 have non-breaking fixes. The rest need a semver-major bump of one of three direct dependencies.

## Design sketch

| Step | Change | Why this version | Risk / how it's checked |
|---|---|---|---|
| 1 | `npm audit fix` (no `--force`) | Non-breaking ranges only; covers the prod criticals `proxy-addr`, `websocket-driver` and highs like `react-router-dom`, `dompurify` | Full suite + build |
| 2 | `vitest` ^1.6 → ^4.1.11 (dev only) | 4.1.11 fixes the critical Vitest UI advisory (`<3.2.6`) and the tinypool RCE gadgets, and still supports Node 20 (CI runs Node 20). npm suggests 5.0.3, but 5.x needs Node ^22.12 | Full suite unchanged without editing tests; JSON report still readable by `scripts/`-style consumers |
| 3 | `overrides.postcss-selector-parser` → ^7.1.6 | `@tailwindcss/typography@0.5.20` (latest) pins 6.0.10; every 6.x is in the advisory range (`<7.1.6`). npm's suggested "fix" is a *downgrade* to typography 0.5.4 (2022), rejected | Build-time only. Built CSS must be byte-identical before/after |
| 4 | `firebase-admin` ^12 → ^14 | Only 14.x drops `node-forge` (every `node-forge` version is in its advisory range) | **Blocked**: needs Node ≥22. CI's `test.yml` uses Node 20 (changing workflows needs the owner's permission) and the Vercel runtime version is a project setting not visible from the repo |

Edge cases: lockfile-only changes must not alter runtime code paths; `legacy-peer-deps=true` in `.npmrc` can hide peer conflicts, so peers are checked with `npm ls` after each step.

Out of scope: `firebase-admin` 14 (step 4, reported), Node version changes in CI or Vercel, unrelated dependency bumps.

## Checklist

- [x] Baseline full suite recorded -> verify: `npm test && npm run check && npm run build`
  ```
  Test Files  14 passed | 1 skipped (15)
       Tests  87 passed | 22 skipped (109)
  ✖ 91 problems (0 errors, 91 warnings)
  ✓ built in 4.67s
  ```
- [x] Step 1 non-breaking fixes -> verify: `npm audit fix` then `npm test && npm run check && npm run build`
  ```
  added 5 packages, removed 15 packages, changed 91 packages
  30 vulnerabilities (14 moderate, 14 high, 2 critical)
  Test Files  14 passed | 1 skipped (15)
       Tests  87 passed | 22 skipped (109)
  ✖ 91 problems (0 errors, 91 warnings)
  ✓ built in 4.67s
  ```
- [ ] ~~Step 2 vitest 4.1.11~~ **dropped** — needs a test edit -> verify: `npm test`
  ```
  FAIL  tests/api.parse-resume.test.ts > API Route: /api/parse-resume > returns 200 on successful parse
  Vercel Secure API Parse Error: TypeError: () => ({ ... is not a constructor
       Tests  1 failed | 86 passed | 22 skipped (109)
  ```
  Vitest 3+ refuses `new` on a `vi.fn()` whose implementation is an arrow function; the test mocks `GoogleGenAI` that way and `api/parse-resume.ts` calls `new GoogleGenAI(...)`. Fix needs the owner's agreement: `mockImplementation(function () { return { models: … } })`. Reverted to vitest 1.6.1.
- [x] Step 3 postcss-selector-parser override -> verify: `npm run build` and `cmp` of the built CSS against the step-1 build
  ```
  `-- postcss-selector-parser@7.1.6 overridden
  before: index-D0xY6qRQ.css    87514 bytes
  after:  index-D0xY6qRQ.css    87514 bytes
  CSS byte-identical ✓
  Test Files  14 passed | 1 skipped (15)
       Tests  87 passed | 22 skipped (109)
  ```
- [x] Remaining advisories explained -> verify: `npm audit` summary in the PR
  ```
  all:  {"moderate":12,"high":14,"critical":2,"total":28}   (was 62: 5 critical, 30 high)
  prod: {"moderate":8,"high":6,"critical":0,"total":14}    (was 30: 2 critical, 13 high)
  ```
