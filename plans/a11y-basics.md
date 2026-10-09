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
- Out of scope (reported as follow-ups): the section tabs themselves are clickable `<div>`s, so they can't be reached with the keyboard; the block icon picker uses clickable `<div>`/`<svg>`; there is no keyboard alternative to drag-and-drop on desktop; focus is not trapped inside modals. Fixing the tabs means restructuring both 700-line layouts, which are deliberately duplicated for now.

## Tests

| Behavior | Test file |
|---|---|
| Every button in the desktop editor has an accessible name, in every section | `tests/a11y.editor.test.tsx` |
| Every button in the mobile editor has an accessible name | `tests/a11y.editor.test.tsx` |
| Every home page button has a name; the menu toggle reports open/closed | `tests/HomePage.a11y.test.tsx` |
| The logout confirmation is a labelled modal dialog | `tests/LogoutConfirmModal.test.tsx` |
| Escape closes the logout confirmation | `tests/LogoutConfirmModal.test.tsx` |
| The import modal is a labelled modal dialog | `tests/ImportResumeModal.test.tsx` |
| Escape closes the import modal, but not while uploading | `tests/ImportResumeModal.test.tsx` |

## Checklist

- [ ] desktop editor buttons named -> verify: `npx vitest run tests/a11y.editor.test.tsx`
- [ ] mobile editor buttons named -> verify: `npx vitest run tests/a11y.editor.test.tsx`
- [ ] home page buttons named, menu toggle state -> verify: `npx vitest run tests/HomePage.a11y.test.tsx`
- [ ] logout modal is a labelled dialog -> verify: `npx vitest run tests/LogoutConfirmModal.test.tsx`
- [ ] Escape closes logout modal -> verify: `npx vitest run tests/LogoutConfirmModal.test.tsx`
- [ ] import modal is a labelled dialog -> verify: `npx vitest run tests/ImportResumeModal.test.tsx`
- [ ] Escape closes import modal, not while uploading -> verify: `npx vitest run tests/ImportResumeModal.test.tsx`
- [ ] full suite -> verify: `npm test && npm run check && npm run build`
