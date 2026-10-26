import { lookup, searchByTitle, type LookupOptions } from '../src/lib/lookup';
import searchFixture from './fixtures/openlibrary-search-book-lovers.json';
import olBook from './fixtures/openlibrary-9780593334836.json';
import olEmpty from './fixtures/openlibrary-empty.json';
import gbBook from './fixtures/googlebooks-9780593334836.json';
import gbEmpty from './fixtures/googlebooks-empty.json';

const ISBN = '9780593334836';

/** Fake fetch that answers Open Library and Google Books requests with the given JSON. */
function fakeFetch(openLibrary: unknown, googleBooks: unknown): typeof fetch & { calls: string[] } {
  const calls: string[] = [];
  const impl = async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const body = url.includes('openlibrary.org') ? openLibrary : googleBooks;
    return new Response(JSON.stringify(body), { status: 200 });
  };
  return Object.assign(impl, { calls }) as typeof fetch & { calls: string[] };
}

describe('lookup', () => {
  it('uses Open Library and fills the description from Google Books', async () => {
    const fetchImpl = fakeFetch(olBook, gbBook);
    const result = await lookup(ISBN, { fetchImpl });

    expect(result).toMatchObject({
      isbn13: ISBN,
      title: 'Book Lovers',
      authors: ['Emily Henry'],
      pageCount: 377,
      source: 'openlibrary',
    });
    expect(result?.subjects).toContain('Love stories');
    expect(result?.subjects).toContain('Fiction / Romance / Contemporary');
    expect(result?.description).toMatch(/literary agent/);
    expect(result?.coverUrls[0]).toBe(`https://covers.openlibrary.org/b/isbn/${ISBN}-L.jpg?default=false`);
    expect(result?.coverUrls).toContain(
      'https://books.google.com/books/content?id=2E1KEAAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
    );
  });

  it('still returns the Open Library result when Google Books has nothing', async () => {
    const result = await lookup(ISBN, { fetchImpl: fakeFetch(olBook, gbEmpty) });
    expect(result).toMatchObject({ title: 'Book Lovers', source: 'openlibrary' });
    expect(result?.description).toBeUndefined();
  });

  it('falls back to Google Books when Open Library is empty', async () => {
    const result = await lookup(ISBN, { fetchImpl: fakeFetch(olEmpty, gbBook) });
    expect(result).toMatchObject({
      title: 'Book Lovers',
      authors: ['Emily Henry'],
      pageCount: 385,
      source: 'googlebooks',
      subjects: ['Fiction / Romance / Contemporary'],
    });
  });

  it('returns null when both are empty', async () => {
    expect(await lookup(ISBN, { fetchImpl: fakeFetch(olEmpty, gbEmpty) })).toBeNull();
  });

  it('returns null on network errors and bad status codes', async () => {
    const failing: typeof fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    expect(await lookup(ISBN, { fetchImpl: failing })).toBeNull();

    const notFound: typeof fetch = async () => new Response('nope', { status: 500 });
    expect(await lookup(ISBN, { fetchImpl: notFound })).toBeNull();
  });

  it('handles a timeout by moving on to the next source', async () => {
    const options: LookupOptions = {
      timeoutMs: 20,
      fetchImpl: (input, init) => {
        if (String(input).includes('googleapis')) {
          return Promise.resolve(new Response(JSON.stringify(gbBook), { status: 200 }));
        }
        // Open Library never answers; only the abort signal ends this request.
        return new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        });
      },
    };
    expect(await lookup(ISBN, options)).toMatchObject({ source: 'googlebooks' });
  });
});

describe('searchByTitle', () => {
  it('parses Open Library search results', async () => {
    const fetchImpl: typeof fetch = async () => new Response(JSON.stringify(searchFixture), { status: 200 });
    const results = await searchByTitle('book lovers', { fetchImpl });
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      key: '/works/OL24337047W',
      title: 'Book Lovers',
      authors: ['Emily Henry'],
      isbn13: '9780593334836',
      year: 2022,
      coverUrl: 'https://covers.openlibrary.org/b/id/12364437-S.jpg',
    });
    expect(results[1].isbn13).toBeUndefined(); // only an ISBN-10
    expect(results[2].authors).toEqual([]);
  });

  it('returns [] for empty queries and failures', async () => {
    const failing: typeof fetch = async () => {
      throw new TypeError('offline');
    };
    expect(await searchByTitle('  ', { fetchImpl: failing })).toEqual([]);
    expect(await searchByTitle('x', { fetchImpl: failing })).toEqual([]);
  });
});
