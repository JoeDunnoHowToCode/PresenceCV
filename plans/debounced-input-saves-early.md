# Plan: make `useDebouncedInput` wait for a pause before saving

Track: **Bug fix** (Gates 2–3; this plan was asked for — the fix fits in one sentence). Bug: `useDebouncedInput` (`src/components/editor/InfoEditor.tsx`) should save an edit once typing pauses for `delay` ms (default 1000), but it saves on the re-render that follows every keystroke. Seen 2026-10-10: after one `fireEvent.change` on the profile name field, `updateProfile` had already been called before 1000 ms passed. 13 fields use the hook (`InfoEditor`, `ListBlockEditor`, `TagsBlockEditor`).

## Causes

1. The "cleanup timeout on unmount" effect depends on `[localValue, onSave]`. `handleChange` sets `localValue` and starts a timer; the re-render changes `localValue`, so React runs the previous effect's cleanup, which finds that new timer, clears it and calls `onSave` at once. Every caller passes an inline arrow as `onSave`, so *any* re-render while a save is pending does the same.
2. That cleanup never sets `timeoutRef.current = null`. The stale timer id makes `handleBlur` — or an unmount with no blur — save a second time.
3. The cleanup reads the value from `inputRef.current?.value`, but React has already set the ref to `null` when an unmount cleanup runs (checked with a throwaway probe test on React 19.2.5), so it always falls back to `localValue`. ESLint warns about this read today (`InfoEditor.tsx:42`).

## Design sketch

- **Interface — unchanged.** `useDebouncedInput(initialValue, onSave, delay = 1000)` still returns `{ ref, defaultValue, onChange, onBlur, localValue }` for an *uncontrolled* input (Iron rule 4). No caller changes.
- **Internals** (`src/components/editor/InfoEditor.tsx`):
  - `onSaveRef` holds the newest `onSave`; a `useLayoutEffect` with no deps array updates it after every render.
  - `pendingValueRef` holds the last typed value; `handleChange` sets it.
  - The flush effect gets `[]` deps, so its cleanup runs only on unmount: if a timer is pending, clear it, set `timeoutRef.current = null`, call `onSaveRef.current(pendingValueRef.current)`.
  - The timer calls `onSaveRef.current(newValue)` (second red/green cycle), so a save that waits still goes through the caller's newest callback — `TagItemEditor`'s `onSave` reads `tags` and `item.text` from its render.
  - `handleBlur` and the outside-value sync effect stay as they are.
- **Edge cases:** two changes inside the delay → one save, of the second value, `delay` ms after the second; blur or unmount with nothing pending → no save; blur, then unmount → one save in total; a re-render with a new inline `onSave` while a save is pending → no early save; clearing the field saves `''` (today's `|| localValue` fallback is gone).
- **Out of scope:** saving a pending edit when the tab closes without a blur (see Risks); cancelling a pending save when an outside value arrives while the field is unfocused; the `any` casts at the call sites; the duplicated Desktop/Mobile layouts.

## Risks

- Edits now reach `useResume` up to `delay` ms after the last keystroke instead of on the next render. Clicking or tabbing anywhere else blurs the field first, which saves it. With no blur — e.g. closing the tab within 1 s of the last keystroke — that last second of typing is lost; today it is already in state, and `useResume` writes it to Firestore on `visibilitychange`. Flagged for the owner, not handled here.
- `InfoEditor` is keyed by `activeProfileId`, and `updateProfile` writes to whichever profile is active when it runs, so an unmount flush after a profile switch would land in the new profile. Every switch is a click, which blurs (and saves) first — and today's code has the same exposure for longer (its stale timer id lives until the next blur).

## Interaction with open PRs

- **#11 `feat/a11y-basics`** — its pin test "has saved the latest edit of a focused text field once Share opens" (`tests/a11y.dialogs.test.tsx`) passes today thanks to the early save. After this fix the save has to come from the field's blur flush (jsdom 24's `blur()` fires `focusout`, which React's `onBlur` listens to). On the merged tree there are two blurs: the `blur()` in `openShareModal`, and #11's focus trap moving focus into the dialog — removing the first alone still passes; removing the hook's blur flush fails (see checklist). #11 also edits `InfoEditor.tsx` — an import after line 6 and `ContactItemEditor` from line 205 — but not the hook. Check: build the merged tree without touching either branch (`git merge-tree --write-tree` + `git commit-tree` + `git worktree add --detach`, LESSONS 2026-10-10) and run the full suite there.
- **#12 `fix/dependency-majors`** moves to Vitest 4. The new test only uses `vi.useFakeTimers`, `vi.advanceTimersByTime` and `act`; run it on main + #12 + this branch.

## Tests

| Behavior | Test file |
|---|---|
| An outside value shows in the field while it is not focused (pin — passes before the fix) | `tests/useDebouncedInput.test.tsx` |
| An outside value is ignored while the field is focused; the typed text stays (pin) | `tests/useDebouncedInput.test.tsx` |
| Two quick changes → no save until 1000 ms after the second, then exactly one save of the second value (reproduces the bug) | `tests/useDebouncedInput.test.tsx` |
| Blur saves a pending edit exactly once; the timer adds no second save (reproduces the double save) | `tests/useDebouncedInput.test.tsx` |
| Unmount saves a pending edit exactly once; the timer adds no second save | `tests/useDebouncedInput.test.tsx` |
| A pending save goes to the `onSave` from the newest render, not the one from the keystroke | `tests/useDebouncedInput.test.tsx` |
| Opening Share has saved a focused field's latest edit (PR #11's pin test, on the merged tree) | `tests/a11y.dialogs.test.tsx` |

