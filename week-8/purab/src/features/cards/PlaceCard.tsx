// Task 10: the card that opens when a pin (or a card) is selected.
// Desktop: fills the side panel. Phone: a bottom sheet over the map (see Cards.css).
// Places show photo placeholder, category, status, hours, address, description, the
// profile that runs the place and what is happening there. In "My business" mode the
// owner also sees their private requests to the BIA.
import { useEffect, useRef } from 'react';
import { ActivityCard } from './ActivityCard';
import { ProgressRing } from './ProgressRing';
import {
  ROLE_LABEL,
  canSeeReporter,
  findItem,
  formatDate,
  formatWhen,
  happeningAt,
  initials,
  pinIdFor,
  placeOf,
  profileById,
  profileForPlace,
  recipientsOf,
  requestsBy,
  shortName,
  type CardData,
  type Item,
  type Mode,
} from './cardData';

interface Props {
  data: CardData;
  selectedId: string;
  viewerId: string; // profile id of whoever is viewing (resident, or the business in My business mode)
  mode: Mode;
  onSelect: (id: string | null) => void;
  /** "Back to list": close the card but keep the pin selected (highlighted in the list). */
  onBack?: () => void;
  /** Open a profile card (business, BIA, community group or the person who raised a report). */
  onOpenProfile?: (profileId: string) => void;
}

const KIND_LABEL: Record<string, string> = { place: 'Place', event: 'Event', update: 'Public update', issue: 'Issue', offer: 'Offer' };

function Photo({ item }: { item: Item }) {
  return (
    <div className="pc-photo" role="img" aria-label={`Photo placeholder for ${item.name}`}>
      <span className="pc-photo-initials" aria-hidden="true">
        {initials(item.name) || '?'}
      </span>
      <span className="pc-photo-note">Photo coming soon</span>
    </div>
  );
}

function StatusPill({ status }: { status?: string }) {
  if (!status) return null;
  const tone = /open|published|upcoming|resolved/.test(status) ? 'ok' : /closed|vacant|past/.test(status) ? 'off' : 'wait';
  return <span className={`pc-pill pc-pill--${tone}`}>{status}</span>;
}

