import { addBook, ShelfDb } from '../src/data/db';
import { deriveTags } from '../src/data/tropes';
import { refreshAll, refreshBook } from '../src/lib/refresh';
import olBook from './fixtures/openlibrary-9780593334836.json';
import olEdition from './fixtures/openlibrary-edition-OL32334186M.json';
import olWork from './fixtures/openlibrary-work-OL24337047W.json';

const ISBN = '9780593334836';

const fetchImpl: typeof fetch = async (input) => {
  const url = String(input);
  const body = url.includes('api/books') ? olBook : url.includes('/books/OL') ? olEdition : url.includes('/works/') ? olWork : {};
  if (url.includes('covers') || url.includes('books.google')) return new Response('', { status: 404 });
  return new Response(JSON.stringify(body), { status: 200 });
};

let database: ShelfDb;
beforeEach(() => {
  database = new ShelfDb(`test-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await database.delete();
});

describe('deriveTags', () => {
  it('finds tropes in subjects and descriptions, in English and German', () => {
    expect(deriveTags(['Enemies to lovers', 'Hockey'], 'A small-town story.')).toEqual(['enemies to lovers', 'small town', 'sports']);
    expect(deriveTags([], 'Eine Liebesgeschichte in einer Kleinstadt, kurz vor Weihnachten.')).toEqual(['small town', 'christmas']);
    expect(deriveTags([], 'Über zweite Chancen und den Mut, neu anzufangen.')).toEqual(['second chance']);
  });

  it('leaves out tags the reader removed', () => {
    expect(deriveTags(['Hockey', 'Small town'], '', ['sports'])).toEqual(['small town']);
  });
});

describe('refreshBook', () => {
  it('adds subjects, genres, tags and a description without touching the reader’s own data', async () => {
    const book = await addBook(
      { isbn13: ISBN, title: 'Book Lovers', subjects: ['Love stories'], tags: ['summer'], hiddenTags: ['small town'], notes: 'mine', rating: 5, status: 'read', source: 'openlibrary' },
      database,
    );
    expect(await refreshBook(book, { fetchImpl }, database)).toBe('updated');

    const updated = await database.books.get(book.id);
    expect(updated?.subjects).toEqual(expect.arrayContaining(['Love stories', 'Enemies to lovers', 'Sisters']));
    expect(updated?.genres).toEqual(expect.arrayContaining(['Romance', 'Contemporary']));
    expect(updated?.tags).toEqual(['summer', 'enemies to lovers', 'rivals to lovers', 'second chance']);
    expect(updated?.description).toMatch(/cutthroat literary agent/);
    expect(updated).toMatchObject({ title: 'Book Lovers', notes: 'mine', rating: 5, status: 'read' });
  });

  it('reports unchanged the second time', async () => {
    const book = await addBook({ isbn13: ISBN, title: 'Book Lovers', source: 'openlibrary' }, database);
    await refreshBook(book, { fetchImpl }, database);
    const again = (await database.books.get(book.id))!;
    expect(await refreshBook(again, { fetchImpl }, database)).toBe('unchanged');
  });

  it('works offline-free for hand-added books (derives tags from what was typed)', async () => {
    const book = await addBook({ isbn13: 'manual:1', title: 'Mine', subjects: ['Romance'], description: 'Fake dating in a small town.', source: 'manual' }, database);
    expect(await refreshBook(book, { fetchImpl }, database)).toBe('updated');
    expect((await database.books.get(book.id))?.tags).toEqual(['fake dating', 'small town']);
  });
});

describe('refreshAll', () => {
  it('counts outcomes and reports progress', async () => {
    const a = await addBook({ isbn13: ISBN, title: 'Book Lovers', source: 'openlibrary' }, database);
    const b = await addBook({ isbn13: 'manual:2', title: 'Plain', source: 'manual' }, database);
    const progress: number[] = [];
    const summary = await refreshAll([a, b], (done) => progress.push(done), { fetchImpl, pauseMs: 0 }, database);
    expect(summary).toEqual({ updated: 1, unchanged: 1, notFound: 0, stoppedOffline: false });
    expect(progress).toEqual([1, 2]);
  });
});

describe('marketing subtitles', () => {
  const SUBTITLE = 'The Twisty and Unputdownable New Crime Thriller from the Bestselling Author of All Her Fault';
  const NOSAW = '9781804990780';
  const olNoOneSaw = {
    [`ISBN:${NOSAW}`]: { key: '/books/OL1M', title: 'No One Saw a Thing', subtitle: SUBTITLE, authors: [{ name: 'Andrea Mara' }] },
  };
  const subtitleFetch: typeof fetch = async (input) =>
    new Response(JSON.stringify(String(input).includes('api/books') ? olNoOneSaw : {}), { status: 200 });

  it('shortens a title an older version saved as "Title: subtitle", and keeps the subtitle for matching', async () => {
    const book = await addBook({ isbn13: NOSAW, title: `No One Saw a Thing: ${SUBTITLE}`, authors: ['Andrea Mara'], source: 'openlibrary' }, database);
    expect(await refreshBook(book, { fetchImpl: subtitleFetch }, database)).toBe('updated');
    const updated = await database.books.get(book.id);
    expect(updated?.title).toBe('No One Saw a Thing');
    expect(updated?.subtitle).toBe(SUBTITLE);
  });

  it('leaves a title the reader edited alone', async () => {
    const book = await addBook({ isbn13: NOSAW, title: 'My own title', source: 'openlibrary' }, database);
    await refreshBook(book, { fetchImpl: subtitleFetch }, database);
    expect((await database.books.get(book.id))?.title).toBe('My own title');
  });
});
