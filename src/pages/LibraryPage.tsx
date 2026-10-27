import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BackupReminder from '../components/BackupReminder';
import BookCard from '../components/BookCard';
import BookDetail from '../components/BookDetail';
import FilterBar from '../components/FilterBar';
import HeartConfetti from '../components/HeartConfetti';
import Icon from '../components/Icon';
import IsbnLookup from '../components/IsbnLookup';
import ManualAddForm from '../components/ManualAddForm';
import Sheet from '../components/Sheet';
import Shelves from '../components/Shelves';
import Toast, { type ToastData } from '../components/Toast';
import { db, type Book } from '../data/db';
import { moodUnknown } from '../lib/moodInfo';
import { activeFilters, clearFilter, DEFAULT_FILTERS, filterBooks, libraryGenres, sortBooks, type SortKey } from '../lib/library';
import '../styles/library.css';

export default function LibraryPage() {
  const books = useLiveQuery(() => db.books.toArray(), []);
  // The open book lives in the URL (?book=<id>) so other pages can link to it and Back closes it.
  // ?unknown=1 (from the Pick page) opens the library filtered to books whose mood is unknown.
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_FILTERS, needsMoodInfo: searchParams.get('unknown') === '1' }));
  const [sort, setSort] = useState<SortKey>('recent');
  const openId = searchParams.get('book') ?? undefined;
  const setOpenId = useCallback((id?: string) => setSearchParams(id ? { book: id } : {}), [setSearchParams]);
  const [filtering, setFiltering] = useState(false);
  const [adding, setAdding] = useState(false);
  const [prefillIsbn, setPrefillIsbn] = useState('');
  const [toast, setToast] = useState<ToastData>();
  const [confettiKey, setConfettiKey] = useState(0);
  const clearToast = useCallback(() => setToast(undefined), []);
  const closeDetail = useCallback(() => setOpenId(undefined), [setOpenId]);
  const closeFilters = useCallback(() => setFiltering(false), []);
  const closeAdd = useCallback(() => {
    setAdding(false);
    setPrefillIsbn('');
  }, []);

  const shown = useMemo(() => sortBooks(filterBooks(books ?? [], filters), sort), [books, filters, sort]);
  const genres = useMemo(() => libraryGenres(books ?? []), [books]);
  const moodUnknownCount = useMemo(() => (books ?? []).filter(moodUnknown).length, [books]);
  const active = activeFilters(filters);
  // Shelves are the calm default; searching or filtering switches to a plain grid of results.
  const showResults = active.length > 0 || filters.query.trim() !== '';
  const openBook = books?.find((book) => book.id === openId);
  const unread = books?.filter((book) => book.status === 'unread').length ?? 0;

  const onAdded = (book: Book) => {
    closeAdd();
    setConfettiKey((n) => n + 1);
    setToast({ message: `Added “${book.title}” ♡` });
  };
  const onDuplicate = (book: Book) => {
    closeAdd();
    setToast({ message: 'Already in your library ♡', action: { label: 'Open', onClick: () => setOpenId(book.id) } });
  };

  if (!books) return <main className="page" aria-busy="true" />;

  return (
    <main className="page library">
      <header className="library-header">
        <div>
          <h1 className="page-title">My Shelf</h1>
          <p className="page-subtitle">
            {books.length === 0 ? 'all your lovely books, in one place' : `${books.length} book${books.length === 1 ? '' : 's'} · ${unread} unread`}
          </p>
        </div>
        <div className="library-header-actions">
          <button type="button" className="icon-button" onClick={() => setAdding(true)} aria-label="Add a book">
            <Icon name="plus" />
          </button>
          <Link to="/settings" className="icon-button" aria-label="Settings">
            <Icon name="settings" />
          </Link>
        </div>
      </header>

      {books.length === 0 ? (
        <div className="placeholder">
          <p className="placeholder-text">Your shelf is empty. Scan your first book! 📚</p>
          <div className="placeholder-actions">
            <Link to="/scan" className="btn">Scan a book</Link>
            <button type="button" className="btn btn-secondary" onClick={() => setAdding(true)}>Add by hand</button>
          </div>
        </div>
      ) : (
        <>
          <div className="search-row">
            <label className="search">
              <Icon name="search" className="search-icon" />
              <span className="visually-hidden">Search title or author</span>
              <input
                type="search"
                value={filters.query}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                placeholder="Search your shelf"
              />
            </label>
            <button
              type="button"
              className={`icon-button filter-button ${active.length ? 'is-accent' : ''}`}
              onClick={() => setFiltering(true)}
              aria-label={active.length ? `Filters, ${active.length} on` : 'Filters'}
            >
              <Icon name="filter" />
              {active.length > 0 && <span className="filter-badge" aria-hidden="true">{active.length}</span>}
            </button>
          </div>

          {active.length > 0 && (
            <div className="active-filters">
              {active.map(({ key, label }) => (
                <button key={key} type="button" className="chip" onClick={() => setFilters(clearFilter(filters, key))} aria-label={`Remove filter ${label}`}>
                  {label} <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}

          <BackupReminder books={books} />

          {!showResults ? (
            <Shelves books={books} onOpen={(b) => setOpenId(b.id)} onSeeAll={(status) => setFilters({ ...filters, status })} />
          ) : shown.length === 0 ? (
            <div className="placeholder">
              <p className="placeholder-text">No books match.</p>
              <button type="button" className="btn btn-secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>Show my whole shelf</button>
            </div>
          ) : (
            <div className="book-grid">
              {shown.map((book) => (
                <BookCard key={book.id} book={book} onOpen={(b) => setOpenId(b.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {filtering && (
        <Sheet title="Filter & sort" onClose={closeFilters}>
          <FilterBar filters={filters} onChange={setFilters} sort={sort} onSortChange={setSort} genres={genres} moodUnknownCount={moodUnknownCount} />
          <div className="filter-sheet-actions">
            <button type="button" className="btn" onClick={closeFilters}>
              Show {filterBooks(books, filters).length} book{filterBooks(books, filters).length === 1 ? '' : 's'}
            </button>
            {active.length > 0 && (
              <button type="button" className="btn btn-secondary" onClick={() => setFilters({ ...DEFAULT_FILTERS, query: filters.query })}>
                Clear all
              </button>
            )}
          </div>
        </Sheet>
      )}

      {openBook && <BookDetail key={openBook.id} book={openBook} onClose={closeDetail} />}

      {adding && (
        <Sheet title="Add a book" onClose={closeAdd}>
          <IsbnLookup onAdded={onAdded} onDuplicate={onDuplicate} onNotFound={setPrefillIsbn} />
          <p className="form-divider hand">or fill it in yourself</p>
          <ManualAddForm key={prefillIsbn} initialIsbn={prefillIsbn} onAdded={onAdded} onDuplicate={onDuplicate} />
        </Sheet>
      )}

      {confettiKey > 0 && <HeartConfetti key={confettiKey} />}
      {toast && <Toast toast={toast} onDone={clearToast} />}
    </main>
  );
}
