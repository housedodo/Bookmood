import { lookupWikipedia, normalizeTitle, parseWikipediaSearch } from '../src/lib/wikipedia';
import bookLovers from './fixtures/wikipedia-book-lovers.json';

describe('Wikipedia', () => {
  it('normalizes titles', () => {
    expect(normalizeTitle('Book Lovers (novel)')).toBe('book lovers');
    expect(normalizeTitle('Die Mitternachtsbibliothek (Roman)')).toBe('die mitternachtsbibliothek');
    expect(normalizeTitle('Ice & Ember!')).toBe('ice ember');
  });

  it('picks the page with the same title that names the author, skipping disambiguation pages', () => {
    const summary = parseWikipediaSearch(bookLovers, 'en', 'Book Lovers', ['Emily Henry']);
    expect(summary?.description).toMatch(/^Book Lovers is a 2022 romance novel/);
    expect(summary?.shortDescription).toBe('2022 romance novel by Emily Henry');
    expect(summary?.url).toBe('https://en.wikipedia.org/wiki/Book_Lovers_(novel)');
  });

  it('rejects pages for a different author or title', () => {
    expect(parseWikipediaSearch(bookLovers, 'en', 'Book Lovers', ['Someone Else'])).toBeNull();
    expect(parseWikipediaSearch(bookLovers, 'en', 'Beach Read', ['Emily Henry'])).toBeNull();
    expect(parseWikipediaSearch(bookLovers, 'en', 'Book Lovers', [])).toBeNull();
  });

  it('tries the second language when the first finds nothing', async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      calls.push(url.slice(8, 10));
      return new Response(JSON.stringify(url.startsWith('https://en.') ? bookLovers : { batchcomplete: '' }));
    };
    const summary = await lookupWikipedia('Book Lovers', ['Emily Henry'], true, { fetchImpl });
    expect(calls).toEqual(['de', 'en']);
    expect(summary?.url).toContain('en.wikipedia.org');
  });
});
