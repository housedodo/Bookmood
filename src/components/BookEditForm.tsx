import { useState, type FormEvent } from 'react';
import { updateBook, type Book } from '../data/db';
import '../styles/form.css';

/** Fix what the online lookup got wrong: title, authors, pages. */
export default function BookEditForm({ book, onDone }: { book: Book; onDone: () => void }) {
  const [title, setTitle] = useState(book.title);
  const [authors, setAuthors] = useState(book.authors.join(', '));
  const [pages, setPages] = useState(book.pageCount?.toString() ?? '');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const pageCount = Number(pages);
    await updateBook(book.id, {
      title: title.trim(),
      authors: authors.split(',').map((a) => a.trim()).filter(Boolean),
      pageCount: pageCount > 0 ? Math.round(pageCount) : undefined,
    });
    onDone();
  };

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        Title
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoComplete="off" />
      </label>
      <label className="field">
        Author(s)
        <input className="input" value={authors} onChange={(e) => setAuthors(e.target.value)} placeholder="separate with commas" autoComplete="off" />
      </label>
      <label className="field">
        Pages
        <input className="input" type="number" inputMode="numeric" min="1" value={pages} onChange={(e) => setPages(e.target.value)} />
      </label>
      <div className="form-inline">
        <button type="submit" className="btn" disabled={!title.trim()}>Save</button>
        <button type="button" className="btn btn-secondary" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}
