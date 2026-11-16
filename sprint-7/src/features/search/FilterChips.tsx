// Filter chips for the map (KAN-9): All, Shops, Events, Updates, Issues and so on.
// Only one chip is active at a time. The same choice filters both the pins and the cards.

// The chip ids are generic so other lists can reuse the chips (KAN-42 members list filters by role).
import type { ChipId } from './filters';

interface FilterChipsProps<T extends string> {
  chips: { id: T; label: string }[];
  active: T;
  onChange: (chip: T) => void;
  counts?: Partial<Record<T, number>>;
  /** Spoken name of the group of chips. */
  label?: string;
}

export function FilterChips<T extends string = ChipId>({ chips, active, onChange, counts, label = 'Filter the map' }: FilterChipsProps<T>) {
  return (
    <div role="group" aria-label={label} className="filter-chips">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          // aria-pressed tells screen readers which chip is switched on
          aria-pressed={chip.id === active}
          className={chip.id === active ? 'chip chip--active' : 'chip'}
          onClick={() => onChange(chip.id)}
        >
          {chip.label}
          {counts?.[chip.id] !== undefined && <span className="chip__count"> ({counts[chip.id]})</span>}
        </button>
      ))}
    </div>
  );
}
