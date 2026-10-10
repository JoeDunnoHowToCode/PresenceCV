# Plan: let owners revoke shared links

Track: **Everything else** (Gates 1–3). Scan finding: share links can never be taken down. `sharedResumes` and `liveResumes` both have `allow delete: if false`, snapshots don't record who made them, and there is no UI to see or remove links. A leaked link to a résumé (name, email, phone, photo) stays public forever. Also, a new snapshot document is created every time the share modal opens with changed content.

## Decisions (made without the owner, who asked not to be interrupted; reviewable in the PR)

| Question | Chosen | Alternative not taken |
|---|---|---|
| How to know who owns a snapshot | **Private ownership record** `users/{uid}/sharedLinks/{snapshotId}`, writable only in the same batch that creates the snapshot | Put `ownerUid` on the public snapshot: simpler rules, but publishes the owner's UID on every snapshot (the scan already flagged that on live links) |
| How to revoke | **Delete** the public document | Overwrite with an empty "revoked" body: no rules change for live links, but the document lingers and snapshots still need ownership |
| Old snapshots (made before this change) | Not listed and not revocable (no ownership record exists) | Backfilling ownership is impossible: nothing links an old snapshot to its author |

## Design sketch

- **Rules** (`firestore.rules`):
  - `users/{uid}/sharedLinks/{id}`: owner can read and delete. Create only if `!exists(sharedResumes/{id}) && existsAfter(sharedResumes/{id})` — the snapshot must be created in the same batch, so nobody can claim a snapshot they only know the ID of. Fields: `createdAt`, `profileName`.
  - `sharedResumes/{id}`: `allow delete` if `exists(users/{auth.uid}/sharedLinks/{id})`. Create, get, list, update unchanged.
  - `liveResumes/{id}`: `allow delete` if `resource.data.ownerUid == request.auth.uid`.
- **Creating a snapshot** (`EditorPage.openShareModal`): one `writeBatch` sets `sharedResumes/{newId}` and `users/{uid}/sharedLinks/{newId}` (`createdAt`, `profileName`) instead of `addDoc`.
- **`useSharedLinks(uid)`** (`src/hooks/useSharedLinks.ts`): live list of the user's ownership records, newest first; `revokeSnapshot(id)` deletes the snapshot and its record in one batch.
- **Stopping the live link** (`EditorPage.revokeLiveLink`): clears `liveId`/`updateToken` from the profile first (which cancels the pending 2 s auto-sync), then deletes `liveResumes/{liveId}`. Opening Share again creates a new live link with a new URL.
- **UI** (`SharedLinksManager`, rendered once in each share modal — the two layouts stay duplicated as before): a "Stop sharing" button for the live link and a list of snapshot links (date, profile name, revoke button). Results go through `useNotice()`. Strings in en + zh-TW.
- **Edge cases**: revoking while offline (notice, list unchanged); an auto-sync write already in flight when the live link is stopped could recreate the document — the window is the 2 s debounce and Share is not used while typing, so it's documented, not handled; old snapshots stay public until the owner deletes them another way.
- **Out of scope**: an expiry date per link, view counts, a dedicated "My links" page, deleting snapshots made before this change.

## Tests

| Behavior | Test file |
|---|---|
| Owner can delete their live link; others can't | `tests/firestore.rules.test.ts` (CI, emulator) |
| Snapshot + ownership record in one batch is allowed | `tests/firestore.rules.test.ts` |
| Claiming ownership of an existing snapshot is denied | `tests/firestore.rules.test.ts` |
| Owner can delete their snapshot; others can't | `tests/firestore.rules.test.ts` |
| `useSharedLinks` lists the user's snapshot links newest first | `tests/useSharedLinks.test.ts` |
| `revokeSnapshot` deletes the snapshot and its record in one batch | `tests/useSharedLinks.test.ts` |
| Opening Share writes the snapshot and its ownership record in one batch | `tests/EditorPage.share.test.tsx` |
| Stopping the live link deletes it and clears `liveId`/`updateToken` | `tests/EditorPage.share.test.tsx` |
| A failed delete puts the live link back so the owner can retry | `tests/EditorPage.share.test.tsx` |
| The manager lists snapshot links and revokes the one clicked | `tests/SharedLinksManager.test.tsx` |
| The manager stops the live link when asked | `tests/SharedLinksManager.test.tsx` |

## Checklist

- [x] rules: live link delete (owner only) -> verify: PR CI, "Run Emulator Rules Tests"
  ```
  red (CI 38035526323, before the rules change): Tests  3 failed | 22 passed (25)
    FAIL … lets the owner delete their live link
    FAIL … allows creating a snapshot together with its ownership record
    FAIL … lets the owner delete their snapshot and its ownership record
  guards passing already: someone else's live link, claiming an existing snapshot, deleting without a record
  green (CI 38036009949, after c5fd51c): Tests  25 passed (25)
  ```
- [x] rules: snapshot + ownership in one batch -> verify: PR CI
  ```
  red/green: same runs as above
  ```
- [x] rules: no claiming existing snapshots -> verify: PR CI
  ```
  guard: passed before and must keep passing after the rules change
  ```
- [x] rules: snapshot delete (owner only) -> verify: PR CI
  ```
  red/green: same runs as above
  ```
- [x] useSharedLinks lists newest first -> verify: `npx vitest run tests/useSharedLinks.test.ts`
  ```
  red:   TypeError: useSharedLinks is not a function   (red commit blocked by typecheck; staged, test unchanged)
  green: Tests  1 passed (1)
  ```
- [x] revokeSnapshot batch-deletes both docs -> verify: `npx vitest run tests/useSharedLinks.test.ts`
  ```
  red:   TypeError: result.current.revokeSnapshot is not a function   (staged, test unchanged)
  green: Tests  2 passed (2)
  ```
- [x] Share writes snapshot + ownership in one batch -> verify: `npx vitest run tests/EditorPage.share.test.tsx`
  ```
  red:   AssertionError: expected "spy" to be called 1 times, but got 0 times
  green: Tests  1 passed (1)
  ```
- [x] stopping the live link -> verify: `npx vitest run tests/EditorPage.share.test.tsx`
  ```
  red:   Unable to find role="button" and name "Stop sharing the live link"
  green: Tests  2 passed (2)
  edge (failed delete puts the link back): red "expected spy to be called 2 times, but got 1 times" -> green Tests  3 passed (3)
  ```
- [x] manager lists and revokes snapshots -> verify: `npx vitest run tests/SharedLinksManager.test.tsx`
  ```
  red:   Element type is invalid … got: undefined   (staged, test unchanged)
  green: Tests  1 passed
  ```
- [x] manager stops the live link -> verify: `npx vitest run tests/SharedLinksManager.test.tsx`
  ```
  red:   Unable to find an accessible element with the role "button" and name "Stop sharing the live link"
  green: Tests  2 passed
  ```
- [x] full suite -> verify: `npm test && npm run check && npm run build`, plus PR CI
  ```
  local:  Test Files  22 passed | 1 skipped (23) / Tests  112 passed | 25 skipped (137)
          ✖ 91 problems (0 errors, 91 warnings) / ✓ built in 5.37s
  CI 38036009949 (0b4fbb8, rules changed): ✓ tests/firestore.rules.test.ts (25 tests) / Tests  25 passed (25)
          Script exited successfully (code 0); unit, lint, build: success
  ```
