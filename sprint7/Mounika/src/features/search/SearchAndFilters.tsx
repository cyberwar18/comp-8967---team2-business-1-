// Puts the search box, the chips and the result cards together (KAN-9).
// The map (Devu's KAN-7) plugs in through two props:
//   onResultsChange -> redraw the pins with the filtered items
//   onFocusItem     -> fly the map to an item (first search result, or a clicked card)
//
// The result list reads like a street directory: places show their street number,
// events show their date, and updates and issues show where they stand.

import { useEffect, useMemo, useState } from 'react';
import { SearchBar } from './SearchBar';
import { FilterChips } from './FilterChips';
import './SearchAndFilters.css';
import { applyFilters, firstResult, getAllItems, type ChipId, type MapItem, type MockData } from './filters';
import { LAYERS } from '../map/layers';
import { layerOf } from '../map/itemLayer';

interface SearchAndFiltersProps {
  data: MockData;
  onResultsChange?: (items: MapItem[]) => void;
  onFocusItem?: (item: MapItem) => void;
  selectedId?: string | null; // the pin chosen on the map, so its card can be highlighted
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The big left-hand marker on each card: street number, event date, or the item type. */
function marker(item: MapItem): { top: string; bottom?: string } {
  if (item.kind === 'place' && typeof item.address === 'string') {
    const num = /^\d+/.exec(item.address)?.[0];
    if (num) return { top: num, bottom: 'Wyandotte' };
  }
  if (item.kind === 'event' && typeof item.start === 'string') {
    const [, m, d] = item.start.slice(0, 10).split('-').map(Number);
    if (m && d) return { top: String(d), bottom: MONTHS[m - 1] };
  }
  return { top: item.kind === 'issue' ? 'Issue' : item.kind === 'update' ? 'Notice' : 'Place' };
}

/** Status words people understand, with a tone for the colour of the pill. */
function statusOf(item: MapItem): { label: string; tone: 'good' | 'busy' | 'alert' | 'quiet' } {
  const s = item.status.toLowerCase();
  const label = s.charAt(0).toUpperCase() + s.slice(1);
  if (['open', 'published', 'resolved', 'upcoming'].includes(s)) return { label, tone: 'good' };
  if (['temporarily closed', 'acknowledged', 'planned'].includes(s)) return { label, tone: 'busy' };
  if (s === 'reported') return { label, tone: 'alert' };
  return { label, tone: 'quiet' };
}

function timeOf(item: MapItem): string | null {
  if (item.kind !== 'event' || typeof item.start !== 'string') return null;
  const h = Number(item.start.slice(11, 13));
  const m = item.start.slice(14, 16);
  if (Number.isNaN(h)) return null;
  const hour = ((h + 11) % 12) + 1;
  return `${hour}${m && m !== '00' ? `:${m}` : ''} ${h < 12 ? 'am' : 'pm'}`;
}

export function SearchAndFilters({ data, onResultsChange, onFocusItem, selectedId = null }: SearchAndFiltersProps) {
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<ChipId>('all');

  const allItems = useMemo(() => getAllItems(data), [data]);
  const results = useMemo(() => applyFilters(allItems, query, chip), [allItems, query, chip]);

  // How many items each chip would show for the current search, shown beside the chip label.
  const counts = useMemo(() => {
    const out: Partial<Record<ChipId, number>> = {};
    for (const c of data.chips) out[c.id] = applyFilters(allItems, query, c.id).length;
    return out;
  }, [allItems, query, data.chips]);

  // Let the map know whenever the list changes, so pins and cards stay in sync.
  useEffect(() => {
    onResultsChange?.(results);
  }, [results, onResultsChange]);

  function handleSearch() {
    const first = firstResult(results);
    if (first) onFocusItem?.(first);
  }

  return (
    <section aria-label="Search and filters" className="search-and-filters">
      <div className="saf-head">
        <SearchBar value={query} onChange={setQuery} onSubmit={handleSearch} />
        <FilterChips chips={data.chips} active={chip} onChange={setChip} counts={counts} />
      </div>

      <p aria-live="polite" className="result-count">
        {results.length === 0 ? 'No matches. Try another word or choose All.' : `${results.length} on Wyandotte St E`}
      </p>

      <ul className="result-cards">
        {results.map((item) => {
          const mk = marker(item);
          const st = statusOf(item);
          const layer = LAYERS.find((l) => l.key === layerOf(item))!;
          const time = timeOf(item);
          const selected = item.id === selectedId;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={selected ? 'card card--selected' : 'card'}
                aria-current={selected ? 'true' : undefined}
                onClick={() => onFocusItem?.(item)}
              >
                <span className="card__marker" style={{ color: layer.color }} aria-hidden="true">
                  <span className="card__marker-top">{mk.top}</span>
                  {mk.bottom && <span className="card__marker-bottom">{mk.bottom}</span>}
                </span>
                <span className="card__body">
                  <strong className="card__name">{item.name}</strong>
                  <span className="card__meta">
                    {item.category}
                    {time && `, ${time}`}
                  </span>
                </span>
                <span className={`card__status card__status--${st.tone}`}>{st.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Reminder that everything on screen is made-up demo data */}
      <p className="demo-label">{data.meta.label}</p>
    </section>
  );
}
