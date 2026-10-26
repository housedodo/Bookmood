import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BookCover from '../components/BookCover';
import HeartConfetti from '../components/HeartConfetti';
import MoodChips from '../components/MoodChips';
import IsbnLookup from '../components/IsbnLookup';
import ManualAddForm from '../components/ManualAddForm';
import Scanner from '../components/Scanner';
import Sheet from '../components/Sheet';
import TitleSearch from '../components/TitleSearch';
import Toast, { type ToastData } from '../components/Toast';
import { deleteBook, updateBook, type Book } from '../data/db';
import { addByIsbn, type AddByIsbnResult } from '../lib/addBook';
import { createScanGate } from '../lib/barcode';
import { bookThemeStyle } from '../lib/bookTheme';
import type { TitleSearchResult } from '../lib/lookup';
import '../styles/scan.css';

const UNDO_MS = 5000;
const STICKER_HINT_MS = 6000;

interface ManualPrefill {
  offline?: boolean;
  isbn?: string;
  title?: string;
  authors?: string[];
}

export default function ScanPage() {
  const navigate = useNavigate();
  const [batch, setBatch] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<Book[]>([]);
  const [undoId, setUndoId] = useState<string>();
  const [manual, setManual] = useState<ManualPrefill>();
  const [showTitleSearch, setShowTitleSearch] = useState(false);
  const [toast, setToast] = useState<ToastData>();
  const [flashKey, setFlashKey] = useState(0);
  const [confettiKey, setConfettiKey] = useState(0);
  const [stickerHint, setStickerHint] = useState(false);
  const busyRef = useRef(false);
  const gateRef = useRef(createScanGate(3000));
  const clearToast = useCallback(() => setToast(undefined), []);

  useEffect(() => {
    if (!stickerHint) return;
    const timer = setTimeout(() => setStickerHint(false), STICKER_HINT_MS);
    return () => clearTimeout(timer);
  }, [stickerHint]);

  useEffect(() => {
    if (!undoId) return;
    const timer = setTimeout(() => setUndoId(undefined), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undoId]);

  const onAdded = (book: Book) => {
    setManual(undefined);
    setAdded((list) => [book, ...list.filter((b) => b.id !== book.id)]);
    setUndoId(book.id);
    setConfettiKey((n) => n + 1);
    if (!batch) setCameraOn(false);
  };

  const onDuplicate = (book: Book) => {
    setManual(undefined);
    setToast({ message: 'Already in your library ♡', action: { label: 'Open', onClick: () => navigate(`/?book=${book.id}`) } });
  };

  const handleResult = (result: AddByIsbnResult, isbn: string) => {
    switch (result.kind) {
      case 'added':
        return onAdded(result.book);
      case 'duplicate':
        return onDuplicate(result.book);
      case 'offline':
        return setManual({ isbn, offline: true });
      case 'notFound':
        return setManual({ isbn });
    }
  };

  const lookUp = async (isbn: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const result = await addByIsbn(isbn);
    busyRef.current = false;
    setBusy(false);
    handleResult(result, isbn);
  };

  const onScan = (isbn: string) => {
    if (busyRef.current || !gateRef.current(isbn)) return;
    setStickerHint(false);
    navigator.vibrate?.(80);
    setFlashKey((n) => n + 1);
    void lookUp(isbn);
  };

  // The camera sees the code many times per second; the hint just stays up while it does.
  const onOtherCode = useCallback(() => {
    if (!busyRef.current) setStickerHint(true);
  }, []);

  const onPickTitle = (result: TitleSearchResult) => {
    setShowTitleSearch(false);
    if (result.isbn13) void lookUp(result.isbn13);
    else setManual({ title: result.title, authors: result.authors });
  };

  const setMoods = (book: Book, moods: string[]) => {
    void updateBook(book.id, { moods });
    setAdded((list) => list.map((b) => (b.id === book.id ? { ...b, moods } : b)));
  };

  const undo = async (book: Book) => {
    await deleteBook(book.id);
    setAdded((list) => list.filter((b) => b.id !== book.id));
    setUndoId(undefined);
    setToast({ message: `Removed “${book.title}”` });
  };

  const shownBooks = batch ? added : added.slice(0, 1);

  return (
    <main className="page scan">
      <header className="scan-header">
        <div>
          <h1 className="page-title">Scan a Book</h1>
          <p className="page-subtitle">point your camera at the barcode</p>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={batch} onChange={(e) => { setBatch(e.target.checked); if (e.target.checked) setCameraOn(true); }} />
          <span className="toggle-track" aria-hidden="true" />
          Batch
        </label>
      </header>

      <Scanner active={cameraOn && !manual} onIsbn={onScan} onOtherCode={onOtherCode} flashKey={flashKey} />

      {stickerHint && !busy && (
        <p className="scan-sticker-hint" role="status">
          <span className="hand">That's not a book barcode — maybe a shop sticker?</span> Peel it off if it comes off easily, or type the
          ISBN / search by title below ♡
        </p>
      )}

      {busy && <p className="scan-status hand" role="status">Looking it up…</p>}
      {!cameraOn && !busy && (
        <button type="button" className="btn" onClick={() => setCameraOn(true)}>Scan another</button>
      )}

      {shownBooks.length > 0 && (
        <section className="scan-added" aria-label={batch ? 'Added this session' : 'Just added'}>
          {batch && <h2 className="scan-added-title">Added this session · {added.length}</h2>}
          {shownBooks.map((book) => (
            <div key={book.id} className="scan-card book-theme" style={bookThemeStyle(book.themeHue)}>
              <div className="scan-card-top">
                <BookCover book={book} className="scan-card-cover" />
                <div className="scan-card-text">
                  <strong>{book.title}</strong>
                  {book.authors.length > 0 && <span>{book.authors.join(', ')}</span>}
                  <span className="hand">added to your shelf ♡</span>
                </div>
                {undoId === book.id && (
                  <button type="button" className="btn btn-small btn-secondary scan-undo" onClick={() => undo(book)}>
                    <span className="hand">Undo</span>
                  </button>
                )}
              </div>
              <span className="scan-card-moods-label">How does it feel? <small>(optional)</small></span>
              <MoodChips selected={book.moods ?? []} onChange={(moods) => setMoods(book, moods)} label={`Moods for ${book.title}`} />
            </div>
          ))}
        </section>
      )}

      <section className="scan-backup">
        <p className="scan-tip">
          <strong>Sticker over the barcode?</strong> The ISBN is also printed inside the book, on the copyright page (usually the
          back of the title page).
        </p>
        <IsbnLookup onAdded={onAdded} onDuplicate={onDuplicate} onNotFound={(isbn) => setManual({ isbn, offline: !navigator.onLine })} />
        {showTitleSearch ? (
          <TitleSearch onPick={onPickTitle} />
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => setShowTitleSearch(true)}>Search by title</button>
        )}
      </section>

      {manual && (
        <Sheet title="Add it by hand" onClose={() => setManual(undefined)}>
          <p className="hand scan-manual-hint">
            {manual.offline
              ? "You're offline — I'll need internet to find that book. You can add it manually!"
              : manual.isbn
                ? "I couldn't find this book online. Fill in what you know ♡"
                : 'No ISBN for this one — fill in what you know ♡'}
          </p>
          <ManualAddForm initialIsbn={manual.isbn} initialTitle={manual.title} initialAuthors={manual.authors} onAdded={onAdded} onDuplicate={onDuplicate} />
        </Sheet>
      )}

      {confettiKey > 0 && <HeartConfetti key={confettiKey} />}
      {toast && <Toast toast={toast} onDone={clearToast} />}
    </main>
  );
}
