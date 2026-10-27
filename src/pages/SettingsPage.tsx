import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import Toast, { type ToastData } from '../components/Toast';
import { db } from '../data/db';
import { downloadFile, exportBackupNow, exportCsv, importJson } from '../lib/exportImport';
import { refreshAll } from '../lib/refresh';
import { getLastBackupAt, isInstalledApp, isIos, isStoragePersisted, requestPersistentStorage } from '../lib/safety';
import '../styles/settings.css';

const builtAt = new Date(__BUILD_TIME__).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (time: number) => new Date(time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

type DeleteStep = 'idle' | 'first' | 'second';

export default function SettingsPage() {
  const count = useLiveQuery(() => db.books.count(), []);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('idle');
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [toast, setToast] = useState<ToastData>();
  const clearToast = useCallback(() => setToast(undefined), []);
  const [lastBackupAt, setLastBackupAt] = useState(getLastBackupAt);
  const [persisted, setPersisted] = useState<boolean>();
  const inSafariOnIphone = isIos() && !isInstalledApp();

  useEffect(() => {
    void isStoragePersisted().then(setPersisted);
  }, []);

  const exportBackup = async () => {
    setBusy(true);
    await exportBackupNow();
    setLastBackupAt(getLastBackupAt());
    setBusy(false);
  };

  const protect = async () => {
    const granted = await requestPersistentStorage();
    setPersisted(granted);
    if (!granted) setToast({ message: 'The browser said no for now — keep making backups ♡' });
  };

  const exportSpreadsheet = async () => {
    downloadFile(exportCsv(await db.books.toArray()), `shelfscan-books-${today()}.csv`, 'text/csv;charset=utf-8');
  };

  const onImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow picking the same file again
    if (!file) return;
    setBusy(true);
    try {
      const { added, skipped } = await importJson(await file.text());
      setToast({ message: `Added ${added}, skipped ${skipped} ♡` });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Couldn't read that file." });
    } finally {
      setBusy(false);
    }
  };

  const refreshLibrary = async () => {
    const books = await db.books.toArray();
    setProgress({ done: 0, total: books.length });
    const summary = await refreshAll(books, (done, total) => setProgress({ done, total }));
    setProgress(undefined);
    const counts = `Updated ${summary.updated}, nothing new for ${summary.unchanged}${summary.notFound ? `, ${summary.notFound} not found` : ''}`;
    setToast({ message: summary.stoppedOffline ? `You're offline — stopped. ${counts}` : `${counts} ♡` });
  };

  const deleteAll = async () => {
    await db.books.clear();
    setDeleteStep('idle');
    setToast({ message: 'All books deleted. Fresh start ♡' });
  };

  return (
    <main className="page settings">
      <header>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">backups &amp; little things</p>
      </header>

      <section className="settings-card settings-safety">
        <h2>Keep your books safe</h2>
        <p>
          Your books live only on this phone. <strong>Last backup:</strong> {lastBackupAt ? formatDate(lastBackupAt) : 'never'}
        </p>
        <p>
          <strong>Storage:</strong>{' '}
          {persisted === undefined ? '…' : persisted ? "protected — the browser won't clear it to free up space ✓" : 'not protected yet'}
        </p>
        {persisted === false && (
          <button type="button" className="btn btn-small btn-secondary" onClick={protect}>Protect my books</button>
        )}
        {inSafariOnIphone && (
          <p className="settings-warning">
            You're using ShelfScan in Safari. <strong>Safari deletes a website's data if you don't open it for 7 days.</strong>{' '}
            Add it to your Home Screen (Share → Add to Home Screen) and use it from there. To take your books along: Export
            backup here, then Import backup in the Home Screen app.
          </p>
        )}
      </section>

      <section className="settings-card">
        <h2>Backup</h2>
        <p>
          {count === undefined ? '…' : `${count} book${count === 1 ? '' : 's'} on this device.`} Save a backup now and then — if
          you clear your browser data, the library is gone.
        </p>
        <div className="settings-buttons">
          <button type="button" className="btn" onClick={exportBackup} disabled={busy || !count}>Export backup (JSON)</button>
          <button type="button" className="btn btn-secondary" onClick={exportSpreadsheet} disabled={busy || !count}>Export spreadsheet (CSV)</button>
        </div>
        <p className="settings-hint">JSON is the full backup, covers included. CSV opens in Excel or Google Sheets.</p>
      </section>

      <section className="settings-card">
        <h2>Import</h2>
        <p>Load a JSON backup. Books already on your shelf (same ISBN) are skipped.</p>
        <input ref={fileInput} type="file" accept="application/json,.json" className="visually-hidden" onChange={onImportFile} tabIndex={-1} aria-hidden="true" />
        <button type="button" className="btn btn-secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
          Import backup
        </button>
      </section>

      <section className="settings-card">
        <h2>Book info</h2>
        <p>
          Fetch more subjects, trope tags (like "enemies to lovers" or "small town") and missing descriptions for every book, so
          mood picks work better. Your own tags, notes and ratings stay as they are.
        </p>
        <button type="button" className="btn btn-secondary" onClick={refreshLibrary} disabled={busy || Boolean(progress) || !count}>
          {progress ? `Refreshing… ${progress.done} / ${progress.total}` : 'Refresh all books'}
        </button>
        {progress && <p className="settings-hint">Keep this page open — it takes about a second per book.</p>}
      </section>

      <section className="settings-card settings-danger">
        <h2>Delete all data</h2>
        {deleteStep === 'idle' && (
          <button type="button" className="btn btn-secondary" onClick={() => setDeleteStep('first')} disabled={!count}>Delete all books…</button>
        )}
        {deleteStep === 'first' && (
          <>
            <p className="hand">This removes every book, cover and note from this device. Are you sure?</p>
            <div className="settings-buttons">
              <button type="button" className="btn" onClick={() => setDeleteStep('second')}>Yes, continue</button>
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteStep('idle')}>Cancel</button>
            </div>
          </>
        )}
        {deleteStep === 'second' && (
          <>
            <p className="hand">Last chance — this can't be undone. Maybe export a backup first?</p>
            <div className="settings-buttons">
              <button type="button" className="btn" onClick={deleteAll}>Delete everything</button>
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteStep('idle')}>Keep my books</button>
            </div>
          </>
        )}
      </section>

      <section className="settings-about">
        <p className="hand">Made with 💗 — all your data lives only on this device.</p>
        <p className="build-info">Version built {builtAt}</p>
      </section>

      {toast && <Toast toast={toast} onDone={clearToast} />}
    </main>
  );
}
