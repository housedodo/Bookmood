import { addBook, findByIsbn, type Book } from '../data/db';
import { normalizeGenres } from '../data/genres';
import { deriveTags } from '../data/tropes';
import { getCoverTheme, hueFromTitle } from './cover';
import { lookup } from './lookup';

export type AddByIsbnResult =
  | { kind: 'added'; book: Book }
  | { kind: 'duplicate'; book: Book }
  | { kind: 'notFound' }
  | { kind: 'offline' };

/** Looks up an ISBN-13 online and saves it to the library. Never throws. */
export async function addByIsbn(isbn13: string): Promise<AddByIsbnResult> {
  const existing = await findByIsbn(isbn13);
  if (existing) return { kind: 'duplicate', book: existing };

  const result = await lookup(isbn13);
  if (!result) return navigator.onLine ? { kind: 'notFound' } : { kind: 'offline' };

  const { coverBlob, themeHue } = await getCoverTheme(result.coverUrls, result.title);
  try {
    const book = await addBook({
      isbn13,
      title: result.title,
      subtitle: result.subtitle,
      authors: result.authors,
      pageCount: result.pageCount,
      description: result.description,
      subjects: result.subjects,
      genres: normalizeGenres(result.subjects),
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
