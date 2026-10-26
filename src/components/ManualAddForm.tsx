import { useState, type FormEvent } from 'react';
import type { Book } from '../data/db';
import { addManualBook } from '../lib/addBook';
import { toIsbn13 } from '../lib/isbn';
import '../styles/form.css';

interface ManualAddFormProps {
  initialIsbn?: string;
  onAdded: (book: Book) => void;
  onDuplicate: (book: Book) => void;
}

const splitList = (text: string) => text.split(',').map((s) => s.trim()).filter(Boolean);

/** Hand-entry form. Only the title is required. */
export default function ManualAddForm({ initialIsbn = '', onAdded, onDuplicate }: ManualAddFormProps) {
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [pages, setPages] = useState('');
  const [isbn, setIsbn] = useState(initialIsbn);
  const [genres, setGenres] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const isbn13 = isbn.trim() ? toIsbn13(isbn) : undefined;
    if (isbn13 === null) {
      setError("That ISBN doesn't look right — check the digits, or leave it empty.");
      return;
    }
    const pageCount = pages ? Number(pages) : undefined;

    setSaving(true);
    const result = await addManualBook({
      title: title.trim(),
      authors: splitList(authors),
      pageCount: pageCount && pageCount > 0 ? Math.round(pageCount) : undefined,
      isbn13,
      description: description.trim() || undefined,
      genres: splitList(genres),
    });
    setSaving(false);
    if (result.kind === 'added') onAdded(result.book);
    if (result.kind === 'duplicate') onDuplicate(result.book);
  };

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        Title *
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoComplete="off" />
      </label>
      <label className="field">
        Author(s)
        <input className="input" value={authors} onChange={(e) => setAuthors(e.target.value)} placeholder="separate with commas" autoComplete="off" />
      </label>
      <div className="form-row">
        <label className="field">
          Pages
          <input className="input" type="number" inputMode="numeric" min="1" value={pages} onChange={(e) => setPages(e.target.value)} />
        </label>
        <label className="field">
          ISBN
          <input className="input" inputMode="numeric" value={isbn} onChange={(e) => setIsbn(e.target.value)} autoComplete="off" />
        </label>
      </div>
      <label className="field">
        Genres
        <input className="input" value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="e.g. romance, fantasy" autoComplete="off" />
      </label>
      <label className="field">
        Description
        <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="what's it about? (helps mood picks)" />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="btn" disabled={saving || !title.trim()}>
        {saving ? 'Saving…' : 'Add to my shelf'}
      </button>
    </form>
  );
}
