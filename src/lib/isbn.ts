/** Strip spaces and hyphens; uppercase a trailing ISBN-10 "x". */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase();
}

function isbn13CheckDigit(first12: string): number {
  const sum = [...first12].reduce((acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

/** A book ISBN-13: 13 digits, 978/979 prefix, correct checksum. */
export function isValidIsbn13(raw: string): boolean {
  const isbn = normalizeIsbn(raw);
  if (!/^97[89]\d{10}$/.test(isbn)) return false;
  return isbn13CheckDigit(isbn.slice(0, 12)) === Number(isbn[12]);
}

export function isValidIsbn10(raw: string): boolean {
  const isbn = normalizeIsbn(raw);
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  const sum = [...isbn].reduce((acc, ch, i) => acc + (ch === 'X' ? 10 : Number(ch)) * (10 - i), 0);
  return sum % 11 === 0;
}

/** Converts a valid ISBN-10 to ISBN-13, or returns null. */
export function isbn10To13(raw: string): string | null {
  if (!isValidIsbn10(raw)) return null;
  const first12 = '978' + normalizeIsbn(raw).slice(0, 9);
  return first12 + isbn13CheckDigit(first12);
}

/** Accepts any valid ISBN-10 or ISBN-13 and returns the normalized ISBN-13, or null. */
export function toIsbn13(raw: string): string | null {
  const isbn = normalizeIsbn(raw);
  if (isValidIsbn13(isbn)) return isbn;
  return isbn10To13(isbn);
}
