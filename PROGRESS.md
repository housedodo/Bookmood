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
| 4 | Library UI: manual add, BookCard, grid, search, filters, sort, BookDetail | ✅ done |
| 5 | Scanner: camera, debounce, duplicates, undo, batch mode, confetti | ✅ done |
| 6 | Pick page: MoodPicker, `recommend.ts` + tests, results | ⏳ next |
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
- **"Type ISBN" lookup already lives in the Library's Add sheet** (spec puts it in Phase 5). It makes real lookups testable on the phone before the camera exists; Phase 5 reuses the same `IsbnLookup` component and `addByIsbn()`.
- **Books added by hand without an ISBN** get `isbn13 = "manual:<uuid>"` (isbn13 is the unique index). The detail sheet hides such ISBNs.
- **Manual "Genres" field**: the typed words are stored as `subjects` (so mood matching sees them) and run through `normalizeGenres` for `genres` (so the genre filter only shows clean names).
- **Author A–Z sorts by surname** (last word of the first author), then title.
- **Length filter has an "Any length" chip**; books without a page count only show under "Any length".
- **Status/length chips scroll sideways** on narrow phones instead of wrapping.
- **Delete confirm** is inline in the sheet ("Really remove this book?" → Yes, delete / Keep it), not a browser popup.
- **Scanner uses `BarcodeDetector` when the browser supports EAN-13** (Chrome on Android), else ZXing (iPhone Safari, desktop). Both feed the same ISBN check.
- **Single vs batch mode:** in single mode the camera pauses after a book is added and shows **Scan another**; in batch mode it stays on and the added books stack in a list. The camera also pauses while the "Add it by hand" sheet is open.
- **While a lookup is running, other scans are ignored** (they'll be picked up again on the next frame after it finishes).
- **"Search by title"** uses Open Library search (`search.json?title=`) and takes the first ISBN-13 Open Library lists for that work — this may be a different edition than your copy. Results without any ISBN-13 open the manual form pre-filled with title + author.
- **Opening a book from the Scan page** navigates to `/#/?book=<id>`: the open book lives in the URL (so the phone's Back button closes the sheet too).
- **Toast texts use ♡ instead of 💗** (fewer emojis).
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

### Phase 4 — Library UI
- `src/pages/LibraryPage.tsx`: live list via `useLiveQuery` (dexie-react-hooks) so changes show instantly. Header with count ("N books, M waiting to be read") and an **Add** button; search box; `FilterBar`; grid; empty state ("Your shelf is empty. Scan your first book! 📚" + Scan / Add by hand); "No books match" state with Clear filters. Filters/sort are not persisted (reset on reload).
- `src/lib/library.ts` (pure, tested): `filterBooks`, `sortBooks`, `lengthOf`, `libraryGenres`, `SORT_OPTIONS`, `DEFAULT_FILTERS`.
- `src/lib/addBook.ts`: `addByIsbn(isbn13)` = duplicate check → `lookup` → `getCoverTheme` → `normalizeGenres` → save; returns `added | duplicate | notFound | offline`, never throws. `addManualBook(input)` for the form.
- Components: `BookCard` (per-book tint, sticker cover, Reading/Read badge), `BookCover` (stored Blob via object URL, or a tinted title placeholder), `BookDetail` (bottom sheet: cover, authors, pages/ISBN, 5-heart rating — tap again to clear, status switch, genres, description, tags add/remove, notes saved on blur, delete with confirm), `FilterBar`, `ManualAddForm` (title required; validates ISBN-10/13), `IsbnLookup`, `Rating`, `Sheet` (generic bottom sheet; Esc/backdrop/X close; locks page scroll), `Toast` (top pill, 3 s, optional action button), `Icon`.
- Styles: `bookcard.css`, `bookdetail.css`, `filterbar.css`, `form.css`, `library.css`, `sheet.css`, `toast.css`; shared `.chip`, `.input`, `.select`, `.textarea`, `.btn-small`, `.btn-secondary`, `.book-theme` in `theme.css`.
- Per-book theme: put `className="book-theme"` + `style={bookThemeStyle(book.themeHue)}` on an element; inside it use `--book-bg`, `--book-accent`, `--book-strong`.
- Tests: `tests/library.test.ts` (filter/sort), `tests/LibraryPage.test.tsx` (empty state, renders books + opens detail + changes status, status filter, manual add).

### Phase 5 — Scanner
- `src/lib/barcode.ts`: `startScanner(video, onIsbn)` → `{ stop }`; rejects with `'denied' | 'unavailable' | 'insecure'`. Back camera via `facingMode: { ideal: 'environment' }`. Only valid ISBN-13s reach `onIsbn`. `createScanGate(3000)`: the same ISBN is accepted at most once per 3 s.
- `src/components/Scanner.tsx`: video + rounded cutout frame with pink corner brackets + helper text "Hold the barcode inside the frame ♡"; friendly messages for denied/no camera/not HTTPS; `active` prop starts/stops the camera; `flashKey` flashes the frame pink.
- `src/pages/ScanPage.tsx`: scan → vibrate(80) + flash → `addByIsbn` → confirmation card (cover, title, author) with **Undo** for 5 s + heart confetti; duplicate → toast "Already in your library ♡" with **Open**; not found → "Add it by hand" sheet pre-filled with the ISBN; offline → friendly offline toast + manual sheet. Batch toggle. Backup: **Type ISBN** (`IsbnLookup`) and **Search by title** (`TitleSearch`).
- `src/components/HeartConfetti.tsx`: 12 CSS hearts, 1.2 s; hidden with reduced motion. Also plays when adding from the Library page.
- `searchByTitle()` + `parseTitleSearch()` in `src/lib/lookup.ts`.
- Tests: `tests/barcode.test.ts` (3-second gate, camera error mapping), title search in `tests/lookup.test.ts` (fixture `openlibrary-search-book-lovers.json`).
- **End-to-end check done in headless Chromium** with a fake camera showing a generated EAN-13 barcode (9780593334836) and mocked API answers: ZXing read the code, the book was saved with Undo, a second scan showed the duplicate toast, and Open jumped to the book in the Library.

## Known risks / to verify on a real phone

- **Cover CORS:** covers are fetched with `fetch()` so the Blob can be stored. If a cover host doesn't send CORS headers, the download fails and the book falls back to the title hue and no stored cover. Check in Phase 5 with real scans.
- **Google Books without an API key** has a shared anonymous quota and sometimes answers 429. That is handled (treated as "not found"), but lookups may then rely on Open Library alone.
- **Camera on iPhone**: only tested in desktop Chromium with a fake camera. Needs a real test in iOS Safari (HTTPS link, allow camera, scan a few books). Focus on small barcodes can be slow on some phones — hold the book 15–25 cm away.
- **BarcodeDetector path** (Android Chrome) is untested here — the test browser on Linux has no BarcodeDetector, so ZXing was used.

## How to make common changes

- **Add/adjust a mood:** edit `MOODS` in `src/data/moods.ts` (keywords are lowercase, matched as substrings). Recommendation tests come in Phase 6.
- **Add a genre:** add a rule in `GENRE_RULES` in `src/data/genres.ts`; add a case to `tests/genres.test.ts`.
- **Change colors / look:** CSS variables in `src/styles/theme.css`.
- **Add an icon:** add a path string to `PATHS` in `src/components/Icon.tsx` (24×24 viewBox, stroke-only).
- **Change the database shape:** bump `this.version(n)` in `src/data/db.ts` with the new schema; never edit version 1 in place once real data exists on your phone.
