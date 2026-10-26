import { useState, type FormEvent } from 'react';
import type { Book } from '../data/db';
import { addByIsbn } from '../lib/addBook';
import { toIsbn13 } from '../lib/isbn';
import '../styles/form.css';

interface IsbnLookupProps {
  onAdded: (book: Book) => void;
  onDuplicate: (book: Book) => void;
  /** Called when the book can't be found online, with the ISBN to pre-fill the manual form. */
  onNotFound: (isbn13: string) => void;
}

/** "Type ISBN" field: looks the book up online and saves it. */
export default function IsbnLookup({ onAdded, onDuplicate, onNotFound }: IsbnLookupProps) {
  const [isbn, setIsbn] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const isbn13 = toIsbn13(isbn);
    if (!isbn13) {
      setMessage("Hmm, that's not a valid ISBN. It's the 13-digit number above the barcode.");
      return;
    }
    setBusy(true);
    setMessage('');
    const result = await addByIsbn(isbn13);
    setBusy(false);
    switch (result.kind) {
      case 'added':
        setIsbn('');
        return onAdded(result.book);
      case 'duplicate':
        return onDuplicate(result.book);
      case 'offline':
        setMessage("You're offline — I'll need internet to find that book. You can add it manually!");
        return onNotFound(isbn13);
      case 'notFound':
        setMessage("I couldn't find that one online. Fill it in below ♡");
        return onNotFound(isbn13);
    }
  };

  return (
    <form className="form isbn-lookup" onSubmit={submit}>
      <label className="field" htmlFor="isbn-lookup">Type ISBN</label>
      <div className="form-inline">
        <input
          id="isbn-lookup"
          className="input"
          inputMode="numeric"
          autoComplete="off"
          placeholder="978…"
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
        />
        <button type="submit" className="btn" disabled={busy || !isbn.trim()}>
          {busy ? 'Finding…' : 'Find'}
        </button>
      </div>
      {message && <p className="form-hint hand" role="status">{message}</p>}
    </form>
  );
}
