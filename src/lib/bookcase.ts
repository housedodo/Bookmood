import type { Book } from '../data/db';

export type BookcaseOrder = 'newest' | 'color' | 'author';
export const BOOKCASE_ORDERS: { value: BookcaseOrder; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'color', label: 'Color' },
  { value: 'author', label: 'Author' },
];

/** Thicker books get wider spines (unknown page count = a medium book). */
export function spineWidth(pageCount?: number): number {
  if (!pageCount) return 26;
  return Math.round(Math.min(42, Math.max(16, 12 + pageCount / 18)));
}

/** Slightly different heights, stable per title, so the shelf looks like real books. */
export function spineHeight(title: string): number {
  let hash = 0;
  for (const ch of title) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  return 112 + (hash % 5) * 8; // 112–144 px; a shelf row is 150 px tall
}

const surname = (book: Book) => (book.authors[0] ?? '').trim().split(/\s+/).pop() ?? '';

export function arrangeBooks(books: Book[], order: BookcaseOrder): Book[] {
  const sorted = [...books];
  switch (order) {
    case 'newest':
      return sorted.sort((a, b) => b.dateAdded - a.dateAdded);
    case 'color':
      // Pinks (330–360) wrap around to the start so the rainbow begins with them.
      return sorted.sort((a, b) => ((a.themeHue + 30) % 360) - ((b.themeHue + 30) % 360) || a.title.localeCompare(b.title));
    case 'author':
      return sorted.sort((a, b) => surname(a).localeCompare(surname(b), undefined, { sensitivity: 'base' }) || a.title.localeCompare(b.title));
  }
}
