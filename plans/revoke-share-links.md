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
| The manager lists snapshot links and revokes the one clicked | `tests/SharedLinksManager.test.tsx` |
| The manager stops the live link when asked | `tests/SharedLinksManager.test.tsx` |

## Checklist

- [ ] rules: live link delete (owner only) -> verify: PR CI, "Run Emulator Rules Tests"
- [ ] rules: snapshot + ownership in one batch -> verify: PR CI
- [ ] rules: no claiming existing snapshots -> verify: PR CI
- [ ] rules: snapshot delete (owner only) -> verify: PR CI
- [ ] useSharedLinks lists newest first -> verify: `npx vitest run tests/useSharedLinks.test.ts`
- [ ] revokeSnapshot batch-deletes both docs -> verify: `npx vitest run tests/useSharedLinks.test.ts`
- [ ] Share writes snapshot + ownership in one batch -> verify: `npx vitest run tests/EditorPage.share.test.tsx`
- [ ] stopping the live link -> verify: `npx vitest run tests/EditorPage.share.test.tsx`
- [ ] manager lists and revokes snapshots -> verify: `npx vitest run tests/SharedLinksManager.test.tsx`
- [ ] manager stops the live link -> verify: `npx vitest run tests/SharedLinksManager.test.tsx`
- [ ] full suite -> verify: `npm test && npm run check && npm run build`, plus PR CI
