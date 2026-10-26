import type { Book } from '../data/db';
import { bookThemeStyle } from '../lib/bookTheme';
import BookCover from './BookCover';
import '../styles/bookcard.css';

const STATUS_LABEL = { unread: '', reading: 'Reading', read: 'Read' } as const;

export default function BookCard({ book, onOpen }: { book: Book; onOpen: (book: Book) => void }) {
  const status = STATUS_LABEL[book.status];
  return (
    <button type="button" className="book-card book-theme" style={bookThemeStyle(book.themeHue)} onClick={() => onOpen(book)}>
      <BookCover book={book} />
      {status && <span className="book-card-badge">{status}</span>}
      <span className="book-card-title">{book.title}</span>
      {book.authors.length > 0 && <span className="book-card-author">{book.authors.join(', ')}</span>}
    </button>
  );
}
