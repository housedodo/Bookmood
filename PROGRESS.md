# ShelfScan — Progress & Decisions

Living log of what has been built, the decisions made along the way, and how to change things.
`CLAUDE.md` is the original spec; **this file wins where they differ** (see "Deviations from the spec").
Update this file at the end of every phase.

## Status

| Phase | What | Status |
|---|---|---|
| 1 | Scaffold: Vite + React + TS, theme, fonts, tab bar, 4 pages, lint + tests | ✅ done |
| 2 | Data layer: `db.ts`, `isbn.ts`, `moods.ts`, `genres.ts` + tests | ✅ done |
| 3 | Lookup (Open Library → Google Books) + cover download & theme hue + tests | ✅ done |
| 4 | Library UI: manual add, BookCard, grid, search, filters, sort, BookDetail | ⏳ next |
| 5 | Scanner: camera, debounce, duplicates, undo, batch mode, confetti | — |
| 6 | Pick page: MoodPicker, `recommend.ts` + tests, results | — |
| 7 | Settings (export/import), PWA, icons, polish, README | — |

## Running it

```
npm install        # once
npm run dev        # dev server, also reachable from your phone on the same Wi-Fi
npm test           # vitest (no network: uses tests/fixtures)
npm run lint       # eslint + tsc --noEmit
npm run build      # production build into dist/
```

Before calling a phase done: `npm run lint` and `npm test` must both pass.

## Hosting (Cloudflare Workers, free)

- The repo is connected to Cloudflare **Workers** (not Pages). Build command `npm run build`, deploy command `npx wrangler deploy`.
- `wrangler.jsonc` tells wrangler to serve the `dist/` folder as static assets, and turns on the `workers.dev` URL and per-branch preview URLs.
- The `name` in `wrangler.jsonc` (`bookmood`) **must match the Worker's name** in the Cloudflare dashboard, or the build fails.
- If the dashboard says "No URLs": Worker → Settings → Domains & Routes → enable `workers.dev` (first time: pick an account subdomain under Workers & Pages).
- HTTPS is included, which the camera (Phase 5) requires.

## Design: direction C "Candy Outline"

Chosen from three mockups (A Soft Sticker, B Rose Editorial, C Candy Outline):
https://claude.ai/artifact/E6f9d1wseY7MD4C7o6sfj3

What C means in code:
- Thick plum outlines (`--outline: 2px solid var(--text)`) and solid offset "sticker" shadows (`--pop`, `--pop-s`) instead of soft blurred shadows and dotted borders.
- Plum ink `--text: #4B2C3C`, page background `--bg: #FFEEF4`. The rest of the palette is unchanged from CLAUDE.md.
- **Far fewer emojis.** UI icons are inline line SVGs in `src/components/Icon.tsx` (add new icons there as path strings). Emojis remain only where the spec text uses them (mood buttons, a few friendly messages).
- Buttons/chips: outlined pills; pressed state moves the element 2px down-right and shrinks the shadow (it "presses into" the page).
- Tab bar: floating outlined bar with a rounded-square Scan button (`src/styles/tabbar.css`).
- Per-book theme is unchanged: `--book-bg` / `--book-accent` / `--book-strong` from `themeHue`; cards get the plum outline + pop shadow on top.
- Fonts: Fredoka (headings, buttons), Quicksand (body), Caveat (handwritten accents) — bundled via @fontsource.

To switch direction later, the knobs are the CSS variables in `src/styles/theme.css` and `src/styles/tabbar.css`.

## Deviations from the spec (decisions made)

- **Files live at the repo root**, not in a `shelfscan/` subfolder.
- **Tab order:** Library · Pick · [Scan] · Settings. Four tabs can't be symmetric around a centered Scan button, so Settings spans two grid columns to keep Scan centered.
- **Design C** (above) replaces the dotted borders / soft shadows / emoji tab icons of spec section 11.
- **Lookup also asks Google Books when Open Library has no description**, to fill in the description (and missing pages/authors). Mood matching scores descriptions, and Open Library's `jscmd=data` rarely has one. Order is still Open Library first.
- **Cover URLs are a list**: Open Library's `?default=false` cover first, then Open Library's cover from the data, then Google's thumbnail (upgraded to https). Images under 1 KB are treated as "no cover" placeholders.
- **`createImageBitmap(blob)` is called without resize options** (older iOS Safari ignores them); scaling to 32×32 happens in `drawImage`.
- **Test fixtures are hand-written** in the exact Open Library / Google Books response shapes: the build sandbox could not reach those APIs (Open Library blocked; Google Books returned a quota error).
- Library versions are current releases: React 19, Vite 8, Vitest 5, TypeScript 6, Dexie 4.

