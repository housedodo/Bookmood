import { useState, type CSSProperties } from 'react';
import type { Book } from '../data/db';
import { arrangeBooks, BOOKCASE_ORDERS, spineHeight, spineWidth, type BookcaseOrder } from '../lib/bookcase';
import { readPref, writePref } from '../lib/prefs';
import '../styles/bookcase.css';

const STATUS_TEXT = { unread: 'unread', reading: 'reading now', read: 'read' } as const;

/** A little virtual bookcase: every book stands on a shelf as a spine in its own color. */
export default function Bookcase({ books, onOpen }: { books: Book[]; onOpen: (book: Book) => void }) {
  const [order, setOrder] = useState<BookcaseOrder>(() => readPref('bookcaseOrder', ['newest', 'color', 'author'], 'newest'));
  const choose = (next: BookcaseOrder) => {
    setOrder(next);
    writePref('bookcaseOrder', next);
  };

  return (
    <section className="bookcase-wrap" aria-label="Bookcase">
      <div className="bookcase-order" role="group" aria-label="Arrange books by">
        {BOOKCASE_ORDERS.map(({ value, label }) => (
          <button key={value} type="button" className="chip" aria-pressed={order === value} onClick={() => choose(value)}>
            {label}
          </button>
        ))}
      </div>
      <div className="bookcase">
        <div className="bookcase-books">
          {arrangeBooks(books, order).map((book) => (
            <div key={book.id} className="spine-slot">
              <button
                type="button"
                className={`spine spine-${book.status}`}
                style={{ '--hue': book.themeHue, width: spineWidth(book.pageCount), height: spineHeight(book.title) } as CSSProperties}
                onClick={() => onOpen(book)}
                aria-label={`${book.title}${book.authors.length ? ` by ${book.authors.join(', ')}` : ''}, ${STATUS_TEXT[book.status]}`}
              >
                <span className="spine-title" aria-hidden="true">{book.title}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
      <p className="bookcase-legend">
        <span className="legend-ribbon" aria-hidden="true" /> reading now · <span aria-hidden="true">♥</span> read
      </p>
    </section>
  );
}
