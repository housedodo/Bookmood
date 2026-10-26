import { MOODS } from '../data/moods';
import '../styles/moodpicker.css';

const COLORS = ['var(--pink-200)', 'var(--lavender)', 'var(--peach)', 'var(--mint)'];

interface MoodPickerProps {
  selected: string[];
  onToggle: (moodId: string) => void;
}

/** Big rounded mood buttons; several can be selected at once. */
export default function MoodPicker({ selected, onToggle }: MoodPickerProps) {
  return (
    <div className="mood-grid" role="group" aria-label="Moods">
      {MOODS.map((mood, i) => (
        <button
          key={mood.id}
          type="button"
          className="mood-button"
          style={{ background: COLORS[i % COLORS.length] }}
          aria-pressed={selected.includes(mood.id)}
          onClick={() => onToggle(mood.id)}
        >
          <span className="mood-emoji" aria-hidden="true">{mood.emoji}</span>
          {mood.label}
        </button>
      ))}
    </div>
  );
}
