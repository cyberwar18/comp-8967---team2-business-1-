// Task 11: the "Around you" list of events, offers, public updates and issues, nearest first.
// Task 12: the card for the selected pin is highlighted and scrolled into view.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityCard } from './ActivityCard';
import { aroundYou, pinIdFor, placeOf, type AroundFilter, type CardData } from './cardData';

const FILTERS: { id: AroundFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'event', label: 'Events' },
  { id: 'offer', label: 'Offers' },
  { id: 'update', label: 'Updates' },
  { id: 'issue', label: 'Issues' },
];

interface Props {
  data: CardData;
  viewerId: string;
  from: [number, number];
  selectedId: string | null;
  onSelect: (pinId: string) => void;
}

export function AroundYou({ data, viewerId, from, selectedId, onSelect }: Props) {
  const [filter, setFilter] = useState<AroundFilter>('all');
  const entries = useMemo(() => aroundYou(data, viewerId, from, filter), [data, viewerId, from, filter]);
  const listRef = useRef<HTMLUListElement>(null);

  // Task 12: when a pin is chosen on the map, bring its card into view.
  useEffect(() => {
    const el = listRef.current?.querySelector('[aria-current="true"]');
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (el && 'scrollIntoView' in el) (el as HTMLElement).scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [selectedId, filter]);

  return (
    <section className="ay" aria-label="Around you">
      <div role="group" aria-label="Show in Around you" className="ay-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={f.id === filter}
            className={f.id === filter ? 'chip chip--active' : 'chip'}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="ay-count" aria-live="polite">
        {entries.length === 0 ? 'Nothing nearby for this filter.' : `${entries.length} nearby, nearest first`}
      </p>
      <ul className="ay-list" ref={listRef}>
        {entries.map(({ item, metres }) => (
          <li key={item.id}>
            <ActivityCard
              item={item}
              placeName={placeOf(data, item)?.name}
              metres={metres}
              selected={selectedId !== null && pinIdFor(item) === selectedId}
              mine={item.reportedBy === viewerId && item.visibility !== 'public'}
              onSelect={onSelect}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
