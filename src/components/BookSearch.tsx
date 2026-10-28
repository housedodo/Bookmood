import { useState, type FormEvent } from 'react';
import { searchBooks, type SearchBy, type TitleSearchResult } from '../lib/lookup';
import Icon from './Icon';
import '../styles/form.css';

const PLACEHOLDER: Record<SearchBy, string> = { title: 'Book title', author: 'Author name, e.g. Andrea Mara', any: 'Title and author' };

/** Backup to scanning: find a book on Open Library by its title or its author, then pick it. */
export default function BookSearch({ onPick }: { onPick: (result: TitleSearchResult) => void }) {
  const [by, setBy] = useState<SearchBy>('title');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TitleSearchResult[]>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setResults(await searchBooks(query, by));
    setBusy(false);
  };

  const switchTo = (next: SearchBy) => {
    setBy(next);
    setResults(undefined);
  };

  return (
    <div className="form">
      <div className="chip-row" role="group" aria-label="Search by">
        <button type="button" className="chip" aria-pressed={by === 'title'} onClick={() => switchTo('title')}>Title</button>
        <button type="button" className="chip" aria-pressed={by === 'author'} onClick={() => switchTo('author')}>Author</button>
      </div>
      <form className="form-inline" onSubmit={submit} role="search">
        <label className="visually-hidden" htmlFor="book-search">{PLACEHOLDER[by]}</label>
        <input id="book-search" className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={PLACEHOLDER[by]} autoComplete="off" />
        <button type="submit" className="btn" disabled={busy || !query.trim()} aria-label="Search">
          {busy ? '…' : <Icon name="search" className="btn-icon" />}
        </button>
      </form>
      {results && results.length === 0 && (
        <p className="form-hint hand">
          {navigator.onLine ? `No books found for that ${by}.` : "You're offline — I'll need internet to search."}
        </p>
      )}
      {results && results.length > 0 && (
        <>
          {by === 'author' && <p className="form-hint">{results.length} books found — tap the one you have.</p>}
          <ul className="search-results">
            {results.map((result) => (
              <li key={result.key}>
                <button type="button" className="search-result" onClick={() => onPick(result)}>
                  {result.coverUrl ? <img src={result.coverUrl} alt="" loading="lazy" /> : <span className="search-result-nocover" />}
                  <span>
                    <strong>{result.title}</strong>
                    <small>{[result.authors.join(', '), result.year].filter(Boolean).join(' · ')}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
