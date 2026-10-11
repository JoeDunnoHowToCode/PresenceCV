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

- **#11 `feat/a11y-basics`** — its pin test "has saved the latest edit of a focused text field once Share opens" (`tests/a11y.dialogs.test.tsx`) passes today thanks to the early save. After this fix the save has to come from the `blur()` in `openShareModal` (jsdom 24's `blur()` fires `focusout`, which React's `onBlur` listens to). #11 also edits `InfoEditor.tsx` — an import after line 6 and `ContactItemEditor` from line 205 — but not the hook. Check: build the merged tree without touching either branch (`git merge-tree --write-tree` + `git commit-tree` + `git worktree add --detach`, LESSONS 2026-10-10) and run the full suite there.
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

- [ ] Pin: outside values sync only while the field is unfocused (passes before the fix) -> verify: `npx vitest run tests/useDebouncedInput.test.tsx`
- [ ] Red: one save 1000 ms after the last change; blur saves once; unmount saves once (3 assertion failures) -> verify: `npx vitest run tests/useDebouncedInput.test.tsx`
- [ ] Green: flush only on unmount, through refs -> verify: `npx vitest run tests/useDebouncedInput.test.tsx`
- [ ] Red: a pending save goes to the newest `onSave` -> verify: `npx vitest run tests/useDebouncedInput.test.tsx`
- [ ] Green: the timer calls `onSaveRef.current` -> verify: `npx vitest run tests/useDebouncedInput.test.tsx`
- [ ] Full suite passes -> verify: `npm run test`
- [ ] Typecheck + lint pass with no new warnings (baseline: 0 errors, 91 warnings) -> verify: `npm run check`
- [ ] Build passes -> verify: `npm run build`
- [ ] Full suite, including PR #11's pin test, passes on main + #11 + this branch -> verify: `npm run test` in a detached worktree of the merged tree
- [ ] The new test passes under Vitest 4 on main + #12 + this branch -> verify: `npx vitest run tests/useDebouncedInput.test.tsx` in a detached worktree of the merged tree
