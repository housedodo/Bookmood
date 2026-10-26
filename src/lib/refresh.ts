import { db, type Book, type ShelfDb } from '../data/db';
import { normalizeGenres } from '../data/genres';
import { deriveTags } from '../data/tropes';
import { getCoverTheme } from './cover';
import { lookup, type LookupOptions } from './lookup';

export type RefreshOutcome = 'updated' | 'unchanged' | 'notFound' | 'offline';

const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Fetches a book's info again and fills gaps: adds subjects, genres and automatic tags,
 * and a description, page count, authors or cover only if the book has none.
 * Never overwrites what's there (title, your tags, notes, rating, status).
 */
export async function refreshBook(book: Book, options: LookupOptions = {}, database: ShelfDb = db): Promise<RefreshOutcome> {
  const hasIsbn = !book.isbn13.startsWith('manual:');
  const result = hasIsbn ? await lookup(book.isbn13, options) : null;
  if (hasIsbn && !result && !navigator.onLine) return 'offline';

  const subjects = union(book.subjects, result?.subjects ?? []);
  const description = book.description ?? result?.description;
  const changes: Partial<Book> = {
    subjects,
    description,
    pageCount: book.pageCount ?? result?.pageCount,
    authors: book.authors.length ? book.authors : result?.authors ?? [],
    genres: union(book.genres, normalizeGenres(subjects)),
    tags: union(book.tags, deriveTags(subjects, description, book.hiddenTags)),
  };

  if (!book.coverBlob && result?.coverUrls.length) {
    const theme = await getCoverTheme(result.coverUrls, book.title, options);
    if (theme.coverBlob) Object.assign(changes, theme);
  }

  const changed =
    !sameList(book.subjects, subjects) ||
    !sameList(book.genres, changes.genres ?? []) ||
    !sameList(book.tags, changes.tags ?? []) ||
    !sameList(book.authors, changes.authors ?? []) ||
    book.description !== changes.description ||
    book.pageCount !== changes.pageCount ||
    Boolean(changes.coverBlob);

  if (changed) await database.books.update(book.id, changes);
  if (changed) return 'updated';
  return hasIsbn && !result ? 'notFound' : 'unchanged';
}

export interface RefreshSummary {
  updated: number;
  unchanged: number;
  notFound: number;
  stoppedOffline: boolean;
}

/** Refreshes books one after another (gently, to be nice to the free APIs). Stops when offline. */
export async function refreshAll(
  books: Book[],
  onProgress: (done: number, total: number) => void = () => {},
  options: LookupOptions & { pauseMs?: number } = {},
  database: ShelfDb = db,
): Promise<RefreshSummary> {
  const { pauseMs = 300, ...lookupOptions } = options;
  const summary: RefreshSummary = { updated: 0, unchanged: 0, notFound: 0, stoppedOffline: false };
  for (const [i, book] of books.entries()) {
    const outcome = await refreshBook(book, lookupOptions, database);
    if (outcome === 'offline') {
      summary.stoppedOffline = true;
      break;
    }
    summary[outcome]++;
    onProgress(i + 1, books.length);
    if (pauseMs && i < books.length - 1) await new Promise((resolve) => setTimeout(resolve, pauseMs));
  }
  return summary;
}