## What exists, file by file

### Phase 1 — Scaffold
- `src/main.tsx` imports fonts + `theme.css`; `src/App.tsx` = HashRouter, routes `/`, `/scan`, `/pick`, `/settings`, plus `TabBar`.
- `src/pages/*Page.tsx`: placeholders for now (Library shows the empty state).
- `eslint.config.js` forbids `any`; `tsconfig.json` is strict; `vite.config.ts` holds the Vitest config (jsdom, `tests/setup.ts`).
- `tests/setup.ts` loads jest-dom matchers and `fake-indexeddb/auto`.

### Phase 2 — Data layer
- `src/data/db.ts`: `Book` type (exactly spec §6), Dexie DB `shelfscan`, table `books` with indexes `id, &isbn13, title, dateAdded, status`.
  Helpers: `createBook`, `addBook` (rejects duplicates with `ConstraintError`), `findByIsbn`, `updateBook`, `deleteBook`. All take an optional DB for tests.
- `src/lib/isbn.ts`: `normalizeIsbn`, `isValidIsbn13` (978/979 + checksum), `isValidIsbn10` (incl. X), `isbn10To13`, `toIsbn13` (accepts either).
- `src/data/moods.ts`: `MOODS` (single source of truth, spec §7), `MoodId`, `getMood`.
- `src/data/genres.ts`: `normalizeGenres(subjects)` maps raw subjects to ~25 clean genres via a rule table with `match` and `exclude` words (so "Science fiction" isn't "Science", "Time travel" isn't "Travel"). To add a genre, add a rule to `GENRE_RULES`.

### Phase 3 — Lookup + cover theme
- `src/lib/lookup.ts`:
  - `lookup(isbn13, { fetchImpl?, timeoutMs? })` → `LookupResult | null`, never throws. 8 s timeout per request (AbortController).
  - `LookupResult = { isbn13, title, authors, pageCount?, description?, subjects, coverUrls, source }`.
  - `parseOpenLibrary`, `parseGoogleBooks` (pure, read untyped JSON safely), `mergeResults` (fill gaps), `fetchJson`.
  - Subtitles are appended as `Title: Subtitle`.
- `src/lib/cover.ts`:
  - `getCoverTheme(coverUrls, title)` → `{ coverBlob?, themeHue }` — the one function the scan/add flow will call.
  - `downloadCover(urls)`: first URL that returns an image > 1 KB.
  - `hueFromPixels(rgba)`: ignores transparent, gray (s < 0.2), near-black (l < 0.12), near-white (l > 0.92) pixels; saturation-weighted **circular** mean of hue.
  - `hueFromTitle(title)`: stable hash into 320–40 (roses/peaches) or 250–290 (lavender).
  - `hueFromBlob(blob)`: draws to a 32×32 canvas; returns null if the browser refuses (then the title hue is used).
- Tests: `tests/lookup.test.ts` (OL success + GB description fill, OL-only, GB fallback, both empty → null, network/HTTP errors, timeout), `tests/cover.test.ts`.
- Fixtures: `tests/fixtures/openlibrary-9780593334836.json`, `googlebooks-9780593334836.json`, `openlibrary-empty.json`, `googlebooks-empty.json`.

## Known risks / to verify on a real phone

- **Cover CORS:** covers are fetched with `fetch()` so the Blob can be stored. If a cover host doesn't send CORS headers, the download fails and the book falls back to the title hue and no stored cover. Check in Phase 5 with real scans.
- **Google Books without an API key** has a shared anonymous quota and sometimes answers 429. That is handled (treated as "not found"), but lookups may then rely on Open Library alone.
- Offline: `lookup` returns null when offline; the scan UI (Phase 5) should check `navigator.onLine` to show the friendly offline message instead of "not found".

## How to make common changes

- **Add/adjust a mood:** edit `MOODS` in `src/data/moods.ts` (keywords are lowercase, matched as substrings). Recommendation tests come in Phase 6.
- **Add a genre:** add a rule in `GENRE_RULES` in `src/data/genres.ts`; add a case to `tests/genres.test.ts`.
- **Change colors / look:** CSS variables in `src/styles/theme.css`.
- **Add an icon:** add a path string to `PATHS` in `src/components/Icon.tsx` (24×24 viewBox, stroke-only).
- **Change the database shape:** bump `this.version(n)` in `src/data/db.ts` with the new schema; never edit version 1 in place once real data exists on your phone.
