import { fetchJson, type LookupOptions } from './http';

// Wikipedia: free, no key, CORS allowed with origin=*. Used only to find a description for
// books that still have none. To avoid picking the wrong page, a page is only accepted when
// its title is the book's title and its intro names the author.

export interface WikipediaSummary {
  description: string;
  /** Wikipedia's one-line description, e.g. "2022 romance novel by Emily Henry". */
  shortDescription?: string;
  url: string;
}

export const wikipediaSearchUrl = (lang: 'en' | 'de', title: string, author: string) =>
  `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1` +
  `&generator=search&gsrsearch=${encodeURIComponent(`${title} ${author}`)}&gsrlimit=3` +
  `&prop=extracts|pageprops&exintro=1&explaintext=1&exlimit=3&ppprop=disambiguation|wikibase-shortdesc`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Lowercase, no accents/punctuation, no "(novel)" / "(Roman)" suffix. */
export function normalizeTitle(title: string): string {
  return title
    .replace(/\s*\([^)]*\)\s*$/, '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const surname = (author: string) => author.trim().split(/\s+/).pop() ?? '';

/** Picks the matching page from a search answer, or null. */
export function parseWikipediaSearch(data: unknown, lang: 'en' | 'de', title: string, authors: string[]): WikipediaSummary | null {
  if (!isRecord(data) || !isRecord(data.query) || !isRecord(data.query.pages) || !authors.length) return null;
  const wanted = normalizeTitle(title);
  const lastNames = authors.map(surname).filter((name) => name.length > 1).map((name) => name.toLowerCase());

  const pages = Object.values(data.query.pages)
    .filter(isRecord)
    .sort((a, b) => Number(a.index ?? 99) - Number(b.index ?? 99));

  for (const page of pages) {
    const pageTitle = typeof page.title === 'string' ? page.title : '';
    const extract = typeof page.extract === 'string' ? page.extract.trim() : '';
    const props = isRecord(page.pageprops) ? page.pageprops : {};
    if ('disambiguation' in props || extract.length < 80) continue;
    if (normalizeTitle(pageTitle) !== wanted) continue;
    if (!lastNames.some((name) => extract.toLowerCase().includes(name))) continue;
    return {
      description: extract.slice(0, 3000),
      shortDescription: typeof props['wikibase-shortdesc'] === 'string' ? props['wikibase-shortdesc'] : undefined,
      url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`,
    };
  }
  return null;
}

/** Tries English and German Wikipedia (German first for German books). Never throws. */
export async function lookupWikipedia(
  title: string,
  authors: string[],
  preferGerman: boolean,
  options: LookupOptions = {},
): Promise<WikipediaSummary | null> {
  if (!authors.length) return null;
  const languages: ('en' | 'de')[] = preferGerman ? ['de', 'en'] : ['en', 'de'];
  for (const lang of languages) {
    const data = await fetchJson(wikipediaSearchUrl(lang, title, surname(authors[0])), options);
    const summary = parseWikipediaSearch(data, lang, title, authors);
    if (summary) return summary;
  }
  return null;
}
