# ShelfScan

A cute, pastel, phone-first app for your own bookshelf. Scan a book's barcode to add it, sort and filter your library, and when you don't know what to read, tap a mood and get suggestions from your unread pile.

- Free: no accounts, no backend, no API keys.
- Private: your library lives only on your device (IndexedDB). Export a backup in Settings now and then.
- Installable: add it to your home screen, and the library works offline.

Book data comes from [Open Library](https://openlibrary.org), [Google Books](https://books.google.com), the [Deutsche Nationalbibliothek](https://www.dnb.de) and [Wikipedia](https://www.wikipedia.org).

## Run it locally

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install        # once
npm run dev        # start the dev server
```

Open the URL it prints (usually http://localhost:5173).

Other commands:

```bash
npm test           # run the tests (no network needed)
npm run lint       # eslint + type check
npm run build      # production build into dist/
npm run preview    # serve the production build
```

## Open it on your phone

**Same Wi-Fi (quickest, but no camera):** run `npm run dev`. It prints a `Network:` address like `http://192.168.1.20:5173`. Open that on your phone. Everything works except the camera, because browsers only allow the camera on `https://` pages (or `localhost`). You can still use "Type ISBN" and "Search by title".

**With the camera, through a free tunnel:** give the dev server a temporary HTTPS address, for example with [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) (no account needed):

```bash
npm run dev
# in a second terminal:
npx cloudflared tunnel --url http://localhost:5173
```

Open the `https://….trycloudflare.com` link it prints on your phone and allow camera access. If Vite answers "Blocked request. This host is not allowed", add `server: { allowedHosts: ['.trycloudflare.com'] }` to `vite.config.ts`.

**Easiest:** use the deployed version (below). It's always HTTPS.

### Install it like an app

- **iPhone (Safari):** Share button → **Add to Home Screen**.
- **Android:** tap **Install** on the Shelf page or **Settings → Install ShelfScan**. Or in Chrome: menu ⋮ → **Install app**; in Samsung Internet: menu ☰ → **Add page to → Home screen**.

## Deploy for free on Cloudflare

This repo is set up for **Cloudflare Workers** with static assets (`wrangler.jsonc` serves the `dist/` folder). A tiny Worker script (`worker/index.ts`) also forwards book lookups to the German national library, which browsers can't call directly.

1. Make a free account at [dash.cloudflare.com](https://dash.cloudflare.com).
2. **Workers & Pages → Create → Import a repository**, then connect GitHub and choose this repo. If the repo isn't listed, allow the "Cloudflare Workers and Pages" GitHub app to access it (GitHub → Settings → Applications).
3. Settings:
   - Production branch: `main`
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Root directory: `/`
4. Deploy. Your app is at `https://bookmood.<your-subdomain>.workers.dev`. If the dashboard says "No URLs", turn on **workers.dev** under **Settings → Domains & Routes**.

The Worker's name in the dashboard must match `"name"` in `wrangler.jsonc` (`bookmood`).

**Optional — Google Books:** Google no longer answers book lookups without an API key. A free key (Google Cloud Console → enable *Books API* → create an API key, restricted to the Books API) goes into the Worker as a secret: **Settings → Variables and Secrets → Add → Secret**, name `GOOGLE_BOOKS_KEY`. The key stays in Cloudflare; it is never part of the app or this repo. Without it the app uses Open Library, the DNB and Wikipedia.

From then on, every push to `main` redeploys automatically. Other branches get their own preview links. **Settings → "Version built …"** in the app shows which build your phone has.

### Cloudflare Pages instead

It also works as a plain static site: connect the repo under **Pages**, choose build command `npm run build` and output directory `dist`, and leave the deploy command empty. Netlify and GitHub Pages work the same way. Routing uses `#/…` URLs, so no server rewrites are needed. On a plain static host the German national library lookup is skipped (it needs the Worker); everything else works.

## How it's built

Vite + React + TypeScript (strict), Dexie for IndexedDB, ZXing (plus the native `BarcodeDetector` where available) for scanning, `vite-plugin-pwa` for offline use, and plain CSS with variables. Fonts are bundled: Fredoka, Quicksand and Caveat.

- `CLAUDE.md`: the original spec.
- `PROGRESS.md`: what's built, the design decisions, and how to change common things (moods, genres, colors, icons).
- Regenerate the app icons with `python3 scripts/make-icons.py` (needs Pillow).
- "Read the back cover" uses [Tesseract.js](https://tesseract.projectnaptha.com/) on the phone. Its files are copied into `public/ocr/` by `scripts/copy-ocr.mjs`, which runs automatically before `npm run dev` and `npm run build`.
