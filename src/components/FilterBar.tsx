import type { ReactNode } from 'react';
import type { ReadStatus } from '../data/db';
import { SORT_OPTIONS, type GenreCount, type LengthFilter, type LibraryFilters, type SortKey } from '../lib/library';
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
  genres: GenreCount[];
  /** How many books the app can't tell the mood of; that filter only shows when there are some. */
  moodUnknownCount: number;
}

/** The contents of the Library's "Filter & sort" sheet. */
export default function FilterBar({ filters, onChange, sort, onSortChange, genres, moodUnknownCount }: FilterBarProps) {
  const set = (changes: Partial<LibraryFilters>) => onChange({ ...filters, ...changes });

  return (
    <div className="filter-bar">
      <FilterGroup label="Reading status">
        {STATUSES.map(({ value, label }) => (
          <button key={value} type="button" className="chip" aria-pressed={filters.status === value} onClick={() => set({ status: value })}>
            {label}
          </button>
        ))}
      </FilterGroup>

      {genres.length > 0 && (
        // One genre at a time; tapping the selected one again shows all genres.
        <FilterGroup label="Genre">
          <button type="button" className="chip" aria-pressed={!filters.genre} onClick={() => set({ genre: '' })}>
            All genres
          </button>
          {genres.map(({ genre, count }) => (
            <button
              key={genre}
              type="button"
              className="chip"
              aria-pressed={filters.genre === genre}
              onClick={() => set({ genre: filters.genre === genre ? '' : genre })}
            >
              {genre} <span className="chip-count">{count}</span>
            </button>
          ))}
        </FilterGroup>
      )}

      <FilterGroup label="Length">
        {LENGTHS.map(({ value, label }) => (
          <button key={value} type="button" className="chip" aria-pressed={filters.length === value} onClick={() => set({ length: value })}>
            {label}
          </button>
        ))}
      </FilterGroup>

      {(moodUnknownCount > 0 || filters.needsMoodInfo) && (
        <FilterGroup label="Needs attention">
          <button
            type="button"
            className="chip chip-needs-info"
            aria-pressed={filters.needsMoodInfo}
            onClick={() => set({ needsMoodInfo: !filters.needsMoodInfo })}
          >
            Mood unknown <span className="chip-count">{moodUnknownCount}</span>
          </button>
        </FilterGroup>
      )}

      <div className="filter-group">
        <label className="filter-label" htmlFor="sort">Sort by</label>
        <select id="sort" className="select" value={sort} onChange={(e) => onSortChange(e.target.value as SortKey)}>
          {SORT_OPTIONS.map(({ key, label }) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="filter-group">
      <span className="filter-label">{label}</span>
      <div className="filter-chips" role="group" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
