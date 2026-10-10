# Plan: accessibility basics (button names, dialog semantics)

Track: **Everything else** (Gates 1–3). Scan finding: the whole app had one `aria-label` and one `role`. Scoped to the scan's quick win — every button-like control has an accessible name, and the two shared modals are real dialogs that close on Escape.

## What a test render found (before writing the plan)

Rendering the editor (every section tab) and the home page with Testing Library, then computing each button's accessible name:

- **Editor**: every unnamed control is a drag handle from `@hello-pangea/dnd` (`role="button"` divs holding only a grip icon) — the section tabs (Desktop and Mobile layouts) and the items in `ListBlockEditor` / `TagsBlockEditor`. Icon buttons that already have a `title` get their name from it.
- **Home page**: the mobile menu toggle (only an icon).

## Design sketch

- Drag handles get `aria-label`s that say what moves: `editor.a11y.reorderSection` ("Drag to reorder the {{title}} section"), `editor.a11y.reorderItem` ("Drag to reorder {{title}}"), and `editor.a11y.reorderUntitledItem` for items with no title yet. en + zh-TW.
- Home menu toggle: `aria-label` = open/close menu (by state) and `aria-expanded`.
- `LogoutConfirmModal` and `ImportResumeModal`: the panel gets `role="dialog"`, `aria-modal="true"` and `aria-labelledby` pointing at its `<h2>`; Escape calls `onClose`. The import modal ignores Escape while uploading, matching its backdrop.
- **Mobile editor needs no change** (found while writing its test, 2026-10-10): at 375 px every reachable view — info, each section via the section dropdown, and the open dropdown — has 0 unnamed buttons (15–36 buttons each), because mobile icon buttons carry `title`s and list/tag items use Move Up/Down buttons instead of grips. A test would pass before any change, so none was added. The drag-handle tab strip inside `MobileEditLayout` (the `isMobile ? … : …` else-branch) is **unreachable**: `EditorPage` renders `MobileEditLayout` only when `isMobile` is true. Reported as dead code, not deleted.
- **Keyboard-reachable section tabs (added 2026-10-10 to finish the owner's list)**: the tabs were clickable `<div>`s with no role or tabindex. The inactive tab's title (desktop), the mobile section-menu chevron ("Choose a section", `aria-expanded`) and each mobile menu row's title become real `<button type="button">`s **inside** the existing clickable divs, so their clicks bubble to the same handlers (mouse/touch unchanged) and Enter/Space work natively. The active tab and the mobile toggle keep their rename `<input>` outside any button.
- Correction: desktop drag-and-drop **does** have a keyboard path — `@hello-pangea/dnd` ships a keyboard sensor (focus a handle, "Press space bar to start a drag", arrow keys to move), and the handles are focusable. An earlier version of this plan said otherwise.
- Out of scope (follow-ups): the block icon picker uses clickable `<div>`/`<svg>`s; focus is not trapped inside modals.

## Tests

| Behavior | Test file |
|---|---|
| Every button in the desktop editor has an accessible name, in every section | `tests/a11y.editor.test.tsx` |
| Every home page button has a name; the menu toggle reports open/closed | `tests/HomePage.a11y.test.tsx` |
| The logout confirmation is a labelled modal dialog | `tests/LogoutConfirmModal.test.tsx` |
| Escape closes the logout confirmation | `tests/LogoutConfirmModal.test.tsx` |
| The import modal is a labelled modal dialog | `tests/ImportResumeModal.a11y.test.tsx` |
| Escape closes the import modal, but not while uploading | `tests/ImportResumeModal.a11y.test.tsx` |
| Every desktop section tab is a real button that opens its section | `tests/a11y.editor.test.tsx` |
| The mobile section menu and its sections are real buttons | `tests/a11y.editor.test.tsx` |

## Checklist

- [x] desktop editor buttons named -> verify: `npx vitest run tests/a11y.editor.test.tsx`
  ```
  red:   AssertionError: expected [ …(27) ] to deeply equal []
  green: ✓ tests/a11y.editor.test.tsx  (1 test)
  ```
- [x] ~~mobile editor buttons named~~ — already true, no change and no test (see design sketch); exploration printed `unnamed=0` for every mobile view
- [x] home page buttons named, menu toggle state -> verify: `npx vitest run tests/HomePage.a11y.test.tsx`
  ```
  red:   expected [ Array(1) ] to deeply equal []   (<button class="md:hidden p-2 …">)
  red:   expect(element).toHaveAttribute("aria-expanded", "false")
  green: ✓ tests/HomePage.a11y.test.tsx  (2 tests)
  ```
- [x] logout modal is a labelled dialog -> verify: `npx vitest run tests/LogoutConfirmModal.test.tsx`
  ```
  red:   Unable to find an accessible element with the role "dialog" and name "Confirm Logout"
  green: ✓ tests/LogoutConfirmModal.test.tsx  (1 test)
  ```
- [x] Escape closes logout modal -> verify: `npx vitest run tests/LogoutConfirmModal.test.tsx`
  ```
  red:   expected "spy" to be called 1 times, but got 0 times
  green: ✓ tests/LogoutConfirmModal.test.tsx  (2 tests)
  ```
- [x] import modal is a labelled dialog -> verify: `npx vitest run tests/ImportResumeModal.test.tsx`
  ```
  red:   Unable to find an accessible element with the role "dialog" and name "Import Resume with AI"
  green: ✓ tests/ImportResumeModal.a11y.test.tsx  (1 test)
  ```
- [x] Escape closes import modal, not while uploading -> verify: `npx vitest run tests/ImportResumeModal.test.tsx`
  ```
  red:   expected "spy" to be called 1 times, but got 0 times
  red:   expected "spy" to not be called at all, but actually been called 1 times   (mid-upload)
  green: ✓ tests/ImportResumeModal.a11y.test.tsx  (3 tests)
  ```
- [x] desktop section tabs are buttons -> verify: `npx vitest run tests/a11y.editor.test.tsx`
  ```
  red:   Unable to find an accessible element with the role "button" and name "Experience"
  green: Tests  2 passed (2)
  ```
- [x] mobile section menu + rows are buttons -> verify: `npx vitest run tests/a11y.editor.test.tsx`
  ```
  red:   Unable to find an accessible element with the role "button" and name "Choose a section"
  green: Tests  3 passed (3)   (with tests/i18n.locales.test.ts: 10 passed)
  ```
- [x] full suite (before the keyboard tabs) -> verify: `npm test && npm run check && npm run build`
  ```
   Test Files  23 passed | 1 skipped (24)
        Tests  113 passed | 19 skipped (132)
  ✖ 91 problems (0 errors, 91 warnings)
  ✓ built in 4.86s
  ```
- [x] full suite (with the keyboard tabs) -> verify: `npm test && npm run check && npm run build`
  ```
   Test Files  23 passed | 1 skipped (24)
        Tests  115 passed | 19 skipped (134)
  ✖ 91 problems (0 errors, 91 warnings)
  ✓ built in 5.20s
  ```
