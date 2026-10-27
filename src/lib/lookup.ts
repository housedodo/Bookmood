import type { BookSource, InfoSource } from '../data/db';
import { isGermanIsbn, lookupDnb } from './dnb';
import { fetchJson, type LookupOptions } from './http';
import { lookupWikipedia } from './wikipedia';

export { fetchJson, type LookupOptions };

export interface LookupResult {
  isbn13: string;
  title: string;
  /** Often marketing text ("The twisty new crime thriller…"): not shown, but used for mood matching. */
  subtitle?: string;
  authors: string[];
  pageCount?: number;
  description?: string;
  subjects: string[];
  /** Candidate cover URLs, best first. */
  coverUrls: string[];
  source: Exclude<BookSource, 'manual'>;
  /** Every source that contributed something, for the "Book info" panel. */
  infoSources?: InfoSource[];
}

export const openLibraryUrl = (isbn: string) =>
  `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
export const googleBooksProxyUrl = (isbn: string) => `/api/google-books?isbn=${isbn}`;
export const googleBooksUrl = (isbn: string) =>
  `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
// default=false makes Open Library answer 404 instead of a blank image when there is no cover.
export const openLibraryCoverUrl = (isbn: string) =>
  `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;

// --- tiny helpers for reading untyped JSON safely ---

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const positiveInt = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(str).filter((s): s is string => s !== undefined) : [];

const names = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => (isObject(item) ? str(item.name) : undefined)).filter((s): s is string => s !== undefined) : [];

// --- Open Library ---

export function parseOpenLibrary(data: unknown, isbn13: string): LookupResult | null {
  if (!isObject(data)) return null;
  const book = data[`ISBN:${isbn13}`];
  if (!isObject(book)) return null;
  const title = str(book.title);
  if (!title) return null;

  const cover = isObject(book.cover) ? str(book.cover.large) ?? str(book.cover.medium) : undefined;
  const excerpt = Array.isArray(book.excerpts) && isObject(book.excerpts[0]) ? str(book.excerpts[0].text) : undefined;

  return {
    isbn13,
    title,
    subtitle: str(book.subtitle),
    authors: names(book.authors),
    pageCount: positiveInt(book.number_of_pages),
    description: excerpt,
    subjects: names(book.subjects),
    coverUrls: [openLibraryCoverUrl(isbn13), ...(cover ? [cover] : [])],
    source: 'openlibrary',
  };
}

/** The edition key ("/books/OL…M") from a jscmd=data answer, used to find the work record. */
export function openLibraryEditionKey(data: unknown, isbn13: string): string | undefined {
  if (!isObject(data)) return undefined;
  const book = data[`ISBN:${isbn13}`];
  const key = isObject(book) ? str(book.key) : undefined;
  return key?.startsWith('/books/') ? key : undefined;
}

export interface WorkInfo {
  subjects: string[];
  description?: string;
}

// Machine tags ("nyt:hardcover-fiction=2022-05-22") and very long entries don't help mood matching.
const usefulSubject = (subject: string) => !/^[a-z_]+:/i.test(subject) && subject.length <= 60;

/** Reads subjects (incl. places and time periods) and the description from a work record. */
export function parseOpenLibraryWork(data: unknown): WorkInfo {
  if (!isObject(data)) return { subjects: [] };
  const subjects = [...strings(data.subjects), ...strings(data.subject_places), ...strings(data.subject_times)].filter(usefulSubject);
  // The description is either a plain string or { type: "/type/text", value: "…" }.
  const description = str(data.description) ?? (isObject(data.description) ? str(data.description.value) : undefined);
  return { subjects: [...new Set(subjects)], description };
}

/**
 * The edition record only has a few subjects. The work behind it ("all editions of this book")
 * usually has many more, often including reader tropes, plus a description. Two small requests:
 * edition → work key → work.
 */
export async function fetchOpenLibraryWork(editionKey: string, options: LookupOptions = {}): Promise<WorkInfo> {
  const edition = await fetchJson(`https://openlibrary.org${editionKey}.json`, options);
  const works = isObject(edition) && Array.isArray(edition.works) ? edition.works : [];
  const workKey = isObject(works[0]) ? str(works[0].key) : undefined;
  if (!workKey?.startsWith('/works/')) return { subjects: [] };
  return parseOpenLibraryWork(await fetchJson(`https://openlibrary.org${workKey}.json`, options));
}

export function mergeWork(result: LookupResult, work: WorkInfo): LookupResult {
  return {
    ...result,
    description: result.description ?? work.description,
    subjects: [...new Set([...result.subjects, ...work.subjects])],
  };
}

// --- Google Books ---

export function parseGoogleBooks(data: unknown, isbn13: string): LookupResult | null {
  if (!isObject(data) || !Array.isArray(data.items) || !isObject(data.items[0])) return null;
  const info = data.items[0].volumeInfo;
  if (!isObject(info)) return null;
  const title = str(info.title);
  if (!title) return null;

  const links = isObject(info.imageLinks) ? info.imageLinks : {};
  const thumbnail = str(links.thumbnail) ?? str(links.smallThumbnail);

  return {
    isbn13,
    title,
    subtitle: str(info.subtitle),
    authors: strings(info.authors),
    pageCount: positiveInt(info.pageCount),
    description: str(info.description),
    // Google gives categories like "Fiction / Romance / Contemporary".
    subjects: strings(info.categories),
    coverUrls: thumbnail ? [thumbnail.replace(/^http:/, 'https:')] : [],
    source: 'googlebooks',
  };
}

