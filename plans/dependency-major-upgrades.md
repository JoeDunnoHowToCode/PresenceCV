# Plan: the two remaining major dependency upgrades

Track: **Refactor-style maintenance** (Gates 1 and 3, no Gate 2). Behavior must not change: the full suite is pasted before the first step and after the last. The only test edit is the one the owner agreed to on 2026-10-10 (step 1). Follows #7, which left these two as owner decisions; the owner asked for both ("把這些都做完").

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

- [ ] Baseline recorded -> verify: `npm test && npm run check && npm run build`
- [ ] vitest 4.1.11 + agreed mock change -> verify: `npm test && npm run check && npm run build`
- [ ] firebase-admin 14 + Node 22 -> verify: `npm test && npm run check && npm run build` and the smoke check
- [ ] Rules suite still runs and is checked on Vitest 4 -> verify: PR CI, step "Run Emulator Rules Tests"
- [ ] Advisories after -> verify: `npm audit` and `npm audit --omit=dev`
