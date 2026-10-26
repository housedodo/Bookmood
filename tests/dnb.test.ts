import { isGermanIsbn, lookupDnb, parseDnbRecord, parseDnbText } from '../src/lib/dnb';
import xml from './fixtures/dnb-9783426000007.xml?raw';
import emptyXml from './fixtures/dnb-empty.xml?raw';
import blurb from './fixtures/dnb-text-1300000001.html?raw';

const ISBN = '9783426000007';

describe('DNB', () => {
  it('recognises German-language ISBNs', () => {
    expect(isGermanIsbn('9783426000007')).toBe(true);
    expect(isGermanIsbn('9781804990780')).toBe(false);
  });

  it('parses a MARC21 record', () => {
    const record = parseDnbRecord(xml, ISBN);
    expect(record?.textId).toBe('1300000001');
    expect(record?.result).toMatchObject({
      title: 'Ein Sommer am See',
      subtitle: 'Roman',
      authors: ['Anna Berg'],
      pageCount: 398,
      source: 'dnb',
    });
    expect(record?.result.subjects).toEqual(['Kleinstadt', 'Freundschaft', 'Liebesroman', 'Enemies to Lovers', 'Liebesromane']);
  });

  it('returns null for an empty answer or the app’s own page', () => {
    expect(parseDnbRecord(emptyXml, ISBN)).toBeNull();
    expect(parseDnbRecord('<!doctype html><div id="root"></div>', ISBN)).toBeNull();
  });

  it('extracts the blurb text', () => {
    expect(parseDnbText(blurb)).toMatch(/^Lena hasst den neuen Bäcker im Dorf – .* neu anzufangen\.$/);
    expect(parseDnbText('<!doctype html><div id="root"></div>')).toBeNull();
  });

  it('looks up via the proxy and adds the blurb as description', async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.startsWith('/api/dnb?')) return new Response(xml);
      if (url.startsWith('/api/dnb-text?')) return new Response(blurb);
      return new Response('', { status: 500 });
    };
    const result = await lookupDnb(ISBN, { fetchImpl });
    expect(result?.description).toMatch(/herzerwärmende Liebesgeschichte/);
    expect(calls).toEqual([`/api/dnb?isbn=${ISBN}`, '/api/dnb-text?id=1300000001']);
  });

  it('falls back to calling the DNB directly when there is no proxy (e.g. dev server)', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.startsWith('/api/')) return new Response('<!doctype html><div id="root"></div>'); // SPA fallback
      if (url.includes('services.dnb.de')) return new Response(xml);
      if (url.includes('d-nb.info')) return new Response(blurb);
      return new Response('', { status: 404 });
    };
    expect((await lookupDnb(ISBN, { fetchImpl }))?.description).toMatch(/Bäcker/);
  });

  it('returns null when nothing is found or the network fails', async () => {
    expect(await lookupDnb(ISBN, { fetchImpl: async () => new Response(emptyXml) })).toBeNull();
    expect(await lookupDnb(ISBN, { fetchImpl: async () => { throw new TypeError('offline'); } })).toBeNull();
  });
});
