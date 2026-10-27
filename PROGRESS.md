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
| 6 | Pick page: MoodPicker, `recommend.ts` + tests, results | ✅ done |
| 7 | Settings (export/import), PWA, icons, polish, README | ✅ done |

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
- **Branches:** `main` = the app on the phone (Cloudflare's production branch, deploys to the `workers.dev` URL). Work happens on `claude/new-session-lujt8z` (gets Cloudflare *preview* URLs only); after a phase is approved, `main` is fast-forwarded to it.
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
- **Mood keywords match whole words only** ("war" doesn't match "award", "loss" doesn't match "glossy"). Title and tags count as strong (2 points) like subjects/genres; description-only matches count 1. A keyword found in both counts once, as 2.
- **Jitter** is ±0.5 by default (`jitter` option, 0 turns it off for tests). It can reorder books whose scores are within 1 point, never more.
- **Books without a page count are kept** when a max length is chosen (their length is unknown, so they aren't "over").
- **"Not now"** hides a book until the app is reopened (in-memory set in `src/lib/session.ts`).
- **"Show another"** excludes everything already shown this round and re-rolls; when nothing is left it says "That's every match for this mood ♡" with **Start over**. Changing moods or length starts a new round.
- **Mood buttons keep their emojis** (they are the point of the button); everything else stays emoji-light.
- **Build time in Settings** ("Version built …") shows which deploy the phone has.
- **Non-ISBN barcodes are no longer ignored silently** (spec §8.2 said silently). Real-world case: a bookshop price sticker (Moser Graz) covered the ISBN barcode and nothing happened. The scanner now also reads EAN-8, UPC-A and Code 128, and when it sees a barcode that isn't an ISBN it shows "That's not a book barcode — maybe a shop sticker?" with what to do. There's also a permanent tip that the ISBN is printed on the copyright page inside the book.
- **Delete all data** uses two in-page confirm steps instead of browser popups.
- **CSV**: lists joined with "; ", dates as ISO, UTF-8 with BOM (so Excel shows accents/emojis), manual "ISBNs" left empty.
- **JSON import** also skips broken entries (no title/ISBN) and counts them as skipped; a non-backup file shows a friendly error.
- **Scan page is lazy-loaded**, so ZXing (~400 kB) isn't downloaded until you open the Scan tab. It is still precached for offline use.
- **Offline wording**: when offline, the manual-add sheet says "You're offline — I'll need internet to find that book. You can add it manually!" instead of "couldn't find".
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
- *(Phase 4 history; the Library has since been redesigned — see "Clean redesign" and "One way to add books" below.)*
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

### Phase 6 — Pick page
- `src/lib/recommend.ts` (pure): `recommend(books, moodIds, { maxPages?, excludeIds?, seed?, jitter? })` → up to 5 `{ book, score, matched, reason }` with `reason = "Matches: romance, rivals"`; `scoreBook`, `surprise`, `seededRandom` (mulberry32).
- `src/components/MoodPicker.tsx`: ~100×100 rounded buttons cycling pink/lavender/peach/mint, multi-select, selected = thick pink border + bounce.
- `src/components/PickResult.tsx`: themed result card (cover, title, author, pages, reason in Caveat) with **Start reading** (→ status `reading`, confetti, toast with Open) and **Not now**. Tapping the card opens the book in the Library.
- `src/pages/PickPage.tsx`: title "What are you in the mood for?", MoodPicker, Max length chips (Any / Short < 250 / Medium ≤ 450), results, **Show another**, **Surprise me** (random unread book), "Just surprise me" before any mood is picked, spec's friendly no-match message, empty-shelf and all-read states.
- Tests: `tests/recommend.test.ts` (every spec checklist item + whole-word matching + jitter bound), `tests/MoodPicker.test.tsx`, `tests/PickPage.test.tsx`.

### Phase 7 — Settings, PWA, polish
- `src/lib/exportImport.ts`: `exportJson` (full backup, covers as base64 data URLs, `format: "shelfscan-backup"`, `version: 1`), `exportCsv` (title, authors, isbn13, pages, genres, status, rating, tags, dateAdded), `importJson` (merge by isbn13, skip duplicates → `{ added, skipped }`), `downloadFile`.
- `src/pages/SettingsPage.tsx`: Export backup (JSON), Export spreadsheet (CSV), Import backup (summary toast "Added 12, skipped 3 ♡"), Delete all data with double confirm, About ("Made with 💗 — all your data lives only on this device.") and build time.
- PWA (`vite.config.ts`): `vite-plugin-pwa`, `registerType: 'autoUpdate'`, name/short_name ShelfScan, theme `#FFB3CE`, background `#FFF5F8`, standalone, portrait. Workbox precaches the app shell and the bundled fonts; lookups stay network-only.
- Icons: `public/icons/` (192, 512, maskable 512, apple-touch 180, favicon 64), generated by `scripts/make-icons.py` (pink rounded square, white open book, little heart). `index.html` has the iOS home-screen meta tags.
- Reduced motion: the global rule in `theme.css` switches off animations/transitions; confetti is hidden completely.
- `README.md`: run locally, open on the phone (same Wi-Fi or a free Cloudflare tunnel for the camera), install to the home screen, deploy to Cloudflare.
- Tests: `tests/exportImport.test.ts`.
- **Browser check done** (headless Chromium, 390px): service worker installs; manifest correct; after going offline and reloading, the library still shows its books and the Scan page loads; the offline lookup message shows; JSON + CSV export download; double-confirm delete; import shows "Added 1, skipped 0", re-import "Added 0, skipped 1".

### After Phase 7 — Richer book info & German support
- **Open Library work record** (`lookup.ts`): after the edition lookup, `fetchOpenLibraryWork(editionKey)` follows edition → work (`/books/OL…M.json` → `/works/OL…W.json`) and merges the work's `subjects`, `subject_places`, `subject_times` and `description`. Machine tags like `nyt:…` and very long subjects are dropped. Google Books is now only asked when there's still no description.
- **Automatic trope tags** (`src/data/tropes.ts`): ~23 tags (enemies to lovers, rivals to lovers, friends to lovers, fake dating, second chance, grumpy sunshine, forced proximity, slow burn, forbidden love, love triangle, small town, found family, sports, coming of age, grief, dark academia, romantasy, christmas, royalty, mafia, time travel, witches, vampires), English + German patterns. `deriveTags(subjects, description, hiddenTags)` runs on every add and refresh. Tags count as strong (2 points) in mood scoring.
- **Removed tags stay removed**: deleting a tag in the detail sheet stores it in `book.hiddenTags` (new optional field; included in JSON backups), so refresh won't add it back. Typing the tag again un-hides it.
- **German**: every mood got German keywords; genres got German names (Liebesroman, Krimi, Jugendbuch, Ratgeber, Lyrik…). Matching (`src/lib/text.ts`) is umlaut-aware; a trailing `*` matches word starts for compounds (`liebes*` → Liebesroman). The Pick reason shows the real word found ("Matches: liebesgeschichte, kleinstadt").
- **Moods gained trope keywords** (romantasy, fake dating, second chance*, slow burn…) — the spec's lists are still there, extended.
- **Refresh book info** (`src/lib/refresh.ts`): `refreshBook` re-runs the lookup and only *adds* (subjects, genres, auto tags) or fills gaps (description, pages, authors, cover if missing); never touches title, your tags, notes, rating, status. Hand-added books just get tags/genres from what was typed. `refreshAll` goes one book at a time with a 300 ms pause, stops when offline. Buttons: **Refresh book info** in each book's sheet, **Refresh all books** in Settings with progress ("Refreshing… 12 / 40") and a summary toast.
- Tests: `tests/refresh.test.ts`, `tests/text.test.ts`, work-record cases in `tests/lookup.test.ts`. Fixtures `openlibrary-edition-OL32334186M.json`, `openlibrary-work-OL24337047W.json` are hand-written in the real API shape.
- **Browser check done**: a book with only "Literary agents" as subject didn't match Romance; after **Refresh all books** it showed "Matches: romance, love stories, enemies to lovers, rivals, rivals to lovers, second chance". A German hand-added book matched Romance via "liebesgeschichte".

### Fixes from real use (No One Saw a Thing, 9781804990780)
- **Subtitles are no longer glued onto the title.** Lookups often return marketing subtitles ("The Twisty and Unputdownable New Crime Thriller from…"). `Book.subtitle` (new optional field) stores it separately; it's **not shown**, but counts for mood matching and auto tags (strong, 2 points). **Refresh** shortens titles that older versions saved as "Title: subtitle" (only if the title still exactly matches that old form, so edited titles are left alone).
- **Edit** button in the book sheet (title, authors, pages) for when the online data is wrong.
- **"Book info" panel** in the book sheet: source, number of subjects, description yes/no, "show subjects". When almost nothing was found (fewer than 2 subjects+genres and no description), a hint suggests adding a few tags yourself.
- Why "no tags": automatic tags only appear when the subjects/description mention a trope. For new UK/German releases Open Library often has only title + author, and Google Books (no API key) may be rate-limited — then there's nothing to derive tags from.

### More mood sources: DNB, Wikipedia, one-tap moods
- **Lookup order now** (`lookup.ts`): Open Library (+ work record) → Google Books if no description → **Deutsche Nationalbibliothek** for German-language ISBNs (978-3…) or when info is still thin (no description or < 3 subjects) → **Wikipedia** if there's still no description. Each step that contributes is recorded in `infoSources` (new optional `Book.infoSources`), shown in the Book info panel ("From Open Library + Wikipedia").
- **DNB** (`src/lib/dnb.ts`): SRU search by ISBN, MARC21-xml parsed with `DOMParser`: title (245 $a, non-sorting ¬markers removed), subtitle (245 $b), authors (100 / 700 aut, "Last, First" → "First Last"), pages (300 "398 Seiten"), subjects from GND headings (650, 689), genre/form (655, minus "Fiktionale Darstellung") and publisher keywords (653; "(VLB-WN)…/Belletristik/Liebesromane" → "Liebesromane"; "(Produktform)…" dropped). The publisher's blurb ("Inhaltstext", link in 856) is fetched from `d-nb.info/<id>/04` and used as the description.
- **Worker proxy** (`worker/index.ts`, `wrangler.jsonc` now has `"main"` and `run_worker_first: ["/api/*"]`): the DNB sends no CORS headers, so `/api/dnb?isbn=` and `/api/dnb-text?id=` are forwarded by the app's own Cloudflare Worker (free tier). Only those two DNB addresses with validated parameters are allowed — not an open proxy. Answers are cached for a day. The client tries the proxy first, then DNB directly (which fails in a normal browser but keeps tests/dev honest). In `npm run dev` there is no Worker, so DNB lookups only work on the deployed site.
- **Wikipedia** (`src/lib/wikipedia.ts`): one request per language (`generator=search` + `extracts|pageprops`), English first (German first for 978-3 books). A page is only used if its title (minus "(novel)"/"(Roman)") equals the book title **and** its intro names the author's surname; disambiguation pages are skipped. The intro becomes the description; Wikipedia's short description ("2022 romance novel by Emily Henry") is added as a subject. Wikidata-by-ISBN was dropped: Wikidata stores ISBNs with hyphens whose positions vary by publisher, so an exact lookup isn't reliable.
- **One-tap moods** (`src/components/MoodChips.tsx`, new optional `Book.moods`): mood chips on the "added to your shelf" card ("How does it feel? (optional)") and in every book sheet ("What mood is this book?" / "How did it feel?" once read). A mood you picked is worth **5 points** (`YOUR_MOOD_POINTS`), more than a handful of keyword matches, and the reason says "You said: Cozy · Matches: …". Books with no online data at all can still be suggested this way. (Moods on books you've read are kept but don't change picks, since only unread books are suggested.)
- Export/import includes `moods` and `infoSources`; `source` can now be `dnb`.
- Tests: `tests/dnb.test.ts`, `tests/wikipedia.test.ts`, `tests/worker.test.ts`, chain cases in `tests/lookup.test.ts`, mood cases in `tests/recommend.test.ts`. Fixtures (hand-written in the real formats): `dnb-9783426000007.xml`, `dnb-empty.xml`, `dnb-text-1300000001.html`, `wikipedia-book-lovers.json`.
- **Browser check done**: a German ISBN that Open Library and Google don't know was found via DNB (proxy simulated) with the blurb as description and auto tags; tapping Cozy on the scan card made it the Cozy pick with "You said: Cozy · Matches: small town, kleinstadt, dorf, café, herzerwärmende". `wrangler deploy --dry-run` accepts the new config.

### Finding the mood before you've read the book
Most books are scanned *before* reading, so the reader can't tag the mood. The app has to read it from what a shop customer would read: the blurb and the subtitle.
- **A. Blurb vocabulary** (`moods.ts`): every mood got a fourth line of English + German words that back covers and subtitles use (twisty, gripping, page-turner, unputdownable · spannend, fesselnd · heartbreaking · herzzerreißend · hilarious · chilling · eerie…). A word found by two keywords ("verlieben" / "verliebe*") counts once per mood. *No One Saw a Thing* now scores 8 for Mysterious from its subtitle alone.
- **B. Read the back cover from a photo** (`src/lib/ocr.ts`, `src/components/BlurbPhoto.tsx`): Tesseract.js (English + German) runs **on the phone**. The photo is shrunk to 1600 px and grayed, read, then cleaned (`cleanOcrText`: joins hyphenated line breaks, drops barcode digits/prices/noise). You see the text, can fix it, then **Save** stores it in the new optional `Book.blurb` (shown as "From the back cover"); it counts like the description for moods and automatic tags. Offered on the scan card when the mood is unknown and always in the book sheet's Book info section.
  - **Self-hosted, no CDN**: `scripts/copy-ocr.mjs` (runs before `dev`/`build`) copies the worker, three core variants and `eng`/`deu` "best_int" language files into `public/ocr/` (gitignored; npm packages `tesseract.js`, `@tesseract.js-data/eng`, `@tesseract.js-data/deu`). ~16 MB, downloaded only on first use and then kept (service-worker cache `ocr` for the code; Tesseract caches the language files in IndexedDB), so later it works offline. Not precached.
  - **Spec deviation**: spec §16 lists "scanning covers or spines" as out of scope — that was about *identifying* books; this only reads the blurb of a book already identified by its barcode, at the user's request.
  - Browser check done: a generated, slightly blurred and rotated back-cover photo was read in 2.8 s (desktop Chromium) with perfect text; barcode digits and price were dropped; after saving, the book became the top Mysterious pick ("Matches: twisty, gripping, page-turner, unputdownable, secrets, vanish").
- **C. Books with unknown mood are never invisible**: `moodUnknown(book)` (`src/lib/moodInfo.ts`) = the book matches no mood at all (all moods scored, including your own moods). Pick shows a dashed row "I can't tell the mood of these N books yet" with their covers (tap → book sheet). The Library has a **Mood unknown (N)** filter chip (only shown when N > 0). The book sheet's hint uses the same check.
- **D. Quieter mood chips on the scan card**: folded behind "Know the mood already?". If the mood is unknown, the card instead offers "Not much info found, so I can't tell its mood yet. Snap the back cover?" with the photo button.
- Tests: `tests/ocr.test.ts` (text clean-up, moodUnknown, auto tags from blurb), blurb-language + blurb + once-per-mood cases in `tests/recommend.test.ts`, unknown-mood row in `tests/PickPage.test.tsx`, filter in `tests/library.test.ts`.

### Genre chips in the Library
- The genre dropdown is replaced by a sideways-scrolling row of genre chips with counts ("Romance 3"), most common first. One genre at a time; tapping the selected chip again (or "All genres") shows everything. Sort keeps its dropdown, now full width. `libraryGenres()` returns `{ genre, count }[]`.
- Genres are now also taken from the **subtitle** (on add and on refresh), so "…New Crime Thriller…" gives Thriller + Crime.

### Safeguards after a lost library on iPhone (Safari)
Nothing in the code deletes data except Settings → Delete all (double confirm), and the database schema is still version 1. The likely causes are iOS storage rules: Safari's 7-day deletion of website data, and separate storage for Safari vs. the Home Screen app vs. each different URL.
- `src/lib/safety.ts`: `requestPersistentStorage()` runs once on start (`main.tsx`; no popup on iOS/Chrome); `isStoragePersisted()`, `isInstalledApp()`, `isIos()`; last-backup time and reminder snooze in localStorage (`shelfscan:lastBackupAt`, `shelfscan:backupReminderSnoozedUntil`); `booksSinceBackup`, `shouldRemindBackup` (≥ 3 books added since the last backup, unless snoozed for 3 days).
- `exportBackupNow()` (exportImport.ts) downloads the JSON backup and records the time; used by Settings and the reminder.
- **Settings → "Keep your books safe"** (mint card): last backup time, storage protected/not + "Protect my books", and — in Safari on iPhone — a warning about the 7-day rule with how to move to the Home Screen app.
- **Library → backup banner** (`BackupReminder.tsx`): "N books aren't in a backup yet" with **Back up now** / **Later**.
- Tests: `tests/safety.test.ts`.

### Search by author
- The Scan page's backup search is now **Search by title or author** (`BookSearch.tsx`, replaces `TitleSearch.tsx`) with Title / Author chips. Author search uses Open Library `search.json?author=…` (up to 30 results); picking a result works like before (lookup by its first ISBN-13, or the manual form pre-filled with title + author when it has none). `searchBooks(query, by)` in `lookup.ts`; `searchByTitle` remains as a shortcut.

### Clean redesign: one filter button + shelves (chosen from https://claude.ai/artifact/TbRze4kiHAh1XET3PDfwPt)
Goal: a calm phone screen with no clutter or extra buttons.
- **3 tabs**: Shelf · Scan · Pick (`TabBar.tsx`). Settings opens from the gear on the Shelf page and has a back button.
- **Library** (`LibraryPage.tsx`): header with **+** (add) and gear; a search field with **one filter button** (badge = number of active filters). With no search/filter the page shows **shelves** (`Shelves.tsx`): *Reading now* (cards), *Up next* (unread, swipeable covers) and *Finished* (small covers), each with **See all** (= filter by that status). Any search or filter switches to the grid of results; active filters show as removable pills ("Unread ×"). `activeFilters()` / `clearFilter()` in `library.ts`.
- **Filter & sort sheet** (`FilterBar.tsx`, now sheet content): Reading status, Genre (with counts), Length, Needs attention (Mood unknown), Sort by; **Show N books** + **Clear all**.
- **Backup reminder** is one quiet line ("7 books not backed up yet · Back up ×").
- **Book sheet** (`BookDetail.tsx`): Close left, **⋯ menu** right (`BookMenu.tsx`: Edit details, Read the back cover, Refresh book info, Book info & sources, Delete book). On screen only: cover, title, author · pages, hearts, status switch, **Feels** pills (your moods, else the best-matching detected moods via `bookMoods()`; "change" opens the mood chips), 3-line summary with **more** (`ClampText.tsx`), tag pills with "+ tag", and "+ add a little note…" (opens the notes box). Unknown mood shows one line: "Can't tell the mood yet · Read the back cover · set it". Delete asks inline. `Sheet` takes `actions` for this header layout; `BlurbPhoto` takes `openRef` so the menu can open the camera directly (iOS needs the file picker opened inside the tap).
- **Pick**: the unknown-mood box became one line linking to the Library filtered to those books (`/#/?unknown=1`).
- **Scan**: the permanent sticker tip is gone; it only appears when the camera actually sees a non-book barcode.
- Tests updated (filters via the sheet, Settings via the gear) and added: shelves + See all, ⋯ menu delete, filter pill removal, `ClampText`.

### Shelves fit the screen + Bookcase view
- **Up next / Finished** are now grids that wrap to the screen width (4 covers per row for Up next, 6 small ones for Finished; 6/9 on wider screens) and show **all** books — no sideways scrolling.
- **Bookcase** (`Bookcase.tsx`, `src/lib/bookcase.ts`, `bookcase.css`): a **Shelves | Bookcase** switch on the Shelf page (remembered per device via `src/lib/prefs.ts`). The bookcase shows every book as a spine in its pastel color on wooden shelves: spine width from the page count (`spineWidth`), slightly varying height per title (`spineHeight`, 112–144 px in 150 px rows), title written along the spine, a pink ribbon for "reading now" and a small ♥ for "read". Arrange by **Newest / Color / Author** (remembered). Tap a spine to open the book. The shelf planks are one repeating CSS gradient whose period (166 px) equals a row (150 px) + plank (16 px).
- Tests: `tests/bookcase.test.ts`, bookcase case in `tests/LibraryPage.test.tsx`.

### One way to add books: the Scan tab
- The Shelf page no longer has a **+** button or an "Add a book" sheet, and the empty shelf only offers **Scan a book**. Books come in through Scan: camera, **Type ISBN**, or **Search by title or author**. The hand-entry form (`ManualAddForm`) still opens on the Scan page when a book can't be found online (or a search result has no ISBN).
- Tests: the Library "add by hand" test became "has no add button"; `tests/ManualAddForm.test.tsx` covers the form directly.

### Books whose barcode isn't in any database (international editions)
Real-world case: "FOR INTERNATIONAL SALE" / "International Edition" copies (e.g. 979-8-217-30075-4, 978-1-6682-1677-4, 979-8-217-20871-5) have their own ISBNs that Open Library and Google Books usually don't know; the DNB only covers German books.
- When a scanned or typed ISBN isn't found, the Scan page sheet is now **"Not found online"**: it explains this and offers **title / author search** first, then the hand-entry form ("or fill it in yourself").
- Picking a search result runs `addWithInfoFrom(scannedIsbn, picked)` (`addBook.ts`): looks up the picked edition's ISBN, saves its info (title, authors, pages, description, subjects, genres, tags, cover — plus the search's own cover id as an extra candidate) but under the **scanned ISBN**, so rescanning the same copy says "Already in your library". The edition used is stored in the new optional `Book.infoIsbn`; **Refresh book info** looks that one up (`refresh.ts`). If the picked work has no ISBN-13 or its lookup fails, the hand form opens pre-filled with title + author + scanned ISBN.
- Tests: `tests/addBook.test.ts`. Browser check done with the first ISBN above (search answers simulated).

## Known risks / to verify on a real phone

- **Cover CORS:** covers are fetched with `fetch()` so the Blob can be stored. If a cover host doesn't send CORS headers, the download fails and the book falls back to the title hue and no stored cover. Check in Phase 5 with real scans.
- **Google Books without an API key** has a shared anonymous quota and sometimes answers 429 (this sandbox always gets 429 with a quota of 0). If many lookups on the phone fail, this may be why; a free Google API key (stored in the Worker, not the app) would fix it but goes against the "no API keys" rule — the user's call. That is handled (treated as "not found"), but lookups may then rely on Open Library alone.
- **Back-cover photo on a real phone**: speed (expect ~5–15 s on a phone; the first time also downloads ~16 MB) and accuracy with glossy covers, curved spines and small print. Tip: good light, phone held flat over the back cover, blurb filling most of the photo.
- **DNB through the Worker** is only testable on the deployed site (this sandbox can't reach the DNB). If a German book shows "From Open Library" only, check `https://<your-app>/api/dnb?isbn=<isbn>` in the browser — it should show XML.
- **Camera on iPhone**: only tested in desktop Chromium with a fake camera. Needs a real test in iOS Safari (HTTPS link, allow camera, scan a few books). Focus on small barcodes can be slow on some phones — hold the book 15–25 cm away.
- **BarcodeDetector path** (Android Chrome) is untested here — the test browser on Linux has no BarcodeDetector, so ZXing was used.

- **Home-screen install on iPhone**: iOS keeps a home-screen app's storage separate from Safari's. Books added in Safari don't appear in the installed app (and vice versa). Use export/import to move them, or just use the installed app.
- **Storage can be cleared** by the browser if the phone is low on space (rare for installed apps). The Settings page reminds you to export a backup.

## How to make common changes

- **Add/adjust a mood:** edit `MOODS` in `src/data/moods.ts` (whole-word match; end a keyword with `*` to match word starts, e.g. German compounds).
- **Add an automatic tag/trope:** add `{ tag, patterns }` to `TROPES` in `src/data/tropes.ts`; add a case to `tests/refresh.test.ts`. Existing books get it with **Refresh all books**. Recommendation tests come in Phase 6.
- **Add a genre:** add a rule in `GENRE_RULES` in `src/data/genres.ts`; add a case to `tests/genres.test.ts`.
- **Change colors / look:** CSS variables in `src/styles/theme.css`.
- **Add an icon:** add a path string to `PATHS` in `src/components/Icon.tsx` (24×24 viewBox, stroke-only).
- **Change the app icon:** edit `scripts/make-icons.py`, run it, commit the PNGs in `public/icons/`.
- **Change the database shape:** bump `this.version(n)` in `src/data/db.ts` with the new schema; never edit version 1 in place once real data exists on your phone.
