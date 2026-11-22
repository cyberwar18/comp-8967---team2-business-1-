// Profile cards for a resident, a business, a BIA, a community group and the people who
// respond to resident reports (ward councillor, city, MP).
// Matches wireframes B10–B12: who they are, their badge, what they share, what's going on,
// and a clear "public / private" section so people see what others can and can't see.
//
// KAN-37 (after Nigel's feedback, Oct 19):
// - The resident is the centre. Your own resident profile is your home base: what's coming up
//   for your interests, your reports and who they went to, and who to contact about problems.
// - The owner is separate from the business. The business sits in the BIA corridor; the owner is
//   a resident of the city. The link between them is private: only the owner sees it.
import { useEffect, useRef, useState } from 'react';
import { ActivityCard } from './ActivityCard';
import {
  ROLE_LABEL,
  areaResponders,
  biaFor,
  businessesOwnedBy,
  comingUpFor,
  fieldLabel,
  interestMatches,
  initials,
  isSamePerson,
  ownerOf,
  pinIdFor,
  profileActivity,
  profileById,
  recipientsOf,
  reportsSentTo,
  requestsBy,
  type CardData,
  type Item,
  type Profile,
} from './cardData';

interface Props {
  data: CardData;
  profileId: string;
  viewerId: string; // whoever is looking (resident, or the business in My business mode)
  onClose: () => void; // close the profile (×)
  onBack?: () => void; // back to the previous profile or card; falls back to onClose
  onSelect: (pinId: string) => void; // select a pin on the map
  onOpenProfile?: (profileId: string) => void; // open another profile (owner, BIA, responder)
  corridorShown?: boolean; // BIA only: is the corridor highlighted on the map?
  onToggleCorridor?: () => void;
}

const ROLE_INTRO: Record<string, string> = {
  resident: 'Neighbour',
  business: 'Local business',
  bia: 'Business Improvement Area',
  ngo: 'Community group',
  councillor: 'Elected representative',
  city: 'City service',
  mp: 'Federal representative',
};

const AREA_LABEL: Record<string, string> = {
  resident: 'Lives in',
  bia: 'Corridor',
  councillor: 'Ward',
  city: 'Service area',
  mp: 'Riding',
};

/** A name that opens that profile when we can, plain text otherwise. */
function ProfileLink({ p, onOpen }: { p?: Profile; onOpen?: (id: string) => void }) {
  if (!p) return null;
  return onOpen ? (
    <button type="button" className="pc-inline-link" onClick={() => onOpen(p.id)}>
      {p.name}
    </button>
  ) : (
    <>{p.name}</>
  );
}

/** "Sent to City of Windsor 311 (demo) · copy to Ward Councillor (demo)" under a report. */
function SentTo({ data, item, onOpen }: { data: CardData; item: Item; onOpen?: (id: string) => void }) {
  const { to, cc } = recipientsOf(data, item);
  if (!to) return null;
  return (
    <p className="pf-sentto">
      Sent to <ProfileLink p={to} onOpen={onOpen} />
      {cc && (
        <>
          {' '}
          · copy to <ProfileLink p={cc} onOpen={onOpen} />
        </>
      )}
    </p>
  );
}

function OnlyYou() {
  return (
    <span className="pf-onlyyou">
      <span aria-hidden="true">🔒 </span>Only you see this
    </span>
  );
}

