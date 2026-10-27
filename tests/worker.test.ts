import { apiTarget } from '../worker/index';

const target = (path: string, key?: string) => apiTarget(new URL(`https://bookmood.example.workers.dev${path}`), { GOOGLE_BOOKS_KEY: key });

describe('worker DNB proxy', () => {
  it('allows only the two DNB requests with valid parameters', () => {
    expect(target('/api/dnb?isbn=9783426000007')).toContain('services.dnb.de/sru/dnb');
    expect(target('/api/dnb-text?id=1300000001')).toBe('https://d-nb.info/1300000001/04');
    expect(target('/api/dnb-text?id=123456789X')).toBe('https://d-nb.info/123456789X/04');
  });

  it('forwards Google Books by ISBN only when a key is set, adding the key', () => {
    expect(target('/api/google-books?isbn=9798217300754')).toBeNull();
    expect(target('/api/google-books?isbn=9798217300754', 'k3y')).toBe(
      'https://www.googleapis.com/books/v1/volumes?q=isbn:9798217300754&key=k3y',
    );
    expect(target('/api/google-books?isbn=intitle:x', 'k3y')).toBeNull();
  });

  it('refuses anything else', () => {
    expect(target('/api/dnb?isbn=abc')).toBeNull();
    expect(target('/api/dnb?isbn=9783426000007%26x%3D1')).toBeNull();
    expect(target('/api/dnb-text?id=../../evil')).toBeNull();
    expect(target('/api/other?url=https://example.com')).toBeNull();
  });
});
