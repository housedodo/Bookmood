// Cloudflare Worker in front of the static app. It serves dist/ (via the ASSETS binding) and
// forwards two DNB requests the browser may not make itself (no CORS headers at the DNB).
// Only these exact DNB addresses are allowed, so this is not an open proxy.

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

const DAY = 60 * 60 * 24;

/** Maps an /api/… request to the DNB URL it may fetch, or null if it isn't allowed. */
export function dnbTarget(url: URL): string | null {
  if (url.pathname === '/api/dnb') {
    const isbn = url.searchParams.get('isbn') ?? '';
    if (!/^97[89]\d{10}$/.test(isbn)) return null;
    return `https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&query=num%3D${isbn}&recordSchema=MARC21-xml&maximumRecords=1`;
  }
  if (url.pathname === '/api/dnb-text') {
    const id = url.searchParams.get('id') ?? '';
    if (!/^\d{8,10}X?$/.test(id)) return null;
    return `https://d-nb.info/${id}/04`;
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    const target = request.method === 'GET' ? dnbTarget(url) : null;
    if (!target) return new Response('Not found', { status: 404 });

    try {
      const upstream = await fetch(target, { headers: { Accept: 'application/xml, text/html' } });
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          'Content-Type': upstream.headers.get('Content-Type') ?? 'text/plain; charset=utf-8',
          'Cache-Control': `public, max-age=${DAY}`,
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch {
      return new Response('Upstream error', { status: 502 });
    }
  },
};
