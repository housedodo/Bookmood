// Cloudflare Worker in front of the static app. It serves dist/ (via the ASSETS binding) and
// forwards a few book lookups the browser can't make well itself:
// - two DNB requests (the DNB sends no CORS headers),
// - Google Books by ISBN, with a free API key kept here as a secret (GOOGLE_BOOKS_KEY),
//   because Google allows zero requests without a key.
// Only these exact addresses are allowed, so this is not an open proxy.

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  /** Optional. Set in Cloudflare: Worker → Settings → Variables and Secrets. */
  GOOGLE_BOOKS_KEY?: string;
}

const DAY = 60 * 60 * 24;
const ISBN13 = /^97[89]\d{10}$/;

/** Maps an /api/… request to the URL it may fetch, or null if it isn't allowed. */
export function apiTarget(url: URL, env: Pick<Env, 'GOOGLE_BOOKS_KEY'> = {}): string | null {
  if (url.pathname === '/api/dnb') {
    const isbn = url.searchParams.get('isbn') ?? '';
    if (!ISBN13.test(isbn)) return null;
    return `https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&query=num%3D${isbn}&recordSchema=MARC21-xml&maximumRecords=1`;
  }
  if (url.pathname === '/api/dnb-text') {
    const id = url.searchParams.get('id') ?? '';
    if (!/^\d{8,10}X?$/.test(id)) return null;
    return `https://d-nb.info/${id}/04`;
  }
  if (url.pathname === '/api/google-books') {
    const isbn = url.searchParams.get('isbn') ?? '';
    if (!ISBN13.test(isbn) || !env.GOOGLE_BOOKS_KEY) return null;
    return `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${encodeURIComponent(env.GOOGLE_BOOKS_KEY)}`;
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    const target = request.method === 'GET' ? apiTarget(url, env) : null;
    if (!target) return new Response('Not found', { status: 404 });

    try {
      const upstream = await fetch(target, { headers: { Accept: 'application/json, application/xml, text/html' } });
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          'Content-Type': upstream.headers.get('Content-Type') ?? 'text/plain; charset=utf-8',
          // Book data rarely changes; a day of caching also saves Google quota.
          'Cache-Control': upstream.ok ? `public, max-age=${DAY}` : 'no-store',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch {
      return new Response('Upstream error', { status: 502 });
    }
  },
};
