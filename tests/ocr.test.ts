import { cleanOcrText, coverSearchText } from '../src/lib/ocr';
import { createBook } from '../src/data/db';
import { autoTags, moodUnknown } from '../src/lib/moodInfo';

describe('cleanOcrText', () => {
  it('joins lines and words split with a hyphen', () => {
    expect(cleanOcrText('Eine herzerwärmende Liebes-\ngeschichte über\nzweite Chancen.')).toBe(
      'Eine herzerwärmende Liebesgeschichte über zweite Chancen.',
    );
  });

  it('drops barcode digits, prices and logo noise', () => {
    const raw = 'A twisty, gripping thriller.\n9 781804 990780\n€ 12,99\n| ~ ~\nPENGUIN\nYou will not see it coming.';
    expect(cleanOcrText(raw)).toBe('A twisty, gripping thriller. PENGUIN You will not see it coming.');
  });
});

describe('mood info', () => {
  const bare = () => createBook({ isbn13: '9781804990780', title: 'No One Saw a Thing', source: 'openlibrary' });

  it('knows when a book matches no mood at all', () => {
    expect(moodUnknown(bare())).toBe(true);
    expect(moodUnknown({ ...bare(), blurb: 'A gripping page-turner.' })).toBe(false);
    expect(moodUnknown({ ...bare(), moods: ['dark'] })).toBe(false);
  });

  it('finds trope tags in the back-cover text', () => {
    expect(autoTags({ ...bare(), blurb: 'Snowed in at a small-town inn with her rival…' })).toEqual(['forced proximity', 'small town']);
  });
});

describe('coverSearchText', () => {
  const line = (text: string, height: number, confidence = 90) => ({ text, height, confidence });

  it('keeps the biggest lines (title, author) and drops marketing lines', () => {
    const lines = [
      line('THE NEW YORK TIMES BESTSELLING AUTHOR OF THE WILL OF THE MANY', 18),
      line('THE STRENGTH', 120),
      line('OF THE FEW', 110),
      line('JAMES ISLINGTON', 60),
      line('A Novel', 30),
    ];
    expect(coverSearchText(lines)).toBe('THE STRENGTH OF THE FEW JAMES ISLINGTON');
  });

  it('ignores low-confidence and garbage lines', () => {
    expect(coverSearchText([line('~~ |// ..', 200), line('Kin', 90), line('xQ#', 150, 10), line('Tayari Jones', 50)])).toBe('Kin Tayari Jones');
  });

  it('returns an empty string when nothing is readable', () => {
    expect(coverSearchText([line('|||', 100)])).toBe('');
  });
});