/** Fills gaps in the primary result (description, pages, ...) with data from a second source. */
export function mergeResults(primary: LookupResult, extra: LookupResult | null): LookupResult {
  if (!extra) return primary;
  return {
    ...primary,
    subtitle: primary.subtitle ?? extra.subtitle,
    authors: primary.authors.length ? primary.authors : extra.authors,
    pageCount: primary.pageCount ?? extra.pageCount,
    description: primary.description ?? extra.description,
    subjects: [...new Set([...primary.subjects, ...extra.subjects])],
    coverUrls: [...new Set([...primary.coverUrls, ...extra.coverUrls])],
  };
}

/** True when mood matching would have little to work with. */
const needsMoreInfo = (result: LookupResult | null) => !result || !result.description || result.subjects.length < 3;

/**
 * Looks up a book. Never throws; null means "not found". Order:
 * 1. Open Library (edition, then its work record for more subjects and a description)
 * 2. Google Books, if there's still no description
 * 3. Deutsche Nationalbibliothek, for German-language books or when info is still thin
 * 4. Wikipedia, if there's still no description (only well-known books have a page)
 */
export async function lookup(isbn13: string, options: LookupOptions = {}): Promise<LookupResult | null> {
  const sources: InfoSource[] = [];

  const openLibraryData = await fetchJson(openLibraryUrl(isbn13), options);
  let result = parseOpenLibrary(openLibraryData, isbn13);
  const editionKey = openLibraryEditionKey(openLibraryData, isbn13);
  if (result) {
    sources.push('openlibrary');
    if (editionKey) result = mergeWork(result, await fetchOpenLibraryWork(editionKey, options));
  }

  if (!result?.description) {
    // Google allows no requests without a key, so the app's Worker adds one (if set up); direct is the fallback.
    const fromGoogle =
      parseGoogleBooks(await fetchJson(googleBooksProxyUrl(isbn13), options), isbn13) ??
      parseGoogleBooks(await fetchJson(googleBooksUrl(isbn13), options), isbn13);
    if (fromGoogle) {
      sources.push('googlebooks');
      result = result ? mergeResults(result, fromGoogle) : fromGoogle;
    }
  }

  if (isGermanIsbn(isbn13) || needsMoreInfo(result)) {
    const fromDnb = await lookupDnb(isbn13, options);
    if (fromDnb) {
      sources.push('dnb');
      result = result ? mergeResults(result, fromDnb) : fromDnb;
    }
  }

  if (result && !result.description) {
    const wiki = await lookupWikipedia(result.title, result.authors, isGermanIsbn(isbn13), options);
    if (wiki) {
      sources.push('wikipedia');
      result = {
        ...result,
        description: wiki.description,
        subjects: wiki.shortDescription ? [...new Set([...result.subjects, wiki.shortDescription])] : result.subjects,
      };
    }
  }

  return result ? { ...result, infoSources: sources } : null;
}

// --- Search by title (Open Library search) ---

export interface TitleSearchResult {
  key: string;
  title: string;
  authors: string[];
  /** First valid ISBN-13 of the work, if Open Library knows one. */
  isbn13?: string;
  year?: number;
  coverUrl?: string;
}

export type SearchBy = 'title' | 'author';

const SEARCH_FIELDS = 'key,title,author_name,isbn,first_publish_year,cover_i';

export const bookSearchUrl = (query: string, by: SearchBy) =>
  // An author usually has more books than one title has editions, so show more results.
  `https://openlibrary.org/search.json?${by}=${encodeURIComponent(query)}&limit=${by === 'author' ? 30 : 10}&fields=${SEARCH_FIELDS}`;

export const titleSearchUrl = (query: string) => bookSearchUrl(query, 'title');

const ISBN13 = /^97[89]\d{10}$/;

export function parseTitleSearch(data: unknown): TitleSearchResult[] {
  if (!isObject(data) || !Array.isArray(data.docs)) return [];
  return data.docs.filter(isObject).flatMap((doc) => {
    const title = str(doc.title);
    const key = str(doc.key);
    if (!title || !key) return [];
    const coverId = positiveInt(doc.cover_i);
    return [{
      key,
      title,
      authors: strings(doc.author_name),
      isbn13: strings(doc.isbn).find((isbn) => ISBN13.test(isbn)),
      year: positiveInt(doc.first_publish_year),
      coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-S.jpg` : undefined,
    }];
  });
}

/** Finds books by title or by author on Open Library. Returns [] on any failure. */
export async function searchBooks(query: string, by: SearchBy, options: LookupOptions = {}): Promise<TitleSearchResult[]> {
  if (!query.trim()) return [];
  return parseTitleSearch(await fetchJson(bookSearchUrl(query.trim(), by), options));
}

export function searchByTitle(query: string, options: LookupOptions = {}): Promise<TitleSearchResult[]> {
  return searchBooks(query, 'title', options);
}
