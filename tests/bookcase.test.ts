import { createBook } from '../src/data/db';
import { arrangeBooks, spineHeight, spineWidth } from '../src/lib/bookcase';

const book = (title: string, extra: Partial<ReturnType<typeof createBook>> = {}) => ({
  ...createBook({ isbn13: crypto.randomUUID(), title, source: 'manual' }),
  ...extra,
});

describe('bookcase', () => {
  it('makes thicker books wider, within limits', () => {
    expect(spineWidth(undefined)).toBe(26);
    expect(spineWidth(100)).toBe(18);
    expect(spineWidth(400)).toBe(34);
    expect(spineWidth(2000)).toBe(42);
    expect(spineWidth(10)).toBe(16);
  });

  it('gives each title a stable height that fits a 150 px shelf', () => {
    for (const title of ['Book Lovers', 'A', 'Ein Sommer am See']) {
      expect(spineHeight(title)).toBe(spineHeight(title));
      expect(spineHeight(title)).toBeGreaterThanOrEqual(112);
      expect(spineHeight(title)).toBeLessThanOrEqual(144);
    }
  });

  it('arranges by newest, color (pinks first) or author surname', () => {
    const books = [
      book('Blue', { themeHue: 210, dateAdded: 1, authors: ['Zoe Adams'] }),
      book('Pink', { themeHue: 345, dateAdded: 3, authors: ['Emily Henry'] }),
      book('Peach', { themeHue: 25, dateAdded: 2, authors: ['Anna Berg'] }),
    ];
    const titles = (list: typeof books) => list.map((b) => b.title);
    expect(titles(arrangeBooks(books, 'newest'))).toEqual(['Pink', 'Peach', 'Blue']);
    expect(titles(arrangeBooks(books, 'color'))).toEqual(['Pink', 'Peach', 'Blue']);
    expect(titles(arrangeBooks(books, 'author'))).toEqual(['Blue', 'Peach', 'Pink']);
  });
});
