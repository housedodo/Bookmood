import { db } from '../src/data/db';
import { addWithInfoFrom } from '../src/lib/addBook';
import { refreshBook } from '../src/lib/refresh';
import olBook from './fixtures/openlibrary-9780593334836.json';

const SCANNED = '9798217300754'; // an international edition no database knows
const US_EDITION = '9780593334836';

beforeEach(async () => {
  await db.books.clear();
  // Only the US edition is known online; covers and everything else: not found.
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('api/books') && url.includes(US_EDITION)) return new Response(JSON.stringify(olBook));
    if (url.includes('covers') || url.includes('books.google')) return new Response('', { status: 404 });
    return new Response('{}');
  });
});

afterEach(() => vi.unstubAllGlobals());

const picked = { key: '/works/1', title: 'Book Lovers', authors: ['Emily Henry'], isbn13: US_EDITION };

describe('addWithInfoFrom (scanned ISBN not found, picked by title/author)', () => {
  it('uses the picked edition’s info but saves the scanned ISBN', async () => {
    const result = await addWithInfoFrom(SCANNED, picked);
    expect(result.kind).toBe('added');
    const [book] = await db.books.toArray();
    expect(book).toMatchObject({ isbn13: SCANNED, infoIsbn: US_EDITION, title: 'Book Lovers', authors: ['Emily Henry'], pageCount: 377 });
    expect(book.subjects).toContain('Love stories');
  });

  it('recognises the same copy next time', async () => {
    await addWithInfoFrom(SCANNED, picked);
    expect((await addWithInfoFrom(SCANNED, picked)).kind).toBe('duplicate');
  });

  it('falls back to the hand-entry form when the picked book has no usable ISBN', async () => {
    expect(await addWithInfoFrom(SCANNED, { key: '/works/2', title: 'Kin', authors: ['Tayari Jones'] })).toEqual({
      kind: 'needsManual',
      title: 'Kin',
      authors: ['Tayari Jones'],
    });
  });

  it('refreshes from the info edition, not the unknown scanned ISBN', async () => {
    await addWithInfoFrom(SCANNED, picked);
    const [book] = await db.books.toArray();
    expect(await refreshBook(book)).not.toBe('notFound');
  });
});
