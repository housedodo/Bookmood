import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { searchBooks, type TitleSearchResult } from '../lib/lookup';
import Icon from './Icon';
import '../styles/form.css';

type State =
  | { step: 'idle' }
  | { step: 'reading'; progress?: number }
  | { step: 'results'; query: string; results: TitleSearchResult[] }
  | { step: 'failed'; message: string };

const MAX_RESULTS = 5;

/**
 * "Snap the front cover": reads title + author from a photo, searches for the book and asks
 * "Is this your book?". The read text stays editable in case the cover font fooled the reader.
 */
export default function CoverSearch({ onPick }: { onPick: (result: TitleSearchResult) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ step: 'idle' });
  const [query, setQuery] = useState('');

  const search = async (text: string) => {
    const results = (await searchBooks(text, 'any')).slice(0, MAX_RESULTS);
    setState({ step: 'results', query: text, results });
  };

  const onPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const photo = event.target.files?.[0];
    event.target.value = '';
    if (!photo) return;
    setState({ step: 'reading' });
    try {
      // Loaded on demand: the reader is big and most scans never need it.
      const { readFrontCover } = await import('../lib/ocr');
      const text = await readFrontCover(photo, (progress) => setState({ step: 'reading', progress }));
      if (!text) {
        setState({ step: 'failed', message: "I couldn't read the title. Try again with the cover filling the photo, or type it below." });
        return;
      }
      setQuery(text);
      await search(text);
    } catch {
      setState({
        step: 'failed',
        message: navigator.onLine ? 'Something went wrong reading the photo. Please try again.' : "You're offline — I'll need internet to search.",
      });
    }
  };

  const research = async (event: FormEvent) => {
    event.preventDefault();
    if (query.trim()) await search(query.trim());
  };

  return (
    <div className="cover-search">
      <input ref={input} type="file" accept="image/*" capture="environment" className="visually-hidden" onChange={onPhoto} tabIndex={-1} aria-hidden="true" />

      {(state.step === 'idle' || state.step === 'failed') && (
        <button type="button" className="btn" onClick={() => input.current?.click()}>
          {state.step === 'failed' ? 'Try another photo' : 'Snap the front cover'}
        </button>
      )}
      {state.step === 'failed' && <p className="form-hint hand">{state.message}</p>}

      {state.step === 'reading' && (
        <p className="form-hint hand" role="status">
          {state.progress === undefined ? 'Getting ready…' : `Reading the cover… ${Math.round(state.progress * 100)}%`}
        </p>
      )}

      {state.step === 'results' && (
        <>
          <form className="form-inline" onSubmit={research} role="search">
            <label className="visually-hidden" htmlFor="cover-query">Text read from the cover</label>
            <input id="cover-query" className="input" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
            <button type="submit" className="btn" aria-label="Search again" disabled={!query.trim()}>
              <Icon name="search" className="btn-icon" />
            </button>
          </form>
          {state.results.length > 0 ? (
            <>
              <p className="form-hint">Is this your book? Tap it.</p>
              <ul className="search-results">
                {state.results.map((result) => (
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
          ) : (
            <p className="form-hint hand">No book found for that — fix the text above and search again ♡</p>
          )}
          <button type="button" className="link-button" onClick={() => input.current?.click()}>Take another photo</button>
        </>
      )}
    </div>
  );
}
