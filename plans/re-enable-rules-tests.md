# Plan: re-enable the Firestore rules tests

Track: **Bug fix** (Gates 1–3). Bug: the 22 tests in `tests/firestore.rules.test.ts` have not run anywhere — locally or in CI — since 2026-07-16, yet `npm run test:rules` and CI report success.

## Causes

1. `2bbcf2c` (2026-07-16) wrapped the suite in a hardcoded `describe.skip` to avoid a missing local Java runtime. It skips in CI too. (Same thing happened on 2026-06-14; the suite only ran in CI 07-13 → 07-16.)
2. Nothing fails when the whole suite is skipped: Vitest exits 0, and Vitest 1.6.1's JSON reporter even counts skipped tests as **passed** in its summary (`numPassedTests: 22, numPendingTests: 0` for a fully skipped run). Only the per-test `status: "skipped"` tells the truth.
3. While skipped, the suite went stale (`user_limits` was removed on 2026-07-20; `firestore.rules` changed on 2026-07-25).

## Design sketch

- **Guard** — `scripts/check-rules-report.mjs`
  - `findRulesSuiteProblems(report)`: takes a Vitest JSON report, walks every `testResults[].assertionResults[]`, returns a list of problem strings:
    - no tests at all → problem ("no rules tests ran")
    - any test with status `skipped`, `pending` or `todo` → problem ("N of M rules tests did not run")
    - otherwise → `[]`
  - CLI: `node scripts/check-rules-report.mjs <report.json>` prints each problem and exits 1 if there is any, else exits 0.
- **Wiring** — `test:rules` writes a JSON report to `test-results/rules.json` (gitignored) and then runs the checker. Vitest failures still fail the script first.
- **Skip only when there is no emulator** — `describe.skip(...)` → `describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)(...)`. `firebase emulators:exec` sets that variable, so the suite runs in `test:rules` and stays skipped in plain `npm test` (local and CI step 1).
- **Edge cases** — a report with zero test files; `todo` tests; one skipped test inside an otherwise passing suite (must still fail).
- **Out of scope** — changing what `firestore.rules` allows (a test that exposes a real rules bug is reported, not silently fixed), adding new rules tests, installing Java locally.

## Decisions

- **Verification goes through CI** (Temurin 21 + emulator), because this machine has no Java runtime and installing one is the owner's call. Each CI-only check is pushed to the PR branch.
- **Stale tests** (expected: `user_limits` owner read; setups that write `users/{uid}` while the rules read `users/{uid}/userState/state`) are **not changed without the owner's agreement**, per the workflow rule for tests that look wrong. They are listed in the PR instead.

## Tests

| Behavior | Test file |
|---|---|
| Checker accepts a report where every rules test ran | `tests/check-rules-report.test.ts` |
| Checker flags skipped / todo rules tests | `tests/check-rules-report.test.ts` |
| Checker flags a report with no rules tests | `tests/check-rules-report.test.ts` |
| CLI exits 1 and prints the problem; exits 0 for a clean report | `tests/check-rules-report.test.ts` |
| `test:rules` fails while the suite is hard-skipped (reproduces the bug) | CI step "Run Emulator Rules Tests" |
| Rules suite runs under the emulator | CI step "Run Emulator Rules Tests" |

## Checklist

- [ ] Checker accepts a fully-run report -> verify: `npx vitest run tests/check-rules-report.test.ts`
- [ ] Checker flags skipped/todo tests -> verify: `npx vitest run tests/check-rules-report.test.ts`
- [ ] Checker flags a report with no tests -> verify: `npx vitest run tests/check-rules-report.test.ts`
- [ ] CLI exit codes and message -> verify: `npx vitest run tests/check-rules-report.test.ts`
- [ ] `test:rules` fails on the hard-skipped suite -> verify: CI log, step "Run Emulator Rules Tests"
- [ ] Suite runs under the emulator, skipped without it -> verify: CI log (rules tests passed/failed, not skipped) and `npm test` locally
- [ ] Full suite green -> verify: `npm test && npm run check && npm run build` in a clean worktree, plus the PR's CI
