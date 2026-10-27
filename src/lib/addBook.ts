import { addBook, findByIsbn, type Book } from '../data/db';
import { normalizeGenres } from '../data/genres';
import { deriveTags } from '../data/tropes';
import { getCoverTheme, hueFromTitle } from './cover';
import { lookup, type LookupResult, type TitleSearchResult } from './lookup';

export type AddByIsbnResult =
  | { kind: 'added'; book: Book }
  | { kind: 'duplicate'; book: Book }
  | { kind: 'notFound' }
  | { kind: 'offline' };

/** Saves a lookup result under `isbn13`; `infoIsbn` is set when the info came from another edition. */
async function saveResult(isbn13: string, result: LookupResult, infoIsbn?: string): Promise<AddByIsbnResult> {
  const { coverBlob, themeHue } = await getCoverTheme(result.coverUrls, result.title);
  try {
    const book = await addBook({
      isbn13,
      infoIsbn,
      title: result.title,
      subtitle: result.subtitle,
      authors: result.authors,
      pageCount: result.pageCount,
      description: result.description,
      subjects: result.subjects,
      genres: normalizeGenres([...result.subjects, result.subtitle ?? '']),
      tags: deriveTags([...result.subjects, result.subtitle ?? ''], result.description),
      coverBlob,
      themeHue,
      source: result.source,
      infoSources: result.infoSources,
    });
    return { kind: 'added', book };
  } catch {
    // Someone (e.g. a second scan) saved it while we were looking it up.
    const book = await findByIsbn(isbn13);
    return book ? { kind: 'duplicate', book } : { kind: 'notFound' };
  }
}

/** Looks up an ISBN-13 online and saves it to the library. Never throws. */
export async function addByIsbn(isbn13: string): Promise<AddByIsbnResult> {
  const existing = await findByIsbn(isbn13);
  if (existing) return { kind: 'duplicate', book: existing };

  const result = await lookup(isbn13);
  if (!result) return navigator.onLine ? { kind: 'notFound' } : { kind: 'offline' };
  return saveResult(isbn13, result);
}

export type AddFromSearchResult = AddByIsbnResult | { kind: 'needsManual'; title: string; authors: string[] };

/**
 * For a scanned ISBN no database knows (often an international edition): take the book's info
 * from the edition the reader picked in a title/author search, but keep the scanned ISBN, so the
 * same copy is recognised next time. Falls back to the hand-entry form, pre-filled. Never throws.
 */
export async function addWithInfoFrom(scannedIsbn: string, picked: TitleSearchResult): Promise<AddFromSearchResult> {
  const existing = await findByIsbn(scannedIsbn);
  if (existing) return { kind: 'duplicate', book: existing };

  const result = picked.isbn13 ? await lookup(picked.isbn13) : null;
  if (!result) return { kind: 'needsManual', title: picked.title, authors: picked.authors };

  // The search's own cover (by Open Library cover id) is a good extra candidate for this edition.
  const searchCover = picked.coverUrl?.replace(/-S\.jpg$/, '-L.jpg');
  const withCover = searchCover ? { ...result, coverUrls: [...result.coverUrls, searchCover] } : result;
  return saveResult(scannedIsbn, withCover, picked.isbn13 !== scannedIsbn ? picked.isbn13 : undefined);
}

export interface ManualBookInput {
  title: string;
  authors: string[];
  pageCount?: number;
  isbn13?: string;
  description?: string;
  genres: string[];
}

/**
 * Saves a hand-entered book. Books without an ISBN get a unique "manual:" key,
 * because isbn13 is the library's unique index.
 */
export async function addManualBook(input: ManualBookInput): Promise<AddByIsbnResult> {
  if (input.isbn13) {
    const existing = await findByIsbn(input.isbn13);
    if (existing) return { kind: 'duplicate', book: existing };
  }
  const book = await addBook({
    isbn13: input.isbn13 ?? `manual:${crypto.randomUUID()}`,
    title: input.title,
    authors: input.authors,
    pageCount: input.pageCount,
    description: input.description,
    subjects: input.genres,
    genres: normalizeGenres(input.genres),
    tags: deriveTags(input.genres, input.description),
    themeHue: hueFromTitle(input.title),
    source: 'manual',
  });
  return { kind: 'added', book };
}
