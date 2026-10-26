import type { Book, ReadStatus } from '../data/db';

export type LengthFilter = 'any' | 'short' | 'medium' | 'long';
export type SortKey = 'recent' | 'title' | 'author' | 'pagesAsc' | 'pagesDesc';

export interface LibraryFilters {
  query: string;
  status: ReadStatus | 'all';
  genre: string; // '' = all genres
  length: LengthFilter;
}

export const DEFAULT_FILTERS: LibraryFilters = { query: '', status: 'all', genre: '', length: 'any' };

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recently added' },
  { key: 'title', label: 'Title A–Z' },
  { key: 'author', label: 'Author A–Z (surname)' },
  { key: 'pagesAsc', label: 'Pages (short → long)' },
  { key: 'pagesDesc', label: 'Pages (long → short)' },
];

/** Short < 250, Medium 250–450, Long > 450 pages. Books without a page count have no length. */
export function lengthOf(pageCount?: number): Exclude<LengthFilter, 'any'> | undefined {
  if (!pageCount) return undefined;
  if (pageCount < 250) return 'short';
  if (pageCount <= 450) return 'medium';
  return 'long';
}

export function filterBooks(books: Book[], filters: LibraryFilters): Book[] {
  const query = filters.query.trim().toLowerCase();
  return books.filter((book) => {
    if (filters.status !== 'all' && book.status !== filters.status) return false;
    if (filters.genre && !book.genres.includes(filters.genre)) return false;
    if (filters.length !== 'any' && lengthOf(book.pageCount) !== filters.length) return false;
    if (query) {
      const haystack = [book.title, ...book.authors].join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

const byText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

/** "Emily Henry" → "Henry Emily", so Author A–Z sorts by surname. */
const authorSortKey = (book: Book) => {
  const parts = (book.authors[0] ?? '').trim().split(/\s+/);
  return [parts.pop() ?? '', ...parts].join(' ');
};

export function sortBooks(books: Book[], key: SortKey): Book[] {
  const sorted = [...books];
  switch (key) {
    case 'recent':
      return sorted.sort((a, b) => b.dateAdded - a.dateAdded);
    case 'title':
      return sorted.sort((a, b) => byText(a.title, b.title));
    case 'author':
      return sorted.sort((a, b) => byText(authorSortKey(a), authorSortKey(b)) || byText(a.title, b.title));
    // Books without a page count go last in both directions.
    case 'pagesAsc':
      return sorted.sort((a, b) => (a.pageCount ?? Infinity) - (b.pageCount ?? Infinity));
    case 'pagesDesc':
      return sorted.sort((a, b) => (b.pageCount ?? -Infinity) - (a.pageCount ?? -Infinity));
  }
}

/** All genres used in the library, alphabetically, for the genre dropdown. */
export function libraryGenres(books: Book[]): string[] {
  return [...new Set(books.flatMap((book) => book.genres))].sort(byText);
}
