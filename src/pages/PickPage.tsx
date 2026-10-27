import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HeartConfetti from '../components/HeartConfetti';
import MoodPicker from '../components/MoodPicker';
import PickResult from '../components/PickResult';
import Toast, { type ToastData } from '../components/Toast';
import { db, updateBook, type Book } from '../data/db';
import { moodUnknown } from '../lib/moodInfo';
import { recommend, surprise } from '../lib/recommend';
import { notNowIds } from '../lib/session';
import '../styles/pick.css';

type MaxLength = 'any' | 'short' | 'medium';

const LENGTHS: { value: MaxLength; label: string; maxPages?: number }[] = [
  { value: 'any', label: 'Any' },
  { value: 'short', label: 'Short', maxPages: 249 },
  { value: 'medium', label: 'Medium', maxPages: 450 },
];

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

export default function PickPage() {
  const navigate = useNavigate();
  const books = useLiveQuery(() => db.books.toArray(), []);
  const [moods, setMoods] = useState<string[]>([]);
  const [maxLength, setMaxLength] = useState<MaxLength>('any');
  const [seed, setSeed] = useState(newSeed);
  const [shownBefore, setShownBefore] = useState<string[]>([]);
  // Bumped by "Not now" so the results recompute (notNowIds is a plain Set).
  const [hiddenCount, setHiddenCount] = useState(notNowIds.size);
  const [surprisePick, setSurprisePick] = useState<Book>();
  const [toast, setToast] = useState<ToastData>();
  const [confettiKey, setConfettiKey] = useState(0);
  const clearToast = useCallback(() => setToast(undefined), []);

  const maxPages = LENGTHS.find((l) => l.value === maxLength)?.maxPages;
  const results = useMemo(
    () => (books ? recommend(books, moods, { maxPages, seed, excludeIds: [...shownBefore, ...notNowIds] }) : []),
    // hiddenCount is a dependency on purpose: it changes when notNowIds does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [books, moods, maxPages, seed, shownBefore, hiddenCount],
  );
  const unreadCount = books?.filter((b) => b.status === 'unread').length ?? 0;
  const moodUnknownBooks = useMemo(() => (books ?? []).filter((b) => b.status === 'unread' && moodUnknown(b)), [books]);
  const shownSurprise = surprisePick && books?.find((b) => b.id === surprisePick.id && b.status === 'unread');

  const resetRound = () => {
    setShownBefore([]);
    setSurprisePick(undefined);
    setSeed(newSeed());
  };

  const toggleMood = (id: string) => {
    setMoods((current) => (current.includes(id) ? current.filter((m) => m !== id) : [...current, id]));
    resetRound();
  };

  const showAnother = () => {
    setShownBefore((ids) => [...ids, ...results.map((r) => r.book.id)]);
    setSeed(newSeed());
  };

  const pickSurprise = () => {
    const book = books && surprise(books, [...notNowIds]);
    setSurprisePick(book);
    if (!book) setToast({ message: 'No unread books left to surprise you with ♡' });
  };

  const startReading = async (book: Book) => {
    await updateBook(book.id, { status: 'reading' });
    setConfettiKey((n) => n + 1);
    setToast({ message: `Enjoy “${book.title}” ♡`, action: { label: 'Open', onClick: () => navigate(`/?book=${book.id}`) } });
  };

  const notNow = (book: Book) => {
    notNowIds.add(book.id);
    setHiddenCount(notNowIds.size);
    if (surprisePick?.id === book.id) setSurprisePick(undefined);
  };

  const open = (book: Book) => navigate(`/?book=${book.id}`);

  if (!books) return <main className="page" aria-busy="true" />;

  return (
    <main className="page pick">
      <header>
        <h1 className="page-title">What are you in the mood for?</h1>
        <p className="page-subtitle">pick one or more moods ♡</p>
      </header>

      {unreadCount === 0 ? (
        <div className="placeholder">
          <p className="placeholder-text">
            {books.length === 0 ? 'Your shelf is empty. Scan your first book! 📚' : "You've read everything on your shelf — time for new books!"}
          </p>
          <Link to="/scan" className="btn">Scan a book</Link>
        </div>
      ) : (
        <>
          <MoodPicker selected={moods} onToggle={toggleMood} />

          <div className="pick-length">
            <span className="pick-length-label">Max length</span>
            <div className="chip-row" role="group" aria-label="Max length">
              {LENGTHS.map(({ value, label }) => (
                <button key={value} type="button" className="chip" aria-pressed={maxLength === value} onClick={() => { setMaxLength(value); resetRound(); }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {shownSurprise ? (
            <section className="pick-results" aria-label="Surprise pick">
              <PickResult book={shownSurprise} reason="Surprise! ♡" onStart={startReading} onNotNow={notNow} onOpen={open} />
              <div className="pick-buttons">
                <button type="button" className="btn" onClick={pickSurprise}>Surprise me again</button>
                <button type="button" className="btn btn-secondary" onClick={() => setSurprisePick(undefined)}>Back to moods</button>
              </div>
            </section>
          ) : moods.length > 0 && (
            <section className="pick-results" aria-label="Suggestions">
              {results.length > 0 ? (
                results.map(({ book, reason }) => (
                  <PickResult key={book.id} book={book} reason={reason} onStart={startReading} onNotNow={notNow} onOpen={open} />
                ))
              ) : (
                <div className="placeholder">
                  <p className="placeholder-text">
                    {shownBefore.length > 0
                      ? "That's every match for this mood ♡"
                      : 'Nothing in your unread pile matches this mood yet 🌸 Try another mood or add more books!'}
                  </p>
                  {shownBefore.length > 0 && <button type="button" className="btn btn-secondary" onClick={resetRound}>Start over</button>}
                </div>
              )}
              <div className="pick-buttons">
                {results.length > 0 && <button type="button" className="btn btn-secondary" onClick={showAnother}>Show another</button>}
                <button type="button" className="btn" onClick={pickSurprise}>Surprise me</button>
              </div>
            </section>
          )}

          {moods.length === 0 && !shownSurprise && (
            <div className="pick-buttons">
              <button type="button" className="btn btn-secondary" onClick={pickSurprise}>Just surprise me</button>
            </div>
          )}

          {moodUnknownBooks.length > 0 && (
            <p className="pick-unknown-line">
              <Link to="/?unknown=1">
                {moodUnknownBooks.length === 1 ? '1 book needs' : `${moodUnknownBooks.length} books need`} a back-cover photo before I can tell
                {moodUnknownBooks.length === 1 ? ' its' : ' their'} mood
              </Link>
            </p>
          )}
        </>
      )}

      {confettiKey > 0 && <HeartConfetti key={confettiKey} />}
      {toast && <Toast toast={toast} onDone={clearToast} />}
    </main>
  );
}
