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
- **Focus kept inside modals (added 2026-10-10, owner's follow-up list)**:
  - `useFocusTrap(ref, active)` (`src/hooks/useFocusTrap.ts`): when it activates, focus moves to the first control inside (or the container); Tab on the last control wraps to the first, Shift+Tab on the first wraps to the last; when it deactivates, focus goes back to whatever had it before (the opener).
  - `useModalDialog(open, onClose)` (`src/hooks/useModalDialog.ts`) bundles what an editor modal needs: `useFocusTrap` + Escape → `onClose` + a `useId` title id. It returns `{ ref, titleId }` (destructure it — `react-hooks/refs` rejects reading `.titleId` off an object that holds a ref).
  - `LogoutConfirmModal` and `ImportResumeModal` already had Escape and title ids, so they only add `useFocusTrap`.
  - Editor modals, in both layouts (deliberately duplicated): share, delete-section confirm, delete-profile confirm (its "can't delete the last one" and "delete?" variants share one title id) → `role="dialog"`, `aria-modal="true"`, `aria-labelledby` the `<h3>`; Escape does what Cancel / X does. The share modal's X button gets a name (`common.close`).
  - Photo crop modal (`PhotoUploadCrop`): same; Escape = Cancel.
- **Keyboard-usable icon pickers (same list)**: the section icon picker (desktop tab strip, mobile section header) and the contact icon picker (`InfoEditor`) were clickable `<svg>`/`<div>`s.
  - Trigger → one `<button type="button">` (wrapping the icon or the dashed circle, so it stays mounted and focus can return to it) named `editor.a11y.chooseSectionIcon` ("Choose an icon for the {{title}} section") / `chooseContactIcon` ("Choose an icon for {{text}}"; `chooseUntitledContactIcon` when the text is empty), with `aria-haspopup="dialog"` and `aria-expanded`.
  - Popup → `role="dialog"` with the same label, via `useModalDialog`: focus moves in, Tab stays in, Escape closes and returns focus to the trigger. The click-away backdrop is unchanged.
  - Options → `<button type="button">`s named by a translated label, `editor.icons.<LucideName>` (21 names across `AVAILABLE_ICONS` and `AVAILABLE_BLOCK_ICONS`), and `editor.a11y.noIcon` for 🚫 (which replaces the hard-coded `title="No Icon"`). A test pins that every offered icon has a label in both locales.
- Not touched: the unreachable `isMobile` branch inside `DesktopEditLayout` (the layout only renders when `isMobile` is false) and the unreachable else-branch in `MobileEditLayout` — same dead-code finding as above.
- Out of scope (follow-ups): arrow-key movement inside the icon grid (Tab works); the photo drop zone is a clickable `<div>` with a hidden file input (no keyboard path to upload); hard-coded English in `PhotoUploadCrop` ("Position in Layout:", "Left", "Right", "Drag to move • Scroll to zoom").

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
| `useFocusTrap`: focuses the first control, wraps Tab / Shift+Tab, gives focus back | `tests/useFocusTrap.test.tsx` |
| The logout and import dialogs take keyboard focus when they open | `tests/LogoutConfirmModal.test.tsx`, `tests/ImportResumeModal.a11y.test.tsx` |
| `useModalDialog`: labels the dialog, takes focus, Escape closes only while open | `tests/useModalDialog.test.tsx` |
| Editor modals (share, delete section, delete profile — desktop and mobile) are labelled modal dialogs that take focus and close on Escape | `tests/a11y.dialogs.test.tsx` |
| The photo crop modal is a labelled modal dialog that takes focus and cancels on Escape | `tests/PhotoUploadCrop.a11y.test.tsx` |
| Section icon picker (desktop, mobile) and contact icon picker work from the keyboard | `tests/a11y.iconPickers.test.tsx` |
| Every offered icon has a label in both locales | `tests/i18n.locales.test.ts` |

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
- [x] useFocusTrap focuses the first control -> verify: `npx vitest run tests/useFocusTrap.test.tsx`
  ```
  red:   TypeError: useFocusTrap is not a function   (red commit blocked by the pre-commit typecheck; staged, test unchanged, lands with green)
  green: ✓ tests/useFocusTrap.test.tsx  (1 test)
  ```
- [x] useFocusTrap wraps Tab / Shift+Tab at the ends -> verify: `npx vitest run tests/useFocusTrap.test.tsx`
  ```
  red:   Error: expect(element).toHaveFocus()
  green: ✓ tests/useFocusTrap.test.tsx  (2 tests)
  ```
- [x] useFocusTrap gives focus back to the opener -> verify: `npx vitest run tests/useFocusTrap.test.tsx`
  ```
  red:   Error: expect(element).toHaveFocus()
  green: ✓ tests/useFocusTrap.test.tsx  (3 tests)
  ```
- [x] logout dialog takes keyboard focus -> verify: `npx vitest run tests/LogoutConfirmModal.test.tsx`
  ```
  red:   Error: expect(element).toContainElement(element)
  green: ✓ tests/LogoutConfirmModal.test.tsx  (3 tests)
  ```
- [x] import dialog takes keyboard focus -> verify: `npx vitest run tests/ImportResumeModal.a11y.test.tsx`
  ```
  red:   Error: expect(element).toContainElement(element)
  green: ✓ tests/ImportResumeModal.a11y.test.tsx  (4 tests)
  ```
- [x] useModalDialog labels, focuses, closes on Escape only while open -> verify: `npx vitest run tests/useModalDialog.test.tsx`
  ```
  red:   TypeError: useModalDialog is not a function   (red commit blocked by the pre-commit checks; staged, assertions unchanged, lands with green)
  green: ✓ tests/useModalDialog.test.tsx  (1 test)
  ```
- [ ] desktop share modal is a labelled modal dialog: takes focus, Escape closes, X button named -> verify: `npx vitest run tests/a11y.dialogs.test.tsx`
- [ ] desktop delete-section confirm is a labelled modal dialog: takes focus, Escape cancels -> verify: `npx vitest run tests/a11y.dialogs.test.tsx`
- [ ] desktop delete-profile confirm is a labelled modal dialog: takes focus, Escape cancels -> verify: `npx vitest run tests/a11y.dialogs.test.tsx`
- [ ] mobile share / delete-section / delete-profile modals: same -> verify: `npx vitest run tests/a11y.dialogs.test.tsx`
- [ ] photo crop modal is a labelled modal dialog: takes focus, Escape cancels -> verify: `npx vitest run tests/PhotoUploadCrop.a11y.test.tsx`
- [ ] every offered icon has a label in both locales -> verify: `npx vitest run tests/i18n.locales.test.ts`
- [ ] desktop section icon picker works from the keyboard (named trigger + aria-expanded, focus moves in, named options pick, Escape closes and refocuses the trigger) -> verify: `npx vitest run tests/a11y.iconPickers.test.tsx`
- [ ] mobile section icon picker: same -> verify: `npx vitest run tests/a11y.iconPickers.test.tsx`
- [ ] contact icon picker: same -> verify: `npx vitest run tests/a11y.iconPickers.test.tsx`
- [ ] full suite (with focus traps and icon pickers) -> verify: `npm test && npm run check && npm run build`
