import { dnbTarget } from '../worker/index';

const target = (path: string) => dnbTarget(new URL(`https://bookmood.example.workers.dev${path}`));

describe('worker DNB proxy', () => {
  it('allows only the two DNB requests with valid parameters', () => {
    expect(target('/api/dnb?isbn=9783426000007')).toContain('services.dnb.de/sru/dnb');
    expect(target('/api/dnb-text?id=1300000001')).toBe('https://d-nb.info/1300000001/04');
    expect(target('/api/dnb-text?id=123456789X')).toBe('https://d-nb.info/123456789X/04');
  });

  it('refuses anything else', () => {
    expect(target('/api/dnb?isbn=abc')).toBeNull();
    expect(target('/api/dnb?isbn=9783426000007%26x%3D1')).toBeNull();
    expect(target('/api/dnb-text?id=../../evil')).toBeNull();
    expect(target('/api/other?url=https://example.com')).toBeNull();
  });
});
