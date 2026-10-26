import { useRef, useState, type ChangeEvent } from 'react';
import type { Book } from '../data/db';
import { saveBlurb } from '../lib/moodInfo';
import '../styles/blurb.css';

type State =
  | { step: 'idle' }
  | { step: 'reading'; progress?: number }
  | { step: 'review'; text: string }
  | { step: 'failed'; message: string };

/**
 * "Read the back cover": take a photo, the phone reads the text, you check it and save.
 * The text counts like a description for moods and automatic tags.
 */
export default function BlurbPhoto({ book, onSaved, compact = false }: { book: Book; onSaved?: () => void; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ step: 'idle' });

  const onPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const photo = event.target.files?.[0];
    event.target.value = '';
    if (!photo) return;
    setState({ step: 'reading' });
    try {
      // Loaded on demand: the reader is big and most visits never need it.
      const { readBackCover } = await import('../lib/ocr');
      const text = await readBackCover(photo, (progress) => setState({ step: 'reading', progress }));
      setState(
        text.length >= 40
          ? { step: 'review', text }
          : { step: 'failed', message: "I couldn't read much text. Try again in good light, holding the phone straight over the back cover." },
      );
    } catch {
      setState({
        step: 'failed',
        message: navigator.onLine
          ? "Something went wrong while reading the photo. Please try again."
          : "The first time, I need internet to download the text reader. Try again when you're online.",
      });
    }
  };

  const save = async (text: string) => {
    await saveBlurb(book, text.trim());
    setState({ step: 'idle' });
    onSaved?.();
  };

  return (
    <div className="blurb-photo">
      <input ref={input} type="file" accept="image/*" capture="environment" className="visually-hidden" onChange={onPhoto} tabIndex={-1} aria-hidden="true" />

      {state.step === 'idle' && (
        <button type="button" className={`btn btn-small ${compact ? '' : 'btn-secondary'}`} onClick={() => input.current?.click()}>
          {book.blurb ? 'Read the back cover again' : 'Read the back cover (photo)'}
        </button>
      )}

      {state.step === 'reading' && (
        <p className="blurb-status hand" role="status">
          {state.progress === undefined
            ? 'Getting ready… (the first time takes a little longer)'
            : `Reading the back cover… ${Math.round(state.progress * 100)}%`}
        </p>
      )}

      {state.step === 'review' && (
        <ReviewText initial={state.text} onSave={save} onCancel={() => setState({ step: 'idle' })} />
      )}

      {state.step === 'failed' && (
        <div className="blurb-failed">
          <p className="hand">{state.message}</p>
          <button type="button" className="btn btn-small btn-secondary" onClick={() => input.current?.click()}>Try another photo</button>
        </div>
      )}
    </div>
  );
}

function ReviewText({ initial, onSave, onCancel }: { initial: string; onSave: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial);
  return (
    <div className="blurb-review">
      <label className="field" htmlFor="blurb-text">Here's what I read — fix anything odd, then save</label>
      <textarea id="blurb-text" className="textarea blurb-text" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="form-inline">
        <button type="button" className="btn btn-small" onClick={() => onSave(text)} disabled={!text.trim()}>Save</button>
        <button type="button" className="btn btn-small btn-secondary" onClick={onCancel}>Discard</button>
      </div>
    </div>
  );
}
