import { useRef, useState, type FormEvent } from 'react';
import { deleteBook, updateBook, type Book, type InfoSource, type ReadStatus } from '../data/db';
import { MOODS } from '../data/moods';
import { bookThemeStyle } from '../lib/bookTheme';
import { bookMoods, moodUnknown } from '../lib/moodInfo';
import { refreshBook, type RefreshOutcome } from '../lib/refresh';
import BlurbPhoto from './BlurbPhoto';
import BookCover from './BookCover';
import BookEditForm from './BookEditForm';
import BookMenu from './BookMenu';
import ClampText from './ClampText';
import MoodChips from './MoodChips';
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

const moodLabel = (id: string) => MOODS.find((m) => m.id === id)?.label ?? id;

/**
 * The book sheet: the things you use often are on screen (status, rating, moods, summary, tags, notes);
 * everything else lives in the ⋯ menu.
 */
export default function BookDetail({ book, onClose }: { book: Book; onClose: () => void }) {
  const [notes, setNotes] = useState(book.notes ?? '');
  const [notesOpen, setNotesOpen] = useState(Boolean(book.notes));
  const [tagDraft, setTagDraft] = useState<string>();
  const [editingMoods, setEditingMoods] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState<string>();
  const openCamera = useRef<(() => void) | null>(null);

  const save = (changes: Partial<Book>) => updateBook(book.id, changes);

  const refresh = async () => {
    setNotice('Looking for more info…');
    setNotice(REFRESH_TEXT[await refreshBook(book)]);
  };

  const addTag = (event: FormEvent) => {
    event.preventDefault();
    const tag = (tagDraft ?? '').trim().toLowerCase();
    if (tag && !book.tags.includes(tag)) save({ tags: [...book.tags, tag], hiddenTags: book.hiddenTags?.filter((t) => t !== tag) });
    setTagDraft(undefined);
  };

  // Remembered in hiddenTags, so "Refresh book info" won't add an automatic tag back.
  const removeTag = (tag: string) =>
    save({ tags: book.tags.filter((t) => t !== tag), hiddenTags: [...new Set([...(book.hiddenTags ?? []), tag])] });

  const remove = async () => {
    await deleteBook(book.id);
    onClose();
  };

  const moods = bookMoods(book);
  const unknown = moodUnknown(book);
  const meta = [book.authors.join(', '), book.pageCount && `${book.pageCount} pages`].filter(Boolean).join(' · ');
  const isbn = book.isbn13.startsWith('manual:') ? undefined : book.isbn13;

  const menu = (
    <BookMenu
      items={[
        { label: 'Edit details', onSelect: () => setEditing(true) },
        { label: 'Read the back cover', onSelect: () => openCamera.current?.() },
        { label: 'Refresh book info', onSelect: refresh },
        { label: 'Book info & sources', onSelect: () => setShowInfo(true) },
        { label: 'Delete book', onSelect: () => setConfirmDelete(true), danger: true },
      ]}
    />
  );

  return (
    <Sheet title={book.title} onClose={onClose} className="book-theme book-detail" style={bookThemeStyle(book.themeHue)} actions={menu}>
      <div className="detail-top">
        <BookCover book={book} className="detail-cover" />
        <div className="detail-info">
          <p className="detail-title">{book.title}</p>
          {meta && <p className="detail-meta">{meta}</p>}
          <Rating value={book.rating} onChange={(rating) => save({ rating })} />
        </div>
      </div>

      {notice && <p className="detail-notice hand" role="status">{notice}</p>}

      {confirmDelete && (
        <div className="detail-confirm" role="alert">
          <span className="hand">Really remove this book?</span>
          <button type="button" className="btn btn-small" onClick={remove}>Yes, delete</button>
          <button type="button" className="btn btn-small btn-secondary" onClick={() => setConfirmDelete(false)}>Keep it</button>
        </div>
      )}

      {editing && <BookEditForm book={book} onDone={() => setEditing(false)} />}

      <div className="segmented" role="group" aria-label="Reading status">
        {STATUSES.map(({ value, label }) => (
          <button key={value} type="button" aria-pressed={book.status === value} onClick={() => save({ status: value })}>
            {label}
          </button>
        ))}
      </div>

      {editingMoods ? (
        <div className="detail-moods-edit">
          <MoodChips selected={book.moods ?? []} onChange={(next) => save({ moods: next })} label="Moods for this book" />
          <button type="button" className="link-button" onClick={() => setEditingMoods(false)}>Done</button>
        </div>
      ) : unknown ? (
        <p className="detail-feels detail-feels-unknown">
          <span>Can't tell the mood yet ·</span>
          <button type="button" className="link-button" onClick={() => openCamera.current?.()}>Read the back cover</button>
          <span>·</span>
          <button type="button" className="link-button" onClick={() => setEditingMoods(true)}>set it</button>
        </p>
      ) : (
        <div className="detail-feels">
          <span className="detail-feels-label">Feels</span>
          {moods.map((id) => (
            <span key={id} className="mood-pill">{moodLabel(id)}</span>
          ))}
          <button type="button" className="link-button" onClick={() => setEditingMoods(true)}>change</button>
        </div>
      )}

      <BlurbPhoto book={book} openRef={openCamera} />

      {book.description && <ClampText text={book.description} className="detail-description" />}
      {book.blurb && (
        <div className="detail-blurb">
          <span className="detail-blurb-label">From the back cover</span>
          <ClampText text={book.blurb} />
        </div>
      )}

      <div className="tag-list" aria-label="Tags">
        {book.tags.map((tag) => (
          <button key={tag} type="button" className="tag" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`}>
            {tag} <span aria-hidden="true">×</span>
          </button>
        ))}
        {tagDraft === undefined ? (
          <button type="button" className="link-button tag-add" onClick={() => setTagDraft('')}>+ tag</button>
        ) : (
          <form className="tag-form" onSubmit={addTag}>
            <label className="visually-hidden" htmlFor="tag-input">New tag</label>
            <input
              id="tag-input"
              className="input"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onBlur={() => !tagDraft?.trim() && setTagDraft(undefined)}
              placeholder="e.g. hockey, summer read"
              autoFocus
            />
            <button type="submit" className="btn btn-small">Add</button>
          </form>
        )}
      </div>

      {notesOpen ? (
        <div className="detail-section">
          <label className="visually-hidden" htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            className="textarea detail-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== (book.notes ?? '') && save({ notes: notes || undefined })}
            placeholder="little thoughts…"
            autoFocus={!book.notes}
          />
        </div>
      ) : (
        <button type="button" className="note-add hand" onClick={() => setNotesOpen(true)}>+ add a little note…</button>
      )}

      {showInfo && (
        <div className="detail-section detail-info-panel">
          <p className="detail-info-line">
            From {book.infoSources?.length ? book.infoSources.map((s) => INFO_SOURCE_LABEL[s]).join(' + ') : SOURCE_LABEL[book.source]}
            {isbn && ` · ISBN ${isbn}`} · {book.subjects.length} subject{book.subjects.length === 1 ? '' : 's'}
          </p>
          {book.subjects.length > 0 && <p className="detail-subjects">{book.subjects.join(' · ')}</p>}
          {book.genres.length > 0 && <p className="detail-subjects">Genres: {book.genres.join(', ')}</p>}
          <button type="button" className="link-button" onClick={() => setShowInfo(false)}>Hide</button>
        </div>
      )}
    </Sheet>
  );
}
