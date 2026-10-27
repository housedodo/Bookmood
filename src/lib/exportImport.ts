import { db, type Book, type InfoSource, type ShelfDb } from '../data/db';
import { recordBackup } from './safety';

const INFO_SOURCES: InfoSource[] = ['openlibrary', 'googlebooks', 'dnb', 'wikipedia'];

const BACKUP_FORMAT = 'shelfscan-backup';
const BACKUP_VERSION = 1;

/** A book as stored in a JSON backup: the cover Blob becomes a data URL. */
type BackupBook = Omit<Book, 'coverBlob'> & { cover?: string };

interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  books: BackupBook[];
}

export interface ImportSummary {
  added: number;
  skipped: number;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob | undefined {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) return undefined;
  const [, type = 'application/octet-stream', base64, data] = match;
  const bytes = base64 ? Uint8Array.from(atob(data), (c) => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(data));
  return new Blob([bytes], { type });
}

/** Full backup as JSON text, covers included as base64. */
export async function exportJson(books: Book[]): Promise<string> {
  const backupBooks = await Promise.all(
    books.map(async ({ coverBlob, ...book }): Promise<BackupBook> => ({
      ...book,
      ...(coverBlob ? { cover: await blobToDataUrl(coverBlob) } : {}),
    })),
  );
  const backup: Backup = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), books: backupBooks };
  return JSON.stringify(backup, null, 2);
}

const CSV_COLUMNS = ['title', 'authors', 'isbn13', 'pages', 'genres', 'status', 'rating', 'tags', 'dateAdded'] as const;

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Spreadsheet-friendly CSV. Lists are joined with "; ", dates are ISO. */
export function exportCsv(books: Book[]): string {
  const rows = books.map((book) =>
    [
      book.title,
      book.authors.join('; '),
      book.isbn13.startsWith('manual:') ? '' : book.isbn13,
      book.pageCount?.toString() ?? '',
      book.genres.join('; '),
      book.status,
      book.rating?.toString() ?? '',
      book.tags.join('; '),
      new Date(book.dateAdded).toISOString(),
    ].map(csvCell).join(','),
  );
  // BOM so Excel opens accents and emojis correctly.
  return '﻿' + [CSV_COLUMNS.join(','), ...rows].join('\r\n') + '\r\n';
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

/** Validates one book from a backup; returns null if it is unusable. */
function readBackupBook(raw: unknown): Book | null {
  if (!isRecord(raw) || typeof raw.isbn13 !== 'string' || typeof raw.title !== 'string' || !raw.title.trim()) return null;
  const status = raw.status === 'reading' || raw.status === 'read' ? raw.status : 'unread';
  const rating = typeof raw.rating === 'number' && [1, 2, 3, 4, 5].includes(raw.rating) ? (raw.rating as Book['rating']) : undefined;
  const source = raw.source === 'openlibrary' || raw.source === 'googlebooks' || raw.source === 'dnb' ? raw.source : 'manual';
  return {
    id: typeof raw.id === 'string' ? raw.id : crypto.randomUUID(),
    isbn13: raw.isbn13,
    infoIsbn: typeof raw.infoIsbn === 'string' ? raw.infoIsbn : undefined,
    title: raw.title,
    subtitle: typeof raw.subtitle === 'string' ? raw.subtitle : undefined,
    authors: stringList(raw.authors),
    pageCount: typeof raw.pageCount === 'number' && raw.pageCount > 0 ? raw.pageCount : undefined,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    blurb: typeof raw.blurb === 'string' ? raw.blurb : undefined,
    subjects: stringList(raw.subjects),
    genres: stringList(raw.genres),
    coverBlob: typeof raw.cover === 'string' ? dataUrlToBlob(raw.cover) : undefined,
    themeHue: typeof raw.themeHue === 'number' ? raw.themeHue : 340,
    status,
    rating,
    tags: stringList(raw.tags),
    hiddenTags: stringList(raw.hiddenTags),
    moods: stringList(raw.moods),
    infoSources: stringList(raw.infoSources).filter((s): s is InfoSource => INFO_SOURCES.includes(s as InfoSource)),
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    dateAdded: typeof raw.dateAdded === 'number' ? raw.dateAdded : Date.now(),
    source,
  };
}

/**
 * Merges a JSON backup into the library by isbn13: books already in the library are skipped.
 * Throws an Error with a friendly message if the file is not a ShelfScan backup.
 */
export async function importJson(text: string, database: ShelfDb = db): Promise<ImportSummary> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a ShelfScan backup (it's not valid JSON).");
  }
  if (!isRecord(data) || data.format !== BACKUP_FORMAT || !Array.isArray(data.books)) {
    throw new Error("That file isn't a ShelfScan backup.");
  }

  const current = await database.books.toArray();
  const existing = new Set(current.map((b) => b.isbn13));
  const existingIds = new Set(current.map((b) => b.id));
  const toAdd: Book[] = [];
  let skipped = 0;
  for (const raw of data.books) {
    const book = readBackupBook(raw);
    if (!book || existing.has(book.isbn13)) {
      skipped++;
      continue;
    }
    if (existingIds.has(book.id)) book.id = crypto.randomUUID();
    existing.add(book.isbn13);
    existingIds.add(book.id);
    toAdd.push(book);
  }
  await database.books.bulkAdd(toAdd);
  return { added: toAdd.length, skipped };
}

/** Starts a file download in the browser. */
export function downloadFile(contents: string, fileName: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const today = () => new Date().toISOString().slice(0, 10);

/** Downloads a full JSON backup of the library and remembers when it was made. */
export async function exportBackupNow(database: ShelfDb = db): Promise<void> {
  downloadFile(await exportJson(await database.books.toArray()), `shelfscan-backup-${today()}.json`, 'application/json');
  recordBackup();
}
