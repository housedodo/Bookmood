import type { Book } from '../data/db';

// Keeping the library safe: ask the browser not to clear our storage, and remember when the
// last backup was made so the app can remind you. Small settings like these live in
// localStorage (wrapped, because private modes can block it).

const LAST_BACKUP_KEY = 'shelfscan:lastBackupAt';
const SNOOZE_KEY = 'shelfscan:backupReminderSnoozedUntil';
const DAY = 24 * 60 * 60 * 1000;

/** Books added since the last backup before the Library shows a reminder. */
export const REMIND_AFTER_BOOKS = 3;

function readNumber(key: string): number | undefined {
  try {
    const value = Number(localStorage.getItem(key));
    return value > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function writeNumber(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // storage blocked: the reminder just shows a bit more often
  }
}

export const getLastBackupAt = () => readNumber(LAST_BACKUP_KEY);
export const recordBackup = (now = Date.now()) => writeNumber(LAST_BACKUP_KEY, now);
export const snoozeBackupReminder = (now = Date.now()) => writeNumber(SNOOZE_KEY, now + 3 * DAY);

/** Books added after the last backup (all books if there never was one). */
export function booksSinceBackup(books: Book[], lastBackupAt = getLastBackupAt()): number {
  return books.filter((book) => lastBackupAt === undefined || book.dateAdded > lastBackupAt).length;
}

export function shouldRemindBackup(books: Book[], now = Date.now(), lastBackupAt = getLastBackupAt(), snoozedUntil = readNumber(SNOOZE_KEY)): boolean {
  if (snoozedUntil !== undefined && now < snoozedUntil) return false;
  return booksSinceBackup(books, lastBackupAt) >= REMIND_AFTER_BOOKS;
}

/** Asks the browser to keep our data even when the device is low on space. Never prompts on iOS/Chrome. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function isStoragePersisted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}

/** Running from the home screen (installed), not in a browser tab. */
export function isInstalledApp(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