export function ProfileCard({ data, profileId, viewerId, onClose, onBack, onSelect, onOpenProfile, corridorShown = false, onToggleCorridor }: Props) {
  const profile = profileById(data, profileId);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Tapping an interest shows what matches it on the corridor (one at a time; tap again to close).
  const [interest, setInterest] = useState<string | null>(null);

  // Move focus to the name, so keyboard and screen-reader users land on the new card.
  useEffect(() => {
    headingRef.current?.focus();
    setInterest(null);
  }, [profileId]);

  if (!profile) return null;

  const mine = isSamePerson(data, profile, viewerId);
  const isResident = profile.role === 'resident';
  const isResponder = profile.role === 'councillor' || profile.role === 'city' || profile.role === 'mp';
  const place = profile.placeId ? data.places.find((p) => p.id === profile.placeId) : undefined;
  const activity = isResident || isResponder ? [] : profileActivity(data, profile);
  const badge = profile.badge ?? ROLE_LABEL[profile.role];
  const bia = biaFor(data, profile);

  // Resident home base (only on your own resident profile).
  const home = mine && isResident;
  const comingUp = home ? comingUpFor(data, profile) : [];
  const myReports = home ? requestsBy(data, profile.id) : [];
  const responders = home ? areaResponders(data) : [];

  // Owner <-> business link, private to the owner.
  const owner = mine && profile.role === 'business' ? ownerOf(data, profile) : undefined;
  const myBusinesses = mine && isResident ? businessesOwnedBy(data, profile.id) : [];

  // On a responder's profile: your own reports that went to them.
  const sentHere = isResponder ? reportsSentTo(data, profile.id, viewerId) : [];

  const openPin = (item: Item) => (item.kind === 'offer' ? undefined : (id: string) => onSelect(pinIdFor(item) ?? id));

  return (
    <article className="pf" aria-labelledby="pf-title">
      <div className="pc-top">
        <button type="button" className="pc-back" onClick={onBack ?? onClose}>
          ← Back
        </button>
        <button type="button" className="pc-close" aria-label="Close profile" onClick={onClose}>
          ×
        </button>
      </div>

      <div className={`pf-head pf-head--${profile.role}`}>
        <span className={`pf-avatar pf-avatar--${profile.role}`} aria-hidden="true">
          {initials(profile.name)}
        </span>
        <div className="pf-who">
          <p className="pf-role">{mine ? 'You' : ROLE_INTRO[profile.role]}</p>
          <h2 id="pf-title" className="pf-name" tabIndex={-1} ref={headingRef}>
            {profile.name}
          </h2>
          <span className={`pf-badge pf-badge--${profile.role}`}>{badge}</span>
        </div>
      </div>

      {mine && (
        <p className="pf-note">
          This is your profile. Parts marked <span aria-hidden="true">🔒</span> “Only you see this” are private; everything else is what other people see.
        </p>
      )}

      {profile.bio && <p className="pf-bio">{profile.bio}</p>}

      <dl className="pc-facts">
        {profile.area && (
          <>
            <dt>{AREA_LABEL[profile.role] ?? 'Area'}</dt>
            <dd>{profile.area}</dd>
          </>
        )}
        {place && (
          <>
            <dt>Address</dt>
            <dd>{place.address ?? '—'}</dd>
            {place.hours && (
              <>
                <dt>Hours</dt>
                <dd>{place.hours}</dd>
              </>
            )}
          </>
        )}
        {bia && (
          <>
            <dt>Part of</dt>
            <dd>
              <ProfileLink p={bia} onOpen={onOpenProfile} />
            </dd>
          </>
        )}
      </dl>

      {/* Owner and business are separate profiles. Only the owner sees how they connect. */}
      {owner && (
        <section className="pc-section pf-private" aria-label="Run by you">
          <h3>Run by you</h3>
          <OnlyYou />
          <p className="pc-muted">Other people see the business only, not who owns it.</p>
          <p className="pf-linkrow">
            Your personal profile: <ProfileLink p={owner} onOpen={onOpenProfile} />
          </p>
        </section>
      )}
      {myBusinesses.length > 0 && (
        <section className="pc-section pf-private" aria-label="Your business">
          <h3>Your business</h3>
          <OnlyYou />
          <p className="pc-muted">Your business has its own profile in the BIA corridor. It isn’t shown on your personal profile.</p>
          {myBusinesses.map((b) => (
            <p key={b.id} className="pf-linkrow">
              <ProfileLink p={b} onOpen={onOpenProfile} />
            </p>
          ))}
        </section>
      )}

      {/* Resident home base */}
      {comingUp.length > 0 && (
        <section className="pc-section" aria-label="Coming up for you">
          <h3>Coming up for you</h3>
          <p className="pc-muted">Picked from your interests.</p>
          <ul className="pc-list">
            {comingUp.map((c) => (
              <li key={c.id}>
                <ActivityCard item={c} onSelect={openPin(c)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {home && (
        <section className="pc-section pf-private" aria-label="My reports">
          <h3>My reports</h3>
          <OnlyYou />
          {myReports.length === 0 ? (
            <p className="pc-muted">You haven’t reported anything yet.</p>
          ) : (
            <ul className="pc-list">
              {myReports.map((r) => (
                <li key={r.id}>
                  <ActivityCard item={r} mine onSelect={openPin(r)} />
                  <SentTo data={data} item={r} onOpen={onOpenProfile} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {responders.length > 0 && (
        <section className="pc-section" aria-label="Who to contact about a problem">
          <h3>Who to contact about a problem</h3>
          <p className="pc-muted">Potholes, street lights and sidewalks go to the city or your ward councillor, not the BIA.</p>
          <ul className="pf-responders">
            {responders.map((r) => (
              <li key={r.id}>
                <span className={`pf-avatar pf-avatar--sm pf-avatar--${r.role}`} aria-hidden="true">
                  {initials(r.name)}
                </span>
                <span className="pf-resp-body">
                  <ProfileLink p={r} onOpen={onOpenProfile} />
                  <span className="pf-resp-badge">{r.badge ?? ROLE_LABEL[r.role]}</span>
                  {r.handles && <span className="pc-muted">{r.handles.slice(0, 3).join(', ')}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!!(profile.interests?.length || profile.skills?.length) && (
        <section className="pc-section" aria-label="Interests and skills">
          <h3>Interests and skills</h3>
          <p className="pc-muted">Tap one to see what matches it on the corridor.</p>
          <ul className="pf-tags">
            {[...(profile.interests ?? []), ...(profile.skills ?? [])].map((t) => (
              <li key={t}>
                <button
                  type="button"
                  className="pf-tag"
                  aria-pressed={interest === t}
                  aria-controls="pf-interest-results"
                  onClick={() => setInterest((cur) => (cur === t ? null : t))}
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>
          <div id="pf-interest-results" aria-live="polite">
            {interest &&
              (() => {
                const hits = interestMatches(data, interest);
                return hits.length === 0 ? (
                  <p className="pf-nomatch">Nothing on Wyandotte St E for “{interest}” yet.</p>
                ) : (
                  <>
                    <p className="pf-match-title">
                      {hits.length} on the corridor for “{interest}”
                    </p>
                    <ul className="pc-list">
                      {hits.map((h) => (
                        <li key={h.id}>
                          <ActivityCard item={h} onSelect={(id) => onSelect(pinIdFor(h) ?? id)} />
                        </li>
                      ))}
                    </ul>
                  </>
                );
              })()}
          </div>
        </section>
      )}

      {/* Councillor, city, MP */}
      {profile.handles && profile.handles.length > 0 && (
        <section className="pc-section" aria-label="Handles">
          <h3>Handles</h3>
          <ul className="pf-handles">
            {profile.handles.map((h) => (
              <li key={h}>{fieldLabel(h)}</li>
            ))}
          </ul>
          {profile.role === 'mp' && <p className="pc-muted">Federal matters only. Local repairs go to the city or your ward councillor.</p>}
        </section>
      )}
      {sentHere.length > 0 && (
        <section className="pc-section pf-private" aria-label="Your reports sent here">
          <h3>Your reports sent here</h3>
          <OnlyYou />
          <ul className="pc-list">
            {sentHere.map((r) => (
              <li key={r.id}>
                <ActivityCard item={r} mine onSelect={openPin(r)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="pf-actions">
        {place && (
          <button type="button" className="pc-link" onClick={() => onSelect(place.id)}>
            Show on map →
          </button>
        )}
        {profile.role === 'bia' && onToggleCorridor && (
          <button type="button" className="pc-link" aria-pressed={corridorShown} onClick={onToggleCorridor}>
            {corridorShown ? 'Hide corridor on map' : 'Show corridor on map'}
          </button>
        )}
      </div>

      {activity.length > 0 && (
        <section className="pc-section" aria-label={profile.role === 'bia' ? 'Public notices' : 'What’s on'}>
          <h3>{profile.role === 'bia' ? 'Public notices' : 'What’s on'}</h3>
          <ul className="pc-list">
            {activity.map((a) => (
              <li key={a.id}>
                <ActivityCard item={a} onSelect={openPin(a)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="pc-section pf-privacy" aria-label="What’s public and what’s private">
        <h3>What’s public and what’s private</h3>
        <div className="pf-cols">
          <div>
            <p className="pf-col-title">
              <span aria-hidden="true">👁 </span>Everyone can see
            </p>
            <ul>
              {(profile.public ?? []).map((f) => (
                <li key={f}>{fieldLabel(f)}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="pf-col-title">
              <span aria-hidden="true">🔒 </span>Never shown to others
            </p>
            <ul>
              {(profile.private ?? []).map((f) => (
                <li key={f}>{fieldLabel(f)}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <p className="pc-demo">
        Illustrative sample profile. Not a real {isResponder ? 'office or official; no report reaches a real office in this demo' : 'person or organization'}.
      </p>
    </article>
  );
}
