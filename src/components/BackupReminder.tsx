import { useState } from 'react';
import type { Book } from '../data/db';
import { exportBackupNow } from '../lib/exportImport';
import { booksSinceBackup, shouldRemindBackup, snoozeBackupReminder } from '../lib/safety';

/** One quiet line in the Library when several books were added since the last backup. */
export default function BackupReminder({ books }: { books: Book[] }) {
  // Bumped after "Back up" / dismiss so the check runs again.
  const [, setTick] = useState(0);
  if (!shouldRemindBackup(books)) return null;
  const count = booksSinceBackup(books);

  return (
    <p className="backup-line" role="status">
      <span>{count} book{count === 1 ? '' : 's'} not backed up yet ·</span>
      <button type="button" className="link-button" onClick={async () => { await exportBackupNow(); setTick((n) => n + 1); }}>
        Back up
      </button>
      <button type="button" className="backup-line-dismiss" aria-label="Remind me later" onClick={() => { snoozeBackupReminder(); setTick((n) => n + 1); }}>
        ×
      </button>
    </p>
  );
}
