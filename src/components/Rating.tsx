import type { Book } from '../data/db';

type Stars = NonNullable<Book['rating']>;

/** Five hearts. Tapping the current rating again clears it. */
export default function Rating({ value, onChange }: { value?: Stars; onChange: (value?: Stars) => void }) {
  return (
    <div className="rating" role="group" aria-label="Rating">
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <button
          key={n}
          type="button"
          className="rating-heart"
          aria-label={`${n} heart${n > 1 ? 's' : ''}`}
          aria-pressed={value === n}
          onClick={() => onChange(value === n ? undefined : n)}
        >
          {value !== undefined && n <= value ? '♥' : '♡'}
        </button>
      ))}
    </div>
  );
}
