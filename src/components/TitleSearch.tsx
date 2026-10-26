import { useState, type FormEvent } from 'react';
import { searchByTitle, type TitleSearchResult } from '../lib/lookup';
import Icon from './Icon';
import '../styles/form.css';

/** "Search by title" backup: finds books on Open Library and lets you pick one. */
export default function TitleSearch({ onPick }: { onPick: (result: TitleSearchResult) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TitleSearchResult[]>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setResults(await searchByTitle(query));
    setBusy(false);
  };

  return (
    <div className="form">
      <form className="form-inline" onSubmit={submit} role="search">
        <label className="visually-hidden" htmlFor="title-search">Book title</label>
        <input id="title-search" className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Book title" autoComplete="off" />
        <button type="submit" className="btn" disabled={busy || !query.trim()} aria-label="Search">
          {busy ? '…' : <Icon name="search" className="btn-icon" />}
        </button>
      </form>
      {results && results.length === 0 && (
        <p className="form-hint hand">{navigator.onLine ? 'No books found with that title.' : "You're offline — I'll need internet to search."}</p>
      )}
      {results && results.length > 0 && (
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
      )}
    </div>
  );
}