export function PlaceCard({ data, selectedId, viewerId, mode, onSelect, onBack, onOpenProfile }: Props) {
  const item = findItem(data, selectedId);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move keyboard focus to the card title, so screen-reader users hear what opened.
  useEffect(() => {
    headingRef.current?.focus();
  }, [selectedId]);

  if (!item) return null;

  const place = item.kind === 'place' ? item : placeOf(data, item);
  const runBy = place ? profileForPlace(data, place.id) : undefined;
  const reporter = item.reportedBy ? profileById(data, item.reportedBy) : undefined;
  const here = item.kind === 'place' ? happeningAt(data, item.id) : [];
  const isMyBusiness = mode === 'business' && item.kind === 'place' && runBy?.id === viewerId;
  const myRequests = isMyBusiness ? requestsBy(data, viewerId) : [];
  // KAN-37: resident reports go to the city / ward councillor, business reports to the BIA.
  const { to, cc } = item.kind === 'issue' ? recipientsOf(data, item) : {};
  const approver = shortName(to);
  const link = (p: typeof to) =>
    p && onOpenProfile ? (
      <button type="button" className="pc-inline-link" onClick={() => onOpenProfile(p.id)}>
        {p.name}
      </button>
    ) : (
      p?.name
    );

  return (
    <article className="pc" aria-labelledby="pc-title">
      <div className="pc-top">
        <button type="button" className="pc-back" onClick={() => (onBack ? onBack() : onSelect(null))}>
          ← Back to list
        </button>
        <button type="button" className="pc-close" aria-label="Close card" onClick={() => onSelect(null)}>
          ×
        </button>
      </div>

      <Photo item={item} />

      <p className="pc-kind">
        {KIND_LABEL[item.kind]} · {item.category}
      </p>
      <h2 id="pc-title" className="pc-title" tabIndex={-1} ref={headingRef}>
        {item.name}
      </h2>
      <div className="pc-row">
        <StatusPill status={item.status} />
        {item.kind === 'issue' && <ProgressRing status={item.status} />}
      </div>

      <dl className="pc-facts">
        {item.kind === 'place' && (
          <>
            <dt>Hours</dt>
            <dd>{item.hours ?? 'Not listed'}</dd>
            {item.address && (
              <>
                <dt>Address</dt>
                <dd>{item.address}</dd>
              </>
            )}
          </>
        )}
        {item.kind === 'event' && (
          <>
            <dt>When</dt>
            <dd>{formatWhen(item.start, item.end)}</dd>
          </>
        )}
        {item.updatedAt && (
          <>
            <dt>Updated</dt>
            <dd>{formatDate(item.updatedAt)}</dd>
          </>
        )}
        {reporter && (
          <>
            <dt>Raised by</dt>
            <dd>
              {reporter.id === viewerId ? (
                'You'
              ) : !canSeeReporter(item, viewerId) ? (
                `Hidden until ${approver} approves it`
              ) : onOpenProfile ? (
                <button type="button" className="pc-inline-link" onClick={() => onOpenProfile(reporter.id)}>
                  {reporter.name}
                </button>
              ) : (
                reporter.name
              )}
            </dd>
          </>
        )}
        {to && (
          <>
            <dt>Sent to</dt>
            <dd>
              {link(to)}
              {cc && <> · copy to {link(cc)}</>}
            </dd>
          </>
        )}
        {item.visibility && (
          <>
            <dt>Who can see this</dt>
            <dd>
              {item.visibility === 'public'
                ? 'Everyone'
                : item.reportedBy === viewerId
                  ? `Only you and ${approver}, until approved`
                  : `Only the person who raised it and ${approver}, until approved`}
            </dd>
          </>
        )}
      </dl>

      {item.description && <p className="pc-desc">{item.description}</p>}

      {/* Week 8: a printable QR poster that opens Report a problem at this place */}
      {item.kind === 'place' && (
        <a className="pc-qr" href={`#/posters?place=${encodeURIComponent(item.id)}`}>
          QR poster for this place
        </a>
      )}

      {item.kind !== 'place' && place && (
        <button type="button" className="pc-link" onClick={() => onSelect(place.id)}>
          At {place.name} →
        </button>
      )}

      {item.kind === 'place' && runBy && (
        <section className="pc-section" aria-label="Profile">
          <h3>Profile</h3>
          <div className="pc-profile">
            <span className="pc-avatar" aria-hidden="true">
              {initials(runBy.name)}
            </span>
            <span>
              {onOpenProfile ? (
                <button type="button" className="pc-inline-link pc-inline-link--strong" onClick={() => onOpenProfile(runBy.id)}>
                  {runBy.name}
                </button>
              ) : (
                <strong>{runBy.name}</strong>
              )}
              <span className="pc-badge">{ROLE_LABEL[runBy.role]}</span>
              {runBy.bio && <span className="pc-muted">{runBy.bio}</span>}
            </span>
          </div>
          {onOpenProfile ? (
            <button type="button" className="pc-link" onClick={() => onOpenProfile(runBy.id)}>
              View full profile →
            </button>
          ) : (
            runBy.public && <p className="pc-muted">Shown publicly: {runBy.public.join(', ')}.</p>
          )}
        </section>
      )}

      {here.length > 0 && (
        <section className="pc-section" aria-label="Happening here">
          <h3>Happening here</h3>
          <ul className="pc-list">
            {here.map((h) => (
              <li key={h.id}>
                {/* Offers have no pin of their own, so their card is not clickable here (it would select this same place). */}
                <ActivityCard item={h} selected={false} onSelect={h.kind === 'offer' ? undefined : onSelect} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {isMyBusiness && (
        <section className="pc-section pc-owner" aria-label="My requests">
          <h3>My requests</h3>
          <p className="pc-muted">Only you and the BIA see this.</p>
          {myRequests.length === 0 ? (
            <p>No open requests.</p>
          ) : (
            <ul className="pc-list">
              {myRequests.map((r) => (
                <li key={r.id}>
                  <ActivityCard item={r} selected={pinIdFor(r) === selectedId} onSelect={onSelect} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="pc-demo">Illustrative sample data. Not a real business or record.</p>
    </article>
  );
}
