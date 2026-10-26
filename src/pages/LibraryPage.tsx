import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BookCard from '../components/BookCard';
import BookDetail from '../components/BookDetail';
import FilterBar from '../components/FilterBar';
import Icon from '../components/Icon';
import IsbnLookup from '../components/IsbnLookup';
import ManualAddForm from '../components/ManualAddForm';
import Sheet from '../components/Sheet';
import Toast, { type ToastData } from '../components/Toast';
import { db, type Book } from '../data/db';
import { DEFAULT_FILTERS, filterBooks, libraryGenres, sortBooks, type SortKey } from '../lib/library';
import '../styles/library.css';

export default function LibraryPage() {
  const books = useLiveQuery(() => db.books.toArray(), []);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>('recent');
  const [openId, setOpenId] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [prefillIsbn, setPrefillIsbn] = useState('');
  const [toast, setToast] = useState<ToastData>();
  const clearToast = useCallback(() => setToast(undefined), []);
  const closeDetail = useCallback(() => setOpenId(undefined), []);
  const closeAdd = useCallback(() => {
    setAdding(false);
    setPrefillIsbn('');
  }, []);

  const shown = useMemo(() => sortBooks(filterBooks(books ?? [], filters), sort), [books, filters, sort]);
  const genres = useMemo(() => libraryGenres(books ?? []), [books]);
  const openBook = books?.find((book) => book.id === openId);
  const unread = books?.filter((book) => book.status === 'unread').length ?? 0;

  const onAdded = (book: Book) => {
    closeAdd();
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
            {books.length === 0
              ? 'all your lovely books, in one place'
              : `${books.length} book${books.length === 1 ? '' : 's'}, ${unread} waiting to be read`}
          </p>
        </div>
        <button type="button" className="btn btn-small" onClick={() => setAdding(true)}>
          <Icon name="plus" className="btn-icon" /> Add
        </button>
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
          <label className="search">
            <Icon name="search" className="search-icon" />
            <span className="visually-hidden">Search title or author</span>
            <input
              type="search"
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              placeholder="Search title or author"
            />
          </label>
          <FilterBar filters={filters} onChange={setFilters} sort={sort} onSortChange={setSort} genres={genres} />
          {shown.length === 0 ? (
            <div className="placeholder">
              <p className="placeholder-text">No books match these filters.</p>
              <button type="button" className="btn btn-secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>Clear filters</button>
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

      {openBook && <BookDetail key={openBook.id} book={openBook} onClose={closeDetail} />}

      {adding && (
        <Sheet title="Add a book" onClose={closeAdd}>
          <IsbnLookup onAdded={onAdded} onDuplicate={onDuplicate} onNotFound={setPrefillIsbn} />
          <p className="form-divider hand">or fill it in yourself</p>
          <ManualAddForm key={prefillIsbn} initialIsbn={prefillIsbn} onAdded={onAdded} onDuplicate={onDuplicate} />
        </Sheet>
      )}

      {toast && <Toast toast={toast} onDone={clearToast} />}
    </main>
  );
}
