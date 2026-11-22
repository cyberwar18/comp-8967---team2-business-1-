// Sprint 6 (Devu): the "You said, we did" tab. Every request on the map and where it is now, and the
// published outcomes as cards: what was reported (its public title) and what was done about it.
// The chips filter this list AND the request pins on the map, so what you read is what you see.
// Only requests the viewer may see are in here: a private request is seen by the person who sent it,
// and becomes public only when the City or the BIA publishes the outcome.
import { useMemo } from 'react';
import type { MapItem } from './types';
import {
  STATUS_FILTERS,
  filterCounts,
  matchesStatusFilter,
  outcomeCards,
  phaseOf,
  type StatusFilter,
} from './requestStatus';
import { formatDate } from '../cards/cardData';

interface Props {
  items: MapItem[]; // everything this viewer may see
  places: MapItem[];
  filter: StatusFilter;
  onFilter: (f: StatusFilter) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  viewerId: string;
}

export function YouSaidWeDid({ items, places, filter, onFilter, selectedId, onSelect, viewerId }: Props) {
  const counts = useMemo(() => filterCounts(items), [items]);
  const placeName = (id?: unknown) => {
    const p = places.find((x) => x.id === id);
    return p ? p.name.replace(/\s*\(demo\)/, '') : undefined;
  };

  const requests = useMemo(() => items.filter((i) => phaseOf(i) && matchesStatusFilter(i, filter)), [items, filter]);
  const cards = useMemo(() => (filter === 'resolved' || filter === 'all' ? outcomeCards(requests) : []), [requests, filter]);
  const cardIds = new Set(cards.map((c) => c.id));
  const others = requests.filter((r) => !cardIds.has(r.id));

  return (
    <section className="ysd" aria-label="You said, we did">
      <p className="ysd-intro">
        Problems people reported and what was done about them. Only requests the sender chose to post to the map are listed; the outcome appears once the City or the BIA publishes it.
      </p>
      <div role="group" aria-label="Show requests that are" className="ay-filters">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={f.id === filter}
            className={f.id === filter ? 'chip chip--active' : 'chip'}
            onClick={() => onFilter(f.id)}
          >
            {f.label} <span className="ysd-n">{counts[f.id]}</span>
          </button>
        ))}
      </div>
      <p className="ay-count" aria-live="polite">
        {filter === 'all'
          ? `${counts.all} request${counts.all === 1 ? '' : 's'} on the map`
          : `Showing ${requests.length} ${STATUS_FILTERS.find((f) => f.id === filter)!.label.toLowerCase()} on the map. Other pins stay.`}
      </p>

      {cards.length > 0 && (
        <ul className="ysd-cards" aria-label="Outcomes">
          {cards.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`ysd-card${selectedId === c.id ? ' is-on' : ''}`}
                aria-current={selectedId === c.id ? 'true' : undefined}
                onClick={() => onSelect(c.id)}
              >
                <span className="ysd-tag">Resolved{c.when ? ` · ${formatDate(c.when)}` : ''}</span>
                <span className="ysd-said">
                  <span className="ysd-k">You said</span> {c.youSaid}
                </span>
                <span className="ysd-did">
                  <span className="ysd-k">We did</span> {c.weDid}
                </span>
                <span className="ysd-by">
                  {c.category}
                  {c.handledBy ? ` · by ${c.handledBy}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {others.length > 0 && (
        <ul className="ysd-rows" aria-label="Requests">
          {others.map((r) => {
            const phase = phaseOf(r)!;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  className={`ysd-row${selectedId === r.id ? ' is-on' : ''}`}
                  aria-current={selectedId === r.id ? 'true' : undefined}
                  onClick={() => onSelect(r.id)}
                >
                  <span className="ysd-row-main">
                    <strong>{r.name}</strong>
                    <span className="ysd-by">
                      {placeName(r.placeId) ?? r.category}
                      {r.reportedBy === viewerId && ' · your request'}
                    </span>
                  </span>
                  <span className={`ysd-phase ysd-phase--${phase.phase}`}>{phase.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {requests.length === 0 && <p className="ysd-empty">No requests match. Choose another filter.</p>}
    </section>
  );
}
