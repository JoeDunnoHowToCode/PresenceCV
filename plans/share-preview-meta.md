# Plan: link-preview meta tags

Track: **Everything else** (Gates 1–3). Finding: `index.html` has only a `<title>`. The core loop of the product is sending a link, and Slack / LinkedIn / LINE / iMessage show a bare URL with no description or image.

## Design sketch

Static tags in `index.html` (every route serves this file):

| Tag | Value |
|---|---|
| `meta name="description"` | One-sentence pitch, ≤ 160 characters |
| `og:type`, `og:site_name`, `og:title`, `og:description` | `website`, `PresenceCV`, the page title, the pitch |
| `og:image` (+ `:width`, `:height`, `:alt`) | `https://presencecv.vercel.app/favicon.png` — the 1024×1024 logo; the repo's homepage URL, checked live (200) |
| `twitter:card` | `summary` (square image; `summary_large_image` needs 2:1 art that doesn't exist yet) |

- **No static `og:url`.** All routes share this file, so a fixed `og:url` would point every shared resume at the home page (Facebook treats `og:url` as the canonical link).
- Edge cases: the image URL must be absolute (crawlers don't resolve relative paths); the description must stay short enough not to be cut.
- Out of scope: per-resume previews (the owner's name and title in the card) — that needs server-side rendering of meta for `/view?id=…`, e.g. a Vercel edge function. Also out of scope: dedicated 1200×630 artwork.

## Tests

| Behavior | Test file |
|---|---|
| Search results get a short description | `tests/index-html.meta.test.ts` |
| Link previews get a title, description and absolute image, without pinning share links to the home page | `tests/index-html.meta.test.ts` |
| X/Twitter shows a summary card | `tests/index-html.meta.test.ts` |

## Checklist

- [ ] description meta -> verify: `npx vitest run tests/index-html.meta.test.ts`
- [ ] Open Graph tags, absolute image, no og:url -> verify: `npx vitest run tests/index-html.meta.test.ts`
- [ ] twitter:card summary -> verify: `npx vitest run tests/index-html.meta.test.ts`
- [ ] full suite -> verify: `npm test && npm run check && npm run build`
