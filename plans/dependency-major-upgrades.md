# Plan: the two remaining major dependency upgrades

Track: **Refactor-style maintenance** (Gates 1 and 3, no Gate 2). Behavior must not change: the full suite is pasted before the first step and after the last. Test edits: the owner-agreed `GoogleGenAI` mock change, extended to the two identical `GoogleAuthProvider` mocks in `tests/App.test.tsx` and `tests/AuthContext.test.tsx` (same cause, found on the first Vitest 4 run); plus one new test that pins `src/lib/firebase-admin.ts` with the real SDK before upgrading it (the refactor rule for untested code). Follows #7, which left these two as owner decisions; the owner asked for both ("把這些都做完").

## Starting point (`00104d8`)

`npm audit`: 28 (2 critical, 14 high, 12 moderate); production deps 14 (0 critical, 6 high). Full suite: 105 passed / 19 skipped, check 0 errors, build OK.

## Design sketch

| Step | Change | Why | Risk / check |
|---|---|---|---|
| 1 | `vitest` ^1.6 → 4.1.11 (dev) | Fixes the 2 remaining criticals (Vitest UI `<3.2.6`, tinypool RCE gadgets) and vite/esbuild advisories in the test toolchain. 4.1.11 still supports Node 20. | Vitest 3+ refuses `new` on a `vi.fn()` whose implementation is an arrow function; `tests/api.parse-resume.test.ts` mocks `GoogleGenAI` that way → change it to a `function` (owner-agreed), in its own commit. The rules suite only runs in CI, so CI must confirm `test:rules` (JSON report + `check-rules-report`) still works on Vitest 4. |
| 2 | `firebase-admin` ^12 → ^14 (prod, server only) | Only 14.x drops `node-forge` (every version in its advisory range) and the vulnerable `@google-cloud/*`/`uuid` chain. | Needs **Node ≥ 22**: CI `test.yml` moves from Node 20 to 22 (workflow change, owner-approved via the plan), and `package.json` gets `"engines": { "node": "22.x" }` so Vercel's serverless functions run on 22. Tests mock `src/lib/firebase-admin`, so a smoke check imports the real v14 modular API (`initializeApp`, `getApps`, `cert`, `applicationDefault`, `getAuth`, `getFirestore`) and builds an app from a generated key. |

Edge cases: `.npmrc` has `legacy-peer-deps=true`, so peers are checked with `npm ls` after each step; the lockfile must install cleanly with `npm ci` on Node 22.

Out of scope: `firebase` 12 → 9 and `firebase-tools` downgrades that npm suggests (rejected in #7), `qs` via `express` 4 (dev server only), `@grpc/grpc-js` server-side advisories.

## Checklist

- [x] Baseline recorded -> verify: `npm test && npm run check && npm run build`
  ```
   Test Files  19 passed | 1 skipped (20)
        Tests  105 passed | 19 skipped (124)
  ✖ 91 problems (0 errors, 91 warnings)
  ✓ built in 4.81s
  ```
- [x] vitest 4.1.11 + agreed mock change -> verify: `npm test && npm run check && npm run build`
  ```
  first Vitest 4 run: 4 failed (App + 3 AuthContext cases: arrow-function GoogleAuthProvider mock called with new)
  after the mock changes (made and verified on 1.6 first):
   Test Files  19 passed | 1 skipped (20)
        Tests  105 passed | 19 skipped (124)
  ✖ 91 problems (0 errors, 91 warnings)
  ✓ built in 5.01s
  local test:rules pieces: report written; check-rules-report: 19 of 19 rules tests did not run (expected without the emulator)
  ```
- [x] firebase-admin 14 + Node 22 -> verify: `npm test && npm run check && npm run build` and the smoke check
  ```
  pin test (real SDK): 1 passed on 12.7.0 and on 14.5.0
   Test Files  20 passed | 1 skipped (21)
        Tests  106 passed | 19 skipped (125)
  ✖ 91 problems (0 errors, 91 warnings)
  ✓ built in 5.37s
  ```
- [x] Rules suite still runs and is checked on Vitest 4 -> verify: PR CI, step "Run Emulator Rules Tests"
  ```
  CI 38035332686 (c5970a3, Node 22 per the setup-node log):
  Run Unit Tests:            Tests  106 passed | 19 skipped (125)
  Run Emulator Rules Tests:  ✓ tests/firestore.rules.test.ts (19 tests) / Tests  19 passed (19)
                             Script exited successfully (code 0)   <- check-rules-report found nothing skipped
  ```
- [x] Advisories after -> verify: `npm audit` and `npm audit --omit=dev`
  ```
  all:  {"low":1,"moderate":5,"high":11,"critical":0,"total":17}   (was 28, 2 critical)
  prod: {"moderate":1,"high":4,"critical":0,"total":5}            (was 14)
  prod left: @firebase/firestore, @firebase/firestore-compat, @grpc/grpc-js, firebase (grpc-js pinned by firebase 12; server-side advisories), qs (express dev server)
  ```
