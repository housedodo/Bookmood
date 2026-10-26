import { addBook, createBook, ShelfDb } from '../src/data/db';
import { exportCsv, exportJson, importJson } from '../src/lib/exportImport';

let database: ShelfDb;

beforeEach(() => {
  database = new ShelfDb(`test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await database.delete();
});

describe('export / import', () => {
  it('exports CSV with the spec columns and escapes commas and quotes', () => {
    const book = createBook({
      isbn13: '9780593334836',
      title: 'Book Lovers, "a novel"',
      authors: ['Emily Henry'],
      pageCount: 377,
      genres: ['Romance', 'Contemporary'],
      tags: ['summer'],
      rating: 5,
      source: 'manual',
    });
    const csv = exportCsv([book]);
    const [header, row] = csv.replace('﻿', '').trim().split('\r\n');
    expect(header).toBe('title,authors,isbn13,pages,genres,status,rating,tags,dateAdded');
    expect(row.startsWith('"Book Lovers, ""a novel""",Emily Henry,9780593334836,377,Romance; Contemporary,unread,5,summer,')).toBe(true);
  });

  it('leaves out the internal id of books without an ISBN', () => {
    const csv = exportCsv([createBook({ isbn13: 'manual:abc', title: 'Hand made', source: 'manual' })]);
    expect(csv).not.toContain('manual:abc');
  });

  it('round-trips a JSON backup, merging by isbn13 and skipping duplicates', async () => {
    const original = createBook({ isbn13: '9780593334836', title: 'Book Lovers', tags: ['cozy'], notes: 'loved it', status: 'read', rating: 4, source: 'openlibrary' });
    const other = createBook({ isbn13: '9780306406157', title: 'Second', source: 'manual' });
    const json = await exportJson([original, other]);

    await addBook({ isbn13: '9780306406157', title: 'Already here', source: 'manual' }, database);
    const summary = await importJson(json, database);

    expect(summary).toEqual({ added: 1, skipped: 1 });
    const imported = await database.books.where('isbn13').equals('9780593334836').first();
    expect(imported).toMatchObject({ title: 'Book Lovers', tags: ['cozy'], notes: 'loved it', status: 'read', rating: 4, source: 'openlibrary' });
    expect((await database.books.where('isbn13').equals('9780306406157').first())?.title).toBe('Already here');
  });

  it('keeps covers in the JSON backup as base64', async () => {
    const coverBlob = new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/jpeg' });
    const json = await exportJson([createBook({ isbn13: '9780593334836', title: 'With cover', coverBlob, source: 'manual' })]);
    expect(JSON.parse(json).books[0].cover).toBe('data:image/jpeg;base64,AQID+g==');
  });

  it('rejects files that are not backups', async () => {
    await expect(importJson('not json', database)).rejects.toThrow(/not valid JSON/);
    await expect(importJson('{"books": []}', database)).rejects.toThrow(/isn't a ShelfScan backup/);
  });

  it('skips broken entries instead of failing the whole import', async () => {
    const json = JSON.stringify({ format: 'shelfscan-backup', version: 1, books: [{ title: 'no isbn' }, { isbn13: '1', title: 'Fine' }] });
    expect(await importJson(json, database)).toEqual({ added: 1, skipped: 1 });
  });
});
