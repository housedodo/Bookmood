import { containsKeyword, matchKeyword } from '../src/lib/text';
import { createBook } from '../src/data/db';
import { recommend } from '../src/lib/recommend';

describe('keyword matching', () => {
  it('matches whole words, ignoring case', () => {
    expect(containsKeyword('A WAR story', 'war')).toBe(true);
    expect(containsKeyword('an award winner', 'war')).toBe(false);
  });

  it('handles German umlauts and ß as letters', () => {
    expect(containsKeyword('Eine übernatürliche Geschichte', 'übernatürlich*')).toBe(true);
    expect(containsKeyword('Fußballfieber', 'fußball*')).toBe(true);
    expect(containsKeyword('Mordor', 'mord')).toBe(false);
    expect(containsKeyword('ein Mord im Dorf', 'mord')).toBe(true);
  });

  it('prefix keywords return the whole matched word', () => {
    expect(matchKeyword('Ein Liebesroman für den Sommer', 'liebes*')).toBe('liebesroman');
    expect(matchKeyword('Die Liebe', 'liebes*')).toBeUndefined();
  });
});

describe('German books in mood picks', () => {
  it('matches a German description and shows the real words as the reason', () => {
    const book = {
      ...createBook({ isbn13: '1', title: 'Sommer in Lindau', source: 'manual' }),
      description: 'Eine herzerwärmende Liebesgeschichte in einer Kleinstadt am Bodensee.',
    };
    const [result] = recommend([book], ['romance', 'cozy'], { jitter: 0 });
    expect(result.reason).toBe('Matches: liebesgeschichte, kleinstadt, herzerwärmende');
    expect(result.score).toBe(3); // three description-only matches, 1 point each
  });
});
