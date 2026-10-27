import Dexie, { type EntityTable } from 'dexie';

export type ReadStatus = 'unread' | 'reading' | 'read';
export type BookSource = 'openlibrary' | 'googlebooks' | 'dnb' | 'manual';
/** Where a book's info came from, for the "Book info" panel. */
export type InfoSource = 'openlibrary' | 'googlebooks' | 'dnb' | 'wikipedia';

export interface Book {
  id: string;                 // crypto.randomUUID()
  isbn13: string;             // unique index
  infoIsbn?: string;          // ISBN of the edition the info came from, when the scanned one isn't in any database (international editions)
  title: string;
  subtitle?: string;          // not shown (often marketing text); used for mood matching
  authors: string[];
  pageCount?: number;
  description?: string;
  blurb?: string;             // back-cover text read from a photo (counts like the description)
  subjects: string[];         // raw subjects from the API
  genres: string[];           // cleaned genres (see genres.ts)
  coverBlob?: Blob;           // cover image stored locally
  themeHue: number;           // 0-360, used for this book's pastel theme
  status: ReadStatus;
  rating?: 1 | 2 | 3 | 4 | 5;
  tags: string[];             // user tags + automatic trope tags (see tropes.ts)
  hiddenTags?: string[];      // automatic tags the reader removed; never re-added
  moods?: string[];           // mood ids the reader picked ("cozy", "dark"…); count most in mood picks
  infoSources?: InfoSource[]; // where the info came from (Book info panel)
  notes?: string;
  dateAdded: number;          // Date.now()
  source: BookSource;
}

/** What callers provide when adding a book; the rest gets sensible defaults. */
export type NewBook = Pick<Book, 'isbn13' | 'title' | 'source'> &
  Partial<Omit<Book, 'id' | 'dateAdded'>>;

export class ShelfDb extends Dexie {
  books!: EntityTable<Book, 'id'>;

  constructor(name = 'shelfscan') {
    super(name);
    this.version(1).stores({
      books: 'id, &isbn13, title, dateAdded, status',
    });
  }
}

export const db = new ShelfDb();

export function createBook(input: NewBook): Book {
  return {
    authors: [],
    subjects: [],
    genres: [],
    tags: [],
    themeHue: 340,
    status: 'unread',
    ...input,
    id: crypto.randomUUID(),
    dateAdded: Date.now(),
  };
}

/** Adds a book. Rejects with a Dexie ConstraintError if the ISBN is already in the library. */
export async function addBook(input: NewBook, database: ShelfDb = db): Promise<Book> {
  const book = createBook(input);
  await database.books.add(book);
  return book;
}

export function findByIsbn(isbn13: string, database: ShelfDb = db): Promise<Book | undefined> {
  return database.books.where('isbn13').equals(isbn13).first();
}

export async function updateBook(
  id: string,
  changes: Partial<Omit<Book, 'id'>>,
  database: ShelfDb = db,
): Promise<void> {
  await database.books.update(id, changes);
}

export async function deleteBook(id: string, database: ShelfDb = db): Promise<void> {
  await database.books.delete(id);
}
