import { useState } from 'react';
import type { Book } from '../data/db';
import { moodUnknown } from '../lib/moodInfo';
import BlurbPhoto from './BlurbPhoto';
import MoodChips from './MoodChips';

interface ScanCardExtrasProps {
  book: Book;
  onMoods: (moods: string[]) => void;
  onBlurbSaved: () => void;
}

/**
 * Under a just-added book: if the app can't tell its mood, offer the back-cover photo.
 * Mood chips stay folded away ("Know the mood already?"), since before reading you usually don't.
 */
export default function ScanCardExtras({ book, onMoods, onBlurbSaved }: ScanCardExtrasProps) {
  const [showMoods, setShowMoods] = useState(Boolean(book.moods?.length));
  const unknown = moodUnknown(book);

  return (
    <>
      {unknown && (
        <div className="scan-card-thin">
          <span className="hand">Not much info found, so I can't tell its mood yet. Snap the back cover?</span>
          <BlurbPhoto book={book} compact onSaved={onBlurbSaved} />
        </div>
      )}
      {!unknown && book.blurb === undefined && book.description && (
        <span className="scan-card-ok hand">Got a description — mood picks can find it ♡</span>
      )}
      {showMoods ? (
        <MoodChips selected={book.moods ?? []} onChange={onMoods} label={`Moods for ${book.title}`} />
      ) : (
        <button type="button" className="link-button scan-card-moods-link" onClick={() => setShowMoods(true)}>
          Know the mood already?
        </button>
      )}
    </>
  );
}
