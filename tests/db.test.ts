import { addBook, deleteBook, findByIsbn, ShelfDb, updateBook } from '../src/data/db';

let database: ShelfDb;

beforeEach(() => {
  database = new ShelfDb(`test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await database.delete();
});

describe('db', () => {
  it('adds a book with defaults', async () => {
    const book = await addBook({ isbn13: '9780306406157', title: 'Test Book', source: 'manual' }, database);
    expect(book.status).toBe('unread');
    expect(book.tags).toEqual([]);
    expect(await findByIsbn('9780306406157', database)).toMatchObject({ id: book.id, title: 'Test Book' });
  });

  it('rejects a duplicate isbn', async () => {
    await addBook({ isbn13: '9780306406157', title: 'First', source: 'manual' }, database);
    await expect(
      addBook({ isbn13: '9780306406157', title: 'Second', source: 'manual' }, database),
    ).rejects.toMatchObject({ name: 'ConstraintError' });
    expect(await database.books.count()).toBe(1);
  });

  it('updates status', async () => {
    const book = await addBook({ isbn13: '9780306406157', title: 'Test', source: 'manual' }, database);
    await updateBook(book.id, { status: 'reading' }, database);
    expect((await database.books.get(book.id))?.status).toBe('reading');
  });

  it('deletes a book', async () => {
    const book = await addBook({ isbn13: '9780306406157', title: 'Test', source: 'manual' }, database);
    await deleteBook(book.id, database);
    expect(await database.books.count()).toBe(0);
  });
});
