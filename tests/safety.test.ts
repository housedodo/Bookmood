import { createBook } from '../src/data/db';
import { booksSinceBackup, getLastBackupAt, recordBackup, shouldRemindBackup, snoozeBackupReminder } from '../src/lib/safety';

const at = (dateAdded: number) => ({ ...createBook({ isbn13: crypto.randomUUID(), title: 'B', source: 'manual' }), dateAdded });

beforeEach(() => localStorage.clear());

describe('backup reminder', () => {
  it('counts books added since the last backup', () => {
    const books = [at(100), at(200), at(300)];
    expect(booksSinceBackup(books, undefined)).toBe(3);
    expect(booksSinceBackup(books, 150)).toBe(2);
  });

  it('reminds after 3 new books, not before', () => {
    expect(shouldRemindBackup([at(1), at(2)], 1000, undefined, undefined)).toBe(false);
    expect(shouldRemindBackup([at(1), at(2), at(3)], 1000, undefined, undefined)).toBe(true);
    expect(shouldRemindBackup([at(1), at(2), at(3)], 1000, 500, undefined)).toBe(false);
  });

  it('stays quiet while snoozed', () => {
    const books = [at(1), at(2), at(3)];
    expect(shouldRemindBackup(books, 1000, undefined, 2000)).toBe(false);
    expect(shouldRemindBackup(books, 3000, undefined, 2000)).toBe(true);
  });

  it('remembers backups and snoozes in localStorage', () => {
    recordBackup(12345);
    expect(getLastBackupAt()).toBe(12345);
    snoozeBackupReminder(0);
    expect(shouldRemindBackup([at(20000), at(20001), at(20002)], 1000)).toBe(false);
  });
});
