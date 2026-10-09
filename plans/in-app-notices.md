# Plan: in-app notices (replace `alert()`, surface save failures)

Track: **Everything else** (Gates 1–3). Two scan findings share one piece of UI:
- 12 native `alert()` calls in 7 files (one hardcoded in English, `useResume.ts:202`) clash with the app's own modals and block the page.
- A failed autosave only does `console.error` (`useResume.ts` `syncToFirestore`), so the user believes the change is saved. A pending 1.5 s autosave is also lost if the tab is hidden/closed first.

## Design sketch

- `src/contexts/NoticeContext.tsx`
  - `NoticeProvider` renders its children plus a fixed notice stack (bottom centre, warm glass card like `LogoutConfirmModal`).
  - `useNotice()` → `{ notify(message: string, tone?: 'info' | 'error') }`.
  - Each notice: `role="status"` (info) or `role="alert"` (error), the message, and a dismiss button (`aria-label` = `common.dismiss`). Auto-dismiss after 6 s.
  - Default context value is a no-op `notify`, so components and hooks rendered without the provider (existing tests) keep working.
- `App.tsx`: `NoticeProvider` wraps `AuthProvider` (sign-in errors notify from inside `AuthProvider`).
- Every `alert(x)` becomes `notify(x, …)` with the same i18n key. The hardcoded English message in `useResume.ts` gets a key in both locales.
- `useResume`:
  - autosave failure → `notify(t('editor.notices.saveFailed'), 'error')`. Local data is already in `localStorage`, and the next edit retries.
  - a pending autosave runs immediately when the page becomes hidden (`visibilitychange` → `hidden`), instead of being dropped.
- Lint guard: ESLint core rule `no-alert` set to `error`, so new `alert()` calls fail `npm run lint` and the pre-commit hook.
- Edge cases: several notices at once (stacked, each dismissable); a notice outliving its component; the visibility flush when nothing is pending (no write).
- Out of scope: a retry button, offline queueing, changing the confirm dialogs (`confirm()` is not used).

## Existing test that changes (flagged for the owner)

`tests/EditorPage.test.tsx` "denies opening import modal…" asserts `window.alert` was called. Replacing `alert()` is the approved plan item, so that assertion is rewritten **first, as the red step** (expect the notice instead), in its own commit — the test gets the new behavior's spec, not a looser check.

## Tests

| Behavior | Test file |
|---|---|
| `notify()` shows the message as a status notice | `tests/NoticeContext.test.tsx` |
| Error notices are announced with `role="alert"` | `tests/NoticeContext.test.tsx` |
| Notices disappear after 6 s | `tests/NoticeContext.test.tsx` |
| The dismiss button removes a notice | `tests/NoticeContext.test.tsx` |
| Import over the free limit shows a notice, not `alert()` | `tests/EditorPage.test.tsx` |
| Sign-in blocked popup shows a notice | `tests/AuthContext.test.tsx` |
| A failed autosave shows an error notice | `tests/useResume.test.ts` |
| A pending autosave is written when the page is hidden | `tests/useResume.test.ts` |
| No `alert()` left in app code | `npm run lint` (`no-alert`) |

## Checklist

- [ ] notify() shows a status notice -> verify: `npx vitest run tests/NoticeContext.test.tsx`
- [ ] error notices use role="alert" -> verify: `npx vitest run tests/NoticeContext.test.tsx`
- [ ] notices auto-dismiss after 6 s -> verify: `npx vitest run tests/NoticeContext.test.tsx`
- [ ] dismiss button removes a notice -> verify: `npx vitest run tests/NoticeContext.test.tsx`
- [ ] import over the limit shows a notice -> verify: `npx vitest run tests/EditorPage.test.tsx`
- [ ] blocked sign-in popup shows a notice -> verify: `npx vitest run tests/AuthContext.test.tsx`
- [ ] failed autosave shows an error notice -> verify: `npx vitest run tests/useResume.test.ts`
- [ ] pending autosave flushed on page hide -> verify: `npx vitest run tests/useResume.test.ts`
- [ ] no alert() in app code -> verify: `npm run lint`
- [ ] full suite -> verify: `npm test && npm run check && npm run build`