## Checklist

- [x] Pin: outside values sync only while the field is unfocused (passes before the fix) -> verify: `npx vitest run tests/useDebouncedInput.test.tsx`
  ```
  unfixed code:            Tests  2 passed (2)
  mutation, focus guard dropped:  × keeps what the user typed …  Expected "Alex R."  Received "Sam"
  mutation, sync disabled:        × shows a new outside value …  Expected "Sam"      Received "Alex"
  ```
- [x] Red: one save 1000 ms after the last change; blur saves once; unmount saves once (3 assertion failures) -> verify: `npx vitest run tests/useDebouncedInput.test.tsx`
  ```
  × saves once, 1000 ms after the last of two quick changes
    AssertionError: expected "spy" to not be called at all, but actually been called 2 times   (calls: "Alex R", "Alex R.")
  × saves a pending edit exactly once when the field loses focus
    AssertionError: expected "spy" to be called 1 times, but got 2 times
  × saves a pending edit exactly once when the field unmounts
    AssertionError: expected "spy" to be called 1 times, but got 2 times
  Tests  3 failed | 2 passed (5)
  ```
- [x] Green: flush only on unmount, through refs -> verify: `npx vitest run tests/useDebouncedInput.test.tsx`
  ```
  Tests  5 passed (5)
  git diff HEAD --stat:  src/components/editor/InfoEditor.tsx | 17 +++++++++++++----
  ```
- [x] Red: a pending save goes to the newest `onSave` -> verify: `npx vitest run tests/useDebouncedInput.test.tsx`
  ```
  × sends a pending save to the onSave from the newest render
    AssertionError: expected "spy" to not be called at all, but actually been called 1 times   (first onSave got "Alex R.")
  Tests  1 failed | 5 passed (6)
  ```
- [x] Green: the timer calls `onSaveRef.current` -> verify: `npx vitest run tests/useDebouncedInput.test.tsx`
  ```
  Tests  6 passed (6)
  git diff HEAD --stat:  src/components/editor/InfoEditor.tsx | 5 +++--
  ```
- [x] Full suite passes -> verify: `npm run test`
  ```
  Test Files  20 passed | 1 skipped (21)
       Tests  111 passed | 19 skipped (130)
  (baseline 105 passed | 19 skipped; the 19 are tests/firestore.rules.test.ts, which runs only under npm run test:rules)
  ```
- [x] Typecheck + lint pass with no new warnings (baseline: 0 errors, 91 warnings) -> verify: `npm run check`
  ```
  ✖ 90 problems (0 errors, 90 warnings)   — the inputRef-in-cleanup warning (InfoEditor.tsx:42) is gone
  ```
- [x] Build passes -> verify: `npm run build`
  ```
  ✓ built in 2.60s
  ```
- [x] Full suite, including PR #11's pin test, passes on main + #11 + this branch -> verify: `npm run test` in a detached worktree of the merged tree
  ```
  merge-tree: no conflicts (temp commit d68b463, not a branch)
  Test Files  29 passed | 1 skipped (30)
       Tests  140 passed | 19 skipped (159)
  ✓ tests/a11y.dialogs.test.tsx > editor modals > has saved the latest edit of a focused text field once Share opens
  mutation, both blur() calls in EditorPage removed:  ✓ still passes (the dialog's focus trap blurs the field)
  mutation, the hook's blur flush removed:            × expected last "spy" call to have been called with [ 'name', 'Alex R.' ]
  ```
- [x] The new test passes under Vitest 4 on main + #12 + this branch -> verify: `npx vitest run tests/useDebouncedInput.test.tsx` in a detached worktree of the merged tree
  ```
  vitest/4.1.11 darwin-arm64 node-v22.22.3 — merge-tree: no conflicts (temp commit 55c1b51, not a branch)
  Test Files  1 passed (1)
       Tests  6 passed (6)
  ```
- [x] Real browser: the real `InfoEditor` in `StrictMode`, Chromium (browser pane) -> verify: throwaway Vite harness (LESSONS 2026-10-10; deleted after) logging keystroke / blur / save times to `window.__log`
  ```
  3 keystrokes 4–5 ms apart → 1 save "name=Alex Rivera JrXYZ", 1001 ms after the last keystroke
  2 keystrokes, then click elsewhere → blur and 1 save "title=Product DesignerAB" in the same ms; no timer save in the next 2 s
  mount (StrictMode) → no save
  ```
