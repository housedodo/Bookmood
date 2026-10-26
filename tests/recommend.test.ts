import { createBook, type Book } from '../src/data/db';
import { recommend, scoreBook, surprise } from '../src/lib/recommend';

let nextIsbn = 0;
function book(overrides: Partial<Book> & { title: string }): Book {
  return { ...createBook({ isbn13: String(nextIsbn++), title: overrides.title, source: 'manual' }), dateAdded: 1000, ...overrides };
}

const ids = (list: { book: Book }[]) => list.map((s) => s.book.title);

describe('recommend', () => {
  it('only suggests unread books', () => {
    const books = [
      book({ title: 'Unread', subjects: ['Romance'] }),
      book({ title: 'Reading', subjects: ['Romance'], status: 'reading' }),
      book({ title: 'Read', subjects: ['Romance'], status: 'read' }),
    ];
    expect(ids(recommend(books, ['romance'], { jitter: 0 }))).toEqual(['Unread']);
  });

  it('scores subject/genre matches 2 and description-only matches 1', () => {
    expect(scoreBook(book({ title: 'A', subjects: ['Mystery'] }), ['mysterious']).score).toBe(2);
    expect(scoreBook(book({ title: 'B', genres: ['Thriller'] }), ['mysterious']).score).toBe(2);
    expect(scoreBook(book({ title: 'C', description: 'A twisty mystery.' }), ['mysterious']).score).toBe(1);
    // In both places still counts once, as the stronger match.
    expect(scoreBook(book({ title: 'D', subjects: ['Mystery'], description: 'A mystery.' }), ['mysterious']).score).toBe(2);
  });

  it('adds scores across selected moods and lists the matched keywords', () => {
    const b = book({ title: 'Rivals', subjects: ['Romance', 'Small town'], description: 'Full of humor.' });
    const [result] = recommend([b], ['romance', 'cozy', 'funny'], { jitter: 0 });
    // romance (2) + rivals in title (2) + small town (2) + humor in description (1)
    expect(result.score).toBe(7);
    expect(result.reason).toBe('Matches: romance, rivals, small town, humor');
  });

  it('uses the (hidden) subtitle for matching', () => {
    const b = book({ title: 'No One Saw a Thing', subtitle: 'The twisty new crime thriller' });
    expect(recommend([b], ['mysterious'], { jitter: 0 })[0]?.reason).toBe('Matches: crime, thriller');
  });

  it('matches whole words only', () => {
    expect(scoreBook(book({ title: 'An award-winning tale', description: 'glossy pages' }), ['emotional']).score).toBe(0);
  });

  it('drops books that match nothing', () => {
    const books = [book({ title: 'Space', subjects: ['Science fiction'] }), book({ title: 'Love', subjects: ['Love stories'] })];
    expect(ids(recommend(books, ['romance'], { jitter: 0 }))).toEqual(['Love']);
    expect(recommend(books, [], { jitter: 0 })).toEqual([]);
  });

  it('breaks ties by oldest dateAdded', () => {
    const books = [
      book({ title: 'New', subjects: ['Romance'], dateAdded: 300 }),
      book({ title: 'Old', subjects: ['Romance'], dateAdded: 100 }),
      book({ title: 'Mid', subjects: ['Romance'], dateAdded: 200 }),
    ];
    expect(ids(recommend(books, ['romance'], { jitter: 0 }))).toEqual(['Old', 'Mid', 'New']);
  });

  it('respects excludeIds and maxPages', () => {
    const short = book({ title: 'Short', subjects: ['Romance'], pageCount: 200 });
    const long = book({ title: 'Long', subjects: ['Romance'], pageCount: 600 });
    const unknown = book({ title: 'Unknown length', subjects: ['Romance'] });
    expect(ids(recommend([short, long, unknown], ['romance'], { jitter: 0, maxPages: 250 }))).toEqual(['Short', 'Unknown length']);
    expect(ids(recommend([short, long], ['romance'], { jitter: 0, excludeIds: [short.id] }))).toEqual(['Long']);
  });

  it('returns at most 5 books', () => {
    const books = Array.from({ length: 8 }, (_, i) => book({ title: `B${i}`, subjects: ['Romance'] }));
    expect(recommend(books, ['romance'])).toHaveLength(5);
  });

  it('is deterministic with a seed, and the jitter can reorder close scores', () => {
    const books = Array.from({ length: 5 }, (_, i) => book({ title: `B${i}`, subjects: ['Romance'], dateAdded: i }));
    const first = ids(recommend(books, ['romance'], { seed: 42 }));
    expect(ids(recommend(books, ['romance'], { seed: 42 }))).toEqual(first);
    const orders = new Set([1, 2, 3, 4, 5, 6].map((seed) => ids(recommend(books, ['romance'], { seed })).join()));
    expect(orders.size).toBeGreaterThan(1);
  });

  it('never lets jitter beat a full point of score difference', () => {
    const strong = book({ title: 'Strong', subjects: ['Romance', 'Love stories'] }); // 4 points
    const weak = book({ title: 'Weak', subjects: ['Romance'] }); // 2 points
    for (let seed = 0; seed < 20; seed++) {
      expect(ids(recommend([weak, strong], ['romance'], { seed }))[0]).toBe('Strong');
    }
  });
});

describe('surprise', () => {
  it('picks an unread book that is not excluded', () => {
    const a = book({ title: 'A' });
    const b = book({ title: 'B', status: 'read' });
    const c = book({ title: 'C' });
    expect(surprise([a, b, c], [a.id])?.title).toBe('C');
    expect(surprise([b])).toBeUndefined();
  });
});
