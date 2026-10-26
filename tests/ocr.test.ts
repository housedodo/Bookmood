import { cleanOcrText } from '../src/lib/ocr';
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
