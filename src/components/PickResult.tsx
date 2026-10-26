import type { Book } from '../data/db';
import { bookThemeStyle } from '../lib/bookTheme';
import BookCover from './BookCover';
import '../styles/pick.css';

interface PickResultProps {
  book: Book;
  reason: string;
  onStart: (book: Book) => void;
  onNotNow: (book: Book) => void;
  onOpen: (book: Book) => void;
}

export default function PickResult({ book, reason, onStart, onNotNow, onOpen }: PickResultProps) {
  return (
    <article className="pick-result book-theme" style={bookThemeStyle(book.themeHue)}>
      <button type="button" className="pick-result-main" onClick={() => onOpen(book)}>
        <BookCover book={book} className="pick-result-cover" />
        <span className="pick-result-text">
          <strong>{book.title}</strong>
          {book.authors.length > 0 && <span>{book.authors.join(', ')}</span>}
          {book.pageCount && <span className="pick-result-pages">{book.pageCount} pages</span>}
          <span className="hand pick-result-reason">{reason}</span>
        </span>
      </button>
      <div className="pick-result-actions">
        <button type="button" className="btn btn-small" onClick={() => onStart(book)}>Start reading</button>
        <button type="button" className="btn btn-small btn-secondary" onClick={() => onNotNow(book)}>Not now</button>
      </div>
    </article>
  );
}
