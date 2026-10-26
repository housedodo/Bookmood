import { fetchText, type LookupOptions } from './http';
import type { LookupResult } from './lookup';

// Deutsche Nationalbibliothek: free catalogue of (nearly) every German-language book. No key needed.
// The browser may not be allowed to call it directly (CORS), so the app's own Cloudflare Worker
// forwards the two requests (/api/dnb, /api/dnb-text, see worker/index.ts); direct calls are the fallback.

export const dnbSruUrl = (isbn: string) =>
  `https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&query=num%3D${isbn}&recordSchema=MARC21-xml&maximumRecords=1`;
export const dnbTextUrl = (id: string) => `https://d-nb.info/${id}/04`;

/** German-language ISBNs (Germany, Austria, Switzerland) start with 978-3. */
export const isGermanIsbn = (isbn13: string) => isbn13.startsWith('9783');

type Field = { tag: string; sub: (code: string) => string[] };

function readFields(xml: string): Field[] | null {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return null;
  return Array.from(doc.getElementsByTagNameNS('*', 'datafield')).map((field) => ({
    tag: field.getAttribute('tag') ?? '',
    sub: (code: string) =>
      Array.from(field.getElementsByTagNameNS('*', 'subfield'))
        .filter((s) => s.getAttribute('code') === code)
        .map((s) => (s.textContent ?? '').trim())
        .filter(Boolean),
  }));
}

/** "Mara, Andrea" → "Andrea Mara". */
const personName = (name: string) => {
  const [last, first] = name.split(',').map((part) => part.trim());
  return first ? `${first} ${last}` : last;
};

/**
 * Publisher keywords (MARC 653) mix real keywords with codes:
 * "(VLB-WN)1121: Hardcover, Softcover / Belletristik/Liebesromane" → "Liebesromane";
 * "(Produktform)Paperback / softback" → dropped.
 */
function cleanKeyword(keyword: string): string | undefined {
  if (keyword.startsWith('(VLB-WN)')) return keyword.split('/').pop()?.trim() || undefined;
  if (keyword.startsWith('(')) return undefined;
  return keyword;
}

/** Strips DNB's non-sorting markers (¬Die¬ Wand → Die Wand). */
const clean = (text: string) => text.replace(/[¬\u0098\u009c]/g, '').trim();

export interface DnbRecord {
  result: LookupResult;
  /** DNB id of the publisher's blurb page ("Inhaltstext"), if there is one. */
  textId?: string;
}

/** Parses an SRU answer with one MARC21 record. Returns null if there is no usable record. */
export function parseDnbRecord(xml: string, isbn13: string): DnbRecord | null {
  if (!xml.includes('searchRetrieveResponse')) return null;
  const fields = readFields(xml);
  if (!fields) return null;
  const all = (tag: string, code = 'a') => fields.filter((f) => f.tag === tag).flatMap((f) => f.sub(code)).map(clean);

  const title = all('245')[0];
  if (!title) return null;

  const authors = [
    ...all('100'),
    ...fields.filter((f) => f.tag === '700' && f.sub('4').includes('aut')).flatMap((f) => f.sub('a')),
  ].map(personName);

  const pages = /(\d+)\s*(Seiten|S\.)/.exec(all('300').join(' '))?.[1];

  const subjects = [
    ...all('650'), // GND subject headings
    ...all('689'), // GND subject chains
    ...all('655'), // genre / form
    ...all('653').map(cleanKeyword).filter((k): k is string => Boolean(k)),
  ].filter((s) => !/^Fiktionale Darstellung$/i.test(s));

  const textLink = fields
    .filter((f) => f.tag === '856' && f.sub('3').some((label) => /inhaltstext/i.test(label)))
    .flatMap((f) => f.sub('u'))[0];
  const textId = textLink && /d-nb\.info\/(\d+X?)\/04/.exec(textLink)?.[1];

  return {
    result: {
      isbn13,
      title,
      subtitle: all('245', 'b')[0],
      authors: [...new Set(authors)],
      pageCount: pages ? Number(pages) : undefined,
      description: all('520')[0],
      subjects: [...new Set(subjects)],
      coverUrls: [],
      source: 'dnb',
    },
    textId: textId || undefined,
  };
}

/** Plain text of the blurb page; null if the answer isn't the blurb (e.g. the app's own index.html in dev). */
export function parseDnbText(html: string): string | null {
  if (html.includes('id="root"')) return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, head').forEach((node) => node.remove());
  const text = (doc.body?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text.length >= 40 ? text.slice(0, 3000) : null;
}

/** Tries the app's proxy first, then DNB directly. */
async function viaProxy(proxyUrl: string, directUrl: string, accept: (text: string) => boolean, options: LookupOptions) {
  for (const url of [proxyUrl, directUrl]) {
    const text = await fetchText(url, options);
    if (text && accept(text)) return text;
  }
  return null;
}

/** Looks up an ISBN at the DNB, including the publisher's blurb when there is one. Never throws. */
export async function lookupDnb(isbn13: string, options: LookupOptions = {}): Promise<LookupResult | null> {
  const xml = await viaProxy(`/api/dnb?isbn=${isbn13}`, dnbSruUrl(isbn13), (t) => t.includes('searchRetrieveResponse'), options);
  const record = xml ? parseDnbRecord(xml, isbn13) : null;
  if (!record) return null;
  if (!record.textId || record.result.description) return record.result;

  const html = await viaProxy(`/api/dnb-text?id=${record.textId}`, dnbTextUrl(record.textId), (t) => !t.includes('id="root"'), options);
  const blurb = html ? parseDnbText(html) : null;
  return blurb ? { ...record.result, description: blurb } : record.result;
}
