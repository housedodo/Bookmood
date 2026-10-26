import { MOODS } from '../data/moods';

interface MoodChipsProps {
  selected: string[];
  onChange: (moods: string[]) => void;
  label: string;
}

/** Small mood chips to tell the app how a book feels. Moods you pick count most in mood picks. */
export default function MoodChips({ selected, onChange, label }: MoodChipsProps) {
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id]);
  return (
    <div className="chip-row mood-chips" role="group" aria-label={label}>
      {MOODS.map((mood) => (
        <button key={mood.id} type="button" className="chip" aria-pressed={selected.includes(mood.id)} onClick={() => toggle(mood.id)}>
          <span aria-hidden="true">{mood.emoji}</span> {mood.label}
        </button>
      ))}
    </div>
  );
}
