// Task 11: one card for an event, offer, public update or issue.
// Task 12: clicking it selects the matching pin (offers select their shop's pin).
import { formatDate, formatDistance, formatWhen, pinIdFor, type Item } from './cardData';
import { ProgressRing } from './ProgressRing';

const KIND: Record<string, { label: string; glyph: string; color: string }> = {
  event: { label: 'Event', glyph: 'E', color: '#007A5A' },
  offer: { label: 'Offer', glyph: '%', color: '#6B4FA0' },
  update: { label: 'Public update', glyph: 'U', color: '#B35900' },
  issue: { label: 'Issue', glyph: 'I', color: '#A33D78' },
  place: { label: 'Place', glyph: 'P', color: '#0072B2' },
};

interface Props {
  item: Item;
  placeName?: string;
  metres?: number | null;
  selected?: boolean;
  mine?: boolean; // the viewer raised this report
  onSelect?: (pinId: string) => void;
}

export function ActivityCard({ item, placeName, metres, selected = false, mine = false, onSelect }: Props) {
  const k = KIND[item.kind] ?? KIND.update;
  const pinId = pinIdFor(item);

  let detail = '';
  if (item.kind === 'event') detail = formatWhen(item.start, item.end);
  else if (item.kind === 'offer') detail = `Until ${formatDate(item.validUntil)}`;
  else if (item.updatedAt) detail = `Updated ${formatDate(item.updatedAt)}`;

  const status = item.kind === 'offer' ? null : item.status;

  const className = `ac${selected ? ' ac--selected' : ''}${item.status === 'past' ? ' ac--past' : ''}`;
  const inner = (
    <>
      <span className="ac-icon" style={{ background: k.color }} aria-hidden="true">
        {k.glyph}
      </span>
      <span className="ac-body">
        <span className="ac-type">
          {k.label}
          {status && <span className="ac-status"> · {status}</span>}
          {mine && <span className="ac-mine">Your report</span>}
        </span>
        <strong className="ac-name">{item.name}</strong>
        {detail && <span className="ac-detail">{detail}</span>}
        {(placeName || typeof metres === 'number') && (
          <span className="ac-where">
            {placeName}
            {placeName && typeof metres === 'number' && ' · '}
            {typeof metres === 'number' && formatDistance(metres)}
          </span>
        )}
      </span>
      {item.kind === 'issue' && <ProgressRing status={item.status} size={40} />}
    </>
  );

  // Clickable when there is a pin to go to; otherwise a plain (non-button) card.
  if (!pinId || !onSelect) {
    return (
      <div className={`${className} ac--static`} data-card-id={item.id}>
        {inner}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={className}
      aria-current={selected ? 'true' : undefined}
      data-card-id={item.id}
      onClick={() => onSelect(pinId)}
    >
      {inner}
    </button>
  );
}
