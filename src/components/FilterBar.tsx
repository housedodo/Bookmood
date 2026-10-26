import type { ReadStatus } from '../data/db';
import { SORT_OPTIONS, type LengthFilter, type LibraryFilters, type SortKey } from '../lib/library';
import '../styles/filterbar.css';

const STATUSES: { value: ReadStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'reading', label: 'Reading' },
  { value: 'read', label: 'Read' },
];

const LENGTHS: { value: LengthFilter; label: string }[] = [
  { value: 'any', label: 'Any length' },
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
];

interface FilterBarProps {
  filters: LibraryFilters;
  onChange: (filters: LibraryFilters) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  genres: string[];
}

export default function FilterBar({ filters, onChange, sort, onSortChange, genres }: FilterBarProps) {
  const set = (changes: Partial<LibraryFilters>) => onChange({ ...filters, ...changes });

  return (
    <div className="filter-bar">
      <div className="chip-row" role="group" aria-label="Reading status">
        {STATUSES.map(({ value, label }) => (
          <button key={value} type="button" className="chip" aria-pressed={filters.status === value} onClick={() => set({ status: value })}>
            {label}
          </button>
        ))}
      </div>
      <div className="chip-row" role="group" aria-label="Length">
        {LENGTHS.map(({ value, label }) => (
          <button key={value} type="button" className="chip" aria-pressed={filters.length === value} onClick={() => set({ length: value })}>
            {label}
          </button>
        ))}
      </div>
      <div className="filter-selects">
        <label className="visually-hidden" htmlFor="genre-filter">Genre</label>
        <select id="genre-filter" className="select" value={filters.genre} onChange={(e) => set({ genre: e.target.value })}>
          <option value="">All genres</option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>{genre}</option>
          ))}
        </select>
        <label className="visually-hidden" htmlFor="sort">Sort by</label>
        <select id="sort" className="select" value={sort} onChange={(e) => onSortChange(e.target.value as SortKey)}>
          {SORT_OPTIONS.map(({ key, label }) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
