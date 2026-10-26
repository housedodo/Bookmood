import { useState } from 'react';
import { deleteBook, updateBook, type Book, type ReadStatus } from '../data/db';
import { bookThemeStyle } from '../lib/bookTheme';
import { refreshBook, type RefreshOutcome } from '../lib/refresh';
import BookCover from './BookCover';
import Icon from './Icon';
import Rating from './Rating';
import Sheet from './Sheet';
import '../styles/bookdetail.css';

const STATUSES: { value: ReadStatus; label: string }[] = [
  { value: 'unread', label: 'Unread' },
  { value: 'reading', label: 'Reading' },
  { value: 'read', label: 'Read' },
];

const REFRESH_TEXT: Record<RefreshOutcome, string> = {
  updated: 'Found more ♡',
  unchanged: 'Nothing new this time',
  notFound: "Couldn't find it online",
  offline: "You're offline",
};

export default function BookDetail({ book, onClose }: { book: Book; onClose: () => void }) {
  const [tagDraft, setTagDraft] = useState('');
  const [notes, setNotes] = useState(book.notes ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<RefreshOutcome>();

  const refresh = async () => {
    setRefreshing(true);
    setRefreshResult(await refreshBook(book));
    setRefreshing(false);
  };

  const save = (changes: Partial<Book>) => updateBook(book.id, changes);

  const addTag = () => {
    const tag = tagDraft.trim().toLowerCase();
    if (tag && !book.tags.includes(tag)) save({ tags: [...book.tags, tag], hiddenTags: book.hiddenTags?.filter((t) => t !== tag) });
    setTagDraft('');
  };

  // Remembered in hiddenTags, so "Refresh info" won't add an automatic tag back.
  const removeTag = (tag: string) =>
    save({ tags: book.tags.filter((t) => t !== tag), hiddenTags: [...new Set([...(book.hiddenTags ?? []), tag])] });

  const remove = async () => {
    await deleteBook(book.id);
    onClose();
  };

  const isbn = book.isbn13.startsWith('manual:') ? undefined : book.isbn13;
  const meta = [book.pageCount && `${book.pageCount} pages`, isbn && `ISBN ${isbn}`].filter(Boolean).join(' · ');

  return (
    <Sheet title={book.title} onClose={onClose} className="book-theme book-detail" style={bookThemeStyle(book.themeHue)}>
      <div className="detail-top">
        <BookCover book={book} className="detail-cover" />
        <div className="detail-info">
          {book.authors.length > 0 && <p className="detail-authors">{book.authors.join(', ')}</p>}
          {meta && <p className="detail-meta">{meta}</p>}
          <Rating value={book.rating} onChange={(rating) => save({ rating })} />
        </div>
      </div>

      <div className="segmented" role="group" aria-label="Reading status">
        {STATUSES.map(({ value, label }) => (
          <button key={value} type="button" aria-pressed={book.status === value} onClick={() => save({ status: value })}>
            {label}
          </button>
        ))}
      </div>

      {book.genres.length > 0 && (
        <div className="detail-genres">
          {book.genres.map((genre) => (
            <span key={genre} className="genre-pill">{genre}</span>
          ))}
        </div>
      )}

      {book.description && <p className="detail-description">{book.description}</p>}

      <section className="detail-section">
        <h3>Tags</h3>
        <div className="tag-list">
          {book.tags.map((tag) => (
            <button key={tag} type="button" className="tag" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`}>
              {tag} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
        <form
          className="tag-form"
          onSubmit={(event) => {
            event.preventDefault();
            addTag();
          }}
        >
          <label className="visually-hidden" htmlFor="tag-input">New tag</label>
          <input id="tag-input" className="input" value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} placeholder="e.g. hockey, summer read" />
          <button type="submit" className="btn btn-small" aria-label="Add tag">
            <Icon name="plus" className="btn-icon" />
          </button>
        </form>
      </section>

      <section className="detail-section">
        <h3><label htmlFor="notes">Notes</label></h3>
        <textarea
          id="notes"
          className="textarea detail-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (book.notes ?? '') && save({ notes: notes || undefined })}
          placeholder="little thoughts…"
        />
      </section>

      <section className="detail-section">
        <div className="detail-refresh">
          <button type="button" className="btn btn-small btn-secondary" onClick={refresh} disabled={refreshing}>
            {refreshing ? 'Looking…' : 'Refresh book info'}
          </button>
          {refreshResult && <span className="hand">{REFRESH_TEXT[refreshResult]}</span>}
        </div>
        <p className="detail-hint">Fetches more subjects, tags and a description. Your own tags, notes and rating stay.</p>
      </section>

      <div className="detail-delete">
        {confirmDelete ? (
          <>
            <span className="hand">Really remove this book?</span>
            <button type="button" className="btn btn-small" onClick={remove}>Yes, delete</button>
            <button type="button" className="btn btn-small btn-secondary" onClick={() => setConfirmDelete(false)}>Keep it</button>
          </>
        ) : (
          <button type="button" className="btn btn-small btn-secondary" onClick={() => setConfirmDelete(true)}>
            <Icon name="trash" className="btn-icon" /> Delete book
          </button>
        )}
      </div>
    </Sheet>
  );
}
