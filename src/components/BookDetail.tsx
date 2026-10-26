import { useState } from 'react';
import { deleteBook, updateBook, type Book, type InfoSource, type ReadStatus } from '../data/db';
import { bookThemeStyle } from '../lib/bookTheme';
import { moodUnknown } from '../lib/moodInfo';
import { refreshBook, type RefreshOutcome } from '../lib/refresh';
import BookCover from './BookCover';
import BookEditForm from './BookEditForm';
import BlurbPhoto from './BlurbPhoto';
import MoodChips from './MoodChips';
import Icon from './Icon';
import Rating from './Rating';
import Sheet from './Sheet';
import '../styles/bookdetail.css';

const STATUSES: { value: ReadStatus; label: string }[] = [
  { value: 'unread', label: 'Unread' },
  { value: 'reading', label: 'Reading' },
  { value: 'read', label: 'Read' },
];

const INFO_SOURCE_LABEL: Record<InfoSource, string> = {
  openlibrary: 'Open Library',
  googlebooks: 'Google Books',
  dnb: 'DNB',
  wikipedia: 'Wikipedia',
};

const SOURCE_LABEL: Record<Book['source'], string> = {
  openlibrary: 'Open Library',
  googlebooks: 'Google Books',
  dnb: 'Deutsche Nationalbibliothek',
  manual: 'added by hand',
};

const REFRESH_TEXT: Record<RefreshOutcome, string> = {
  updated: 'Updated ♡',
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
  const [editing, setEditing] = useState(false);
  const [showSubjects, setShowSubjects] = useState(false);

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
  // Mood picks need words to match; tell the reader when the lookup found next to nothing.
  const thinInfo = moodUnknown(book);

  return (
    <Sheet title={book.title} onClose={onClose} className="book-theme book-detail" style={bookThemeStyle(book.themeHue)}>
      <div className="detail-top">
        <BookCover book={book} className="detail-cover" />
        <div className="detail-info">
          {book.authors.length > 0 && <p className="detail-authors">{book.authors.join(', ')}</p>}
          {meta && <p className="detail-meta">{meta}</p>}
          <Rating value={book.rating} onChange={(rating) => save({ rating })} />
          {!editing && (
            <button type="button" className="btn btn-small btn-secondary detail-edit" onClick={() => setEditing(true)}>Edit</button>
          )}
        </div>
      </div>

      {editing && <BookEditForm book={book} onDone={() => setEditing(false)} />}

      <div className="segmented" role="group" aria-label="Reading status">
        {STATUSES.map(({ value, label }) => (
          <button key={value} type="button" aria-pressed={book.status === value} onClick={() => save({ status: value })}>
            {label}
          </button>
        ))}
      </div>

      <section className="detail-section">
        <h3>{book.status === 'read' ? 'How did it feel?' : 'What mood is this book?'}</h3>
        <MoodChips selected={book.moods ?? []} onChange={(moods) => save({ moods })} label="Moods for this book" />
        <p className="detail-hint">Moods you pick here count the most when you ask for a mood.</p>
      </section>

      {book.genres.length > 0 && (
        <div className="detail-genres">
          {book.genres.map((genre) => (
            <span key={genre} className="genre-pill">{genre}</span>
          ))}
        </div>
      )}

      {book.description && <p className="detail-description">{book.description}</p>}
      {book.blurb && (
        <div className="detail-blurb">
          <span className="detail-blurb-label">From the back cover</span>
          <p>{book.blurb}</p>
        </div>
      )}

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
        <h3>Book info</h3>
        <p className="detail-info-line">
          From {book.infoSources?.length ? book.infoSources.map((s) => INFO_SOURCE_LABEL[s]).join(' + ') : SOURCE_LABEL[book.source]} ·{' '}
          {book.subjects.length} subject{book.subjects.length === 1 ? '' : 's'} ·{' '}
          {book.description ? 'description' : 'no description'}
          {book.subjects.length > 0 && (
            <>
              {' · '}
              <button type="button" className="link-button" onClick={() => setShowSubjects((v) => !v)} aria-expanded={showSubjects}>
                {showSubjects ? 'hide subjects' : 'show subjects'}
              </button>
            </>
          )}
        </p>
        {showSubjects && <p className="detail-subjects">{book.subjects.join(' · ')}</p>}
        {thinInfo && (
          <p className="detail-thin hand">
            I can't tell this book's mood yet — not much was found online. Take a photo of the back cover, or add a few tags
            (e.g. thriller, twisty, romance) ♡
          </p>
        )}
        <BlurbPhoto book={book} compact={thinInfo} />
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
