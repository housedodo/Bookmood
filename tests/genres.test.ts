import { normalizeGenres } from '../src/data/genres';

describe('normalizeGenres', () => {
  it('maps messy subjects to clean genres', () => {
    expect(normalizeGenres(['Love stories', 'FICTION / Romance / Contemporary', 'Hockey players'])).toEqual([
      'Romance',
      'Contemporary',
    ]);
  });

  it('does not confuse science fiction with science', () => {
    expect(normalizeGenres(['Science fiction', 'Space opera'])).toEqual(['Science Fiction']);
    expect(normalizeGenres(['Popular science', 'Physics'])).toEqual(['Science']);
  });

  it('does not treat "Literary agents" as literary fiction', () => {
    expect(normalizeGenres(['Literary agents'])).toEqual([]);
    expect(normalizeGenres(['Fiction, literary'])).toEqual(['Literary Fiction']);
  });

  it('returns nothing for unknown subjects', () => {
    expect(normalizeGenres(['Fiction', 'nyt:hardcover-fiction'])).toEqual([]);
  });
});
