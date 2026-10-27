import type { Book, ReadStatus } from '../data/db';
import { bookThemeStyle } from '../lib/bookTheme';
import BookCover from './BookCover';
import '../styles/shelves.css';

const STRIP_MAX = 12;

interface ShelvesProps {
  books: Book[];
  onOpen: (book: Book) => void;
  onSeeAll: (status: ReadStatus) => void;
}

const newestFirst = (a: Book, b: Book) => b.dateAdded - a.dateAdded;

/** The calm default view of the library: Reading now, Up next, Finished. */
export default function Shelves({ books, onOpen, onSeeAll }: ShelvesProps) {
  const reading = books.filter((b) => b.status === 'reading').sort(newestFirst);
  const unread = books.filter((b) => b.status === 'unread').sort(newestFirst);
  const read = books.filter((b) => b.status === 'read').sort(newestFirst);

  return (
    <div className="shelves">
      {reading.length > 0 && (
        <section className="shelf" aria-label="Reading now">
          <h2 className="shelf-title">Reading now</h2>
          {reading.map((book) => (
            <button key={book.id} type="button" className="reading-card book-theme" style={bookThemeStyle(book.themeHue)} onClick={() => onOpen(book)}>
              <BookCover book={book} className="reading-card-cover" />
              <span className="reading-card-text">
                <strong>{book.title}</strong>
                {book.authors.length > 0 && <span>{book.authors.join(', ')}</span>}
                <span className="hand">enjoy your read ♡</span>
              </span>
            </button>
          ))}
        </section>
      )}
      <Strip title="Up next" books={unread} onOpen={onOpen} onSeeAll={() => onSeeAll('unread')} />
      <Strip title="Finished" books={read} onOpen={onOpen} onSeeAll={() => onSeeAll('read')} small />
    </div>
  );
}

interface StripProps {
  title: string;
  books: Book[];
  onOpen: (book: Book) => void;
  onSeeAll: () => void;
  small?: boolean;
}

function Strip({ title, books, onOpen, onSeeAll, small = false }: StripProps) {
  if (books.length === 0) return null;
  return (
    <section className="shelf" aria-label={title}>
      <div className="shelf-head">
        <h2 className="shelf-title">
          {title} <span className="shelf-count">· {books.length}</span>
        </h2>
        <button type="button" className="link-button" onClick={onSeeAll}>See all</button>
      </div>
      <div className={`strip ${small ? 'strip-small' : ''}`}>
        {books.slice(0, STRIP_MAX).map((book) => (
          <button key={book.id} type="button" className="strip-book book-theme" style={bookThemeStyle(book.themeHue)} onClick={() => onOpen(book)}>
            <BookCover book={book} />
            {!small && <span className="strip-title">{book.title}</span>}
            {small && <span className="visually-hidden">{book.title}</span>}
          </button>
        ))}
      </div>
    </section>
  );
}
