import { createBook, type Book } from '../src/data/db';
import { DEFAULT_FILTERS, filterBooks, lengthOf, libraryGenres, sortBooks } from '../src/lib/library';

function book(overrides: Partial<Book> & { title: string }): Book {
  return { ...createBook({ isbn13: crypto.randomUUID(), source: 'manual', ...overrides }), ...overrides };
}

const books = [
  book({ title: 'Book Lovers', authors: ['Emily Henry'], pageCount: 377, genres: ['Romance'], dateAdded: 3 }),
  book({ title: 'apple tales', authors: ['Zoe Adams'], pageCount: 120, status: 'read', genres: ['Humor'], dateAdded: 1 }),
  book({ title: 'The Long War', authors: ['Ann Baker'], pageCount: 620, status: 'reading', genres: ['Fantasy', 'Romance'], dateAdded: 2 }),
  book({ title: 'No Pages', authors: [], dateAdded: 4 }),
];

const titles = (list: Book[]) => list.map((b) => b.title);

describe('library filters', () => {
  it('maps page counts to lengths', () => {
    expect([lengthOf(249), lengthOf(250), lengthOf(450), lengthOf(451), lengthOf(undefined)]).toEqual([
      'short', 'medium', 'medium', 'long', undefined,
    ]);
  });

  it('searches title and author, case-insensitively', () => {
    expect(titles(filterBooks(books, { ...DEFAULT_FILTERS, query: 'emily' }))).toEqual(['Book Lovers']);
    expect(titles(filterBooks(books, { ...DEFAULT_FILTERS, query: 'APPLE' }))).toEqual(['apple tales']);
  });

  it('filters by status, genre and length together', () => {
    expect(titles(filterBooks(books, { ...DEFAULT_FILTERS, status: 'reading' }))).toEqual(['The Long War']);
    expect(titles(filterBooks(books, { ...DEFAULT_FILTERS, genre: 'Romance' }))).toEqual(['Book Lovers', 'The Long War']);
    expect(titles(filterBooks(books, { ...DEFAULT_FILTERS, genre: 'Romance', length: 'long' }))).toEqual(['The Long War']);
  });

  it('filters books whose mood is unknown', () => {
    const mystery = book({ title: 'Bare Book' });
    expect(titles(filterBooks([...books, mystery], { ...DEFAULT_FILTERS, needsMoodInfo: true }))).toEqual(['No Pages', 'Bare Book']);
  });

  it('sorts', () => {
    expect(titles(sortBooks(books, 'recent'))).toEqual(['No Pages', 'Book Lovers', 'The Long War', 'apple tales']);
    expect(titles(sortBooks(books, 'title'))).toEqual(['apple tales', 'Book Lovers', 'No Pages', 'The Long War']);
    expect(titles(sortBooks(books, 'author'))).toEqual(['No Pages', 'apple tales', 'The Long War', 'Book Lovers']);
    expect(titles(sortBooks(books, 'pagesAsc'))).toEqual(['apple tales', 'Book Lovers', 'The Long War', 'No Pages']);
    expect(titles(sortBooks(books, 'pagesDesc'))).toEqual(['The Long War', 'Book Lovers', 'apple tales', 'No Pages']);
  });

  it('lists genres in the library', () => {
    expect(libraryGenres(books)).toEqual([
      { genre: 'Romance', count: 2 },
      { genre: 'Fantasy', count: 1 },
      { genre: 'Humor', count: 1 },
    ]);
  });
});
