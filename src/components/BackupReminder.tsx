import { useState } from 'react';
import type { Book } from '../data/db';
import { exportBackupNow } from '../lib/exportImport';
import { booksSinceBackup, shouldRemindBackup, snoozeBackupReminder } from '../lib/safety';

/** Small banner in the Library when several books were added since the last backup. */
export default function BackupReminder({ books }: { books: Book[] }) {
  // Bumped after "Back up now" / "Later" so the check runs again.
  const [, setTick] = useState(0);
  if (!shouldRemindBackup(books)) return null;
  const count = booksSinceBackup(books);

  return (
    <div className="backup-reminder" role="status">
      <span className="hand">
        {count} book{count === 1 ? " isn't" : "s aren't"} in a backup yet — your library only lives on this phone.
      </span>
      <div className="backup-reminder-buttons">
        <button type="button" className="btn btn-small" onClick={async () => { await exportBackupNow(); setTick((n) => n + 1); }}>
          Back up now
        </button>
        <button type="button" className="btn btn-small btn-secondary" onClick={() => { snoozeBackupReminder(); setTick((n) => n + 1); }}>
          Later
        </button>
      </div>
    </div>
  );
}
