import { isbn10To13, isValidIsbn10, isValidIsbn13, normalizeIsbn, toIsbn13 } from '../src/lib/isbn';

describe('isbn', () => {
  it('accepts valid ISBN-13s', () => {
    expect(isValidIsbn13('9780306406157')).toBe(true);
    expect(isValidIsbn13('9791090636071')).toBe(true);
  });

  it('rejects a wrong checksum', () => {
    expect(isValidIsbn13('9780306406158')).toBe(false);
  });

  it('rejects non-book EAN-13 codes and wrong lengths', () => {
    expect(isValidIsbn13('4006381333931')).toBe(false); // valid EAN, not 978/979
    expect(isValidIsbn13('978030640615')).toBe(false);
    expect(isValidIsbn13('97803064061577')).toBe(false);
    expect(isValidIsbn13('978030640615X')).toBe(false);
  });

  it('strips hyphens and spaces', () => {
    expect(normalizeIsbn(' 978-0-306 40615-7 ')).toBe('9780306406157');
    expect(isValidIsbn13('978-0-306-40615-7')).toBe(true);
  });

  it('validates ISBN-10 including X check digit', () => {
    expect(isValidIsbn10('0306406152')).toBe(true);
    expect(isValidIsbn10('080442957x')).toBe(true);
    expect(isValidIsbn10('0306406153')).toBe(false);
  });

  it('converts ISBN-10 to ISBN-13', () => {
    expect(isbn10To13('0-306-40615-2')).toBe('9780306406157');
    expect(isbn10To13('080442957X')).toBe('9780804429573');
    expect(isbn10To13('0306406153')).toBeNull();
  });

  it('toIsbn13 handles both formats', () => {
    expect(toIsbn13('978-0-306-40615-7')).toBe('9780306406157');
    expect(toIsbn13('0306406152')).toBe('9780306406157');
    expect(toIsbn13('hello')).toBeNull();
  });
});
