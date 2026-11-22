// KAN-53 (Devu): the Marketplace (#/marketplace).
// Listings for sale, free, wanted, services and business offers, with a photo, a price and the area.
// Search and filters (kind, price, free only, distance), create a listing, message the seller
// (opens a chat in Bhavana's Chats), report a listing (to the Neighbr staff queue), and see it on the
// map. Every listing has an end date: after it the listing leaves the Marketplace and the map, and the
// person who posted it gets a notification.
// Follows Viewing as. Sample listings only; the pin is always a public meeting spot, never a home.
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  createListing,
  endListing,
  getListings,
  getMarketAreas,
  messageSeller,
  onDataChange,
  relistListing,
  reportListing,
} from '../../data/api';
import type { Persona } from '../requests/requests';
import { ListingArt } from './art';
import {
  CATEGORIES,
  CORRIDOR_CENTER,
  DESCRIPTION_MAX,
  DISTANCES,
  DURATIONS,
  LISTING_REPORT_REASONS,
  NOTE_MAX,
  SORTS,
  TITLE_MAX,
  UNIT_MAX,
  activeFilterCount,
  areaLabel,
  browse,
  canPost,
  canReportListing,
  categoriesFor,
  categoryLabel,
  dayLabel,
  distanceLabel,
  distanceM,
  emptyDraft,
  endsLabel,
  isLive,
  noFilters,
  priceLabel,
  validateListing,
  type Area,
  type DraftErrors,
  type Filters,
  type Listing,
  type ListingCategory,
  type ListingDraft,
  type ListingReportReason,
  type SortId,
} from './marketplace';
import './Marketplace.css';

/** "#/marketplace?l=mk-01" -> "mk-01" */
function listingFromHash(): string | null {
  const q = window.location.hash.split('?')[1] ?? '';
  return new URLSearchParams(q).get('l');
}

/** Make a photo small enough to keep in the demo (max 640 px, JPEG). */
function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The photo could not be read.'));
    reader.onload = () => {
      const original = String(reader.result);
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, 640 / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('This browser cannot shrink the photo. Try another one.'));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } catch {
          reject(new Error('The photo could not be prepared. Try another one.'));
        }
      };
      img.onerror = () => reject(new Error('That file could not be opened as a photo.'));
      img.src = original;
    };
    reader.readAsDataURL(file);
  });
}

function Picture({ l, className }: { l: Listing; className: string }) {
  if (l.photo) return <img className={className} src={l.photo} alt={l.photoAlt ?? `Photo for ${l.title}`} />;
  return <ListingArt className={className} art={l.art ?? 'boxes'} category={l.category} />;
}

export default function MarketplacePage({ persona, now: nowProp }: { persona: Persona; now?: Date }) {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<'browse' | 'mine'>('browse');
  const [filters, setFilters] = useState<Filters>(noFilters);
  const [selectedId, setSelectedId] = useState<string | null>(() => listingFromHash());
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');
  const now = nowProp ?? new Date();
  const from = persona.home ?? CORRIDOR_CENTER;

  useEffect(() => {
    let live = true;
    const load = () =>
      Promise.all([getListings(persona), getMarketAreas()])
        .then(([l, a]) => {
          if (!live) return;
          setListings(l);
          setAreas(a);
        })
        .catch(() => live && setFailed(true));
    load();
    const off = onDataChange(load);
    return () => {
      live = false;
      off();
    };
  }, [persona]);

  // A link from the map or the bell (#/marketplace?l=...) opens that listing.
  useEffect(() => {
    const onHash = () => setSelectedId(listingFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    window.history.replaceState(null, '', id ? `#/marketplace?l=${encodeURIComponent(id)}` : '#/marketplace');
  }, []);

  if (failed) return <p className="mk-status">Could not load the Marketplace. Refresh the page to try again.</p>;
  if (!listings) return <p className="mk-status" aria-live="polite">Loading the Marketplace…</p>;

  const mine = listings.filter((l) => l.sellerId === persona.profileId);
  const selected = selectedId ? listings.find((l) => l.id === selectedId) : undefined;
  const post = canPost(persona);

  return (
    <div className="mk-page">
      <header className="mk-head">
        <div>
          <h1 className="mk-h1">Marketplace</h1>
          <p className="mk-demo">
            Sample listings for the demo. Meet in a public place: every pin on the map is a shop, the hall or the parkette, never a home.
          </p>
        </div>
        {post.ok ? (
          <button type="button" className="mk-btn mk-btn--primary" onClick={() => setCreating(true)} disabled={creating}>
            Create a listing
          </button>
        ) : null}
      </header>
      {!post.ok && (
        <p className="mk-locked" role="note">
          {post.reason}
        </p>
      )}
      {notice && (
        <p className="mk-ok" role="status">
          {notice}
        </p>
      )}

      {creating && (
        <CreateForm
          persona={persona}
          areas={areas}
          onCancel={() => setCreating(false)}
          onCreated={(l) => {
            setCreating(false);
            setNotice(l.onMap ? 'Your listing is up, and on the map.' : 'Your listing is up. It is not on the map.');
            setTab('browse');
            select(l.id);
          }}
        />
      )}

      {selected ? (
        <Detail
          key={selected.id}
          listing={selected}
          persona={persona}
          from={from}
          now={now}
          onBack={() => select(null)}
          onNotice={setNotice}
        />
      ) : (
        <>
          <div className="mk-tabs" role="tablist" aria-label="Marketplace">
            <button type="button" role="tab" id="mk-tab-browse" aria-selected={tab === 'browse'} aria-controls="mk-panel" className="mk-tab" onClick={() => setTab('browse')}>
              Browse
            </button>
            <button type="button" role="tab" id="mk-tab-mine" aria-selected={tab === 'mine'} aria-controls="mk-panel" className="mk-tab" onClick={() => setTab('mine')}>
              My listings ({mine.length})
            </button>
          </div>
          <div id="mk-panel" role="tabpanel" aria-labelledby={tab === 'browse' ? 'mk-tab-browse' : 'mk-tab-mine'}>
            {tab === 'browse' ? (
              <Browse listings={listings} filters={filters} setFilters={setFilters} from={from} hasHome={Boolean(persona.home)} now={now} onOpen={select} />
            ) : (
              <Mine mine={mine} now={now} from={from} onOpen={select} canCreate={post.ok} onCreate={() => setCreating(true)} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Browse: search, filters, the grid ----------

function Browse({ listings, filters, setFilters, from, hasHome, now, onOpen }: { listings: Listing[]; filters: Filters; setFilters: (f: Filters) => void; from: [number, number]; hasHome: boolean; now: Date; onOpen: (id: string) => void }) {
  const id = useId();
  const rows = useMemo(() => browse(listings, filters, from, now), [listings, filters, from, now]);
  const active = activeFilterCount(filters);
  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });
  const priceLimit = filters.minPrice.trim() !== '' || filters.maxPrice.trim() !== '' || filters.freeOnly;

  return (
    <>
      <form className="mk-filters" role="search" aria-label="Search and filter listings" onSubmit={(e) => e.preventDefault()}>
        <div className="mk-field mk-field--wide">
          <label htmlFor={`${id}-q`}>Search listings</label>
          <input id={`${id}-q`} type="search" value={filters.query} placeholder="Bike, shovelling, free books…" onChange={(e) => set({ query: e.target.value })} />
        </div>
        <fieldset className="mk-kinds">
          <legend>Kind</legend>
          <div className="mk-chips">
            {[{ id: 'all' as const, label: 'All' }, ...CATEGORIES].map((c) => (
              <button key={c.id} type="button" className="mk-chip" aria-pressed={filters.category === c.id} onClick={() => set({ category: c.id })}>
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="mk-row">
          <div className="mk-field">
            <label htmlFor={`${id}-min`}>Lowest price ($)</label>
            <input id={`${id}-min`} type="number" inputMode="decimal" min={0} value={filters.minPrice} onChange={(e) => set({ minPrice: e.target.value })} />
          </div>
          <div className="mk-field">
            <label htmlFor={`${id}-max`}>Highest price ($)</label>
            <input id={`${id}-max`} type="number" inputMode="decimal" min={0} value={filters.maxPrice} onChange={(e) => set({ maxPrice: e.target.value })} />
          </div>
          <div className="mk-field">
            <label htmlFor={`${id}-dist`}>Distance</label>
            <select id={`${id}-dist`} value={filters.maxDistanceM === null ? 'any' : String(filters.maxDistanceM)} onChange={(e) => set({ maxDistanceM: e.target.value === 'any' ? null : Number(e.target.value) })}>
              {DISTANCES.map((d) => (
                <option key={d.id} value={d.id === 'any' ? 'any' : String(d.m)}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mk-field">
            <label htmlFor={`${id}-sort`}>Sort by</label>
            <select id={`${id}-sort`} value={filters.sort} onChange={(e) => set({ sort: e.target.value as SortId })}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mk-row mk-row--center">
          <label className="mk-check">
            <input type="checkbox" checked={filters.freeOnly} onChange={(e) => set({ freeOnly: e.target.checked })} />
            Free only
          </label>
          {active > 0 && (
            <button type="button" className="mk-link" onClick={() => setFilters(noFilters())}>
              Clear filters ({active})
            </button>
          )}
        </div>
        {priceLimit && <p className="mk-hint">Listings with no price are hidden while a price limit or Free only is on.</p>}
      </form>

      <p className="mk-count" role="status" aria-live="polite">
        {rows.length === 0 ? 'No listings match.' : `${rows.length} ${rows.length === 1 ? 'listing' : 'listings'}`}
      </p>
      <p className="mk-hint">Distances are from {hasHome ? 'your home area' : 'the middle of the corridor'}.</p>
      {rows.length === 0 ? (
        <div className="mk-empty">
          <p>Nothing matches your search. Try fewer filters, or a wider distance.</p>
          {active > 0 && (
            <button type="button" className="mk-btn" onClick={() => setFilters(noFilters())}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ul className="mk-grid">
          {rows.map(({ listing: l, distance }) => (
            <li key={l.id}>
              <Card l={l} distance={distance} now={now} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Card({ l, distance, now, onOpen, own }: { l: Listing; distance: number; now: Date; onOpen: (id: string) => void; own?: boolean }) {
  const ended = !isLive(l, now);
  return (
    <article className={`mk-card${ended ? ' is-ended' : ''}`}>
      <Picture l={l} className="mk-photo" />
      <div className="mk-card-body">
        <p className="mk-meta">
          <span className={`mk-tag mk-tag--${l.category}`}>{categoryLabel(l.category)}</span>
          {l.onMap && !ended && <span className="mk-tag mk-tag--map">On the map</span>}
          {ended && <span className="mk-tag mk-tag--ended">{l.status === 'hidden' ? 'Removed' : 'Ended'}</span>}
        </p>
        <h3 className="mk-card-title">
          <button type="button" className="mk-open" onClick={() => onOpen(l.id)}>
            {l.title}
          </button>
        </h3>
        <p className="mk-price">{priceLabel(l)}</p>
        <p className="mk-line">
          {l.area} · {distanceLabel(distance)}
        </p>
        <p className="mk-line">
          {own ? 'You' : l.sellerName} · {endsLabel(l, now)}
        </p>
      </div>
    </article>
  );
}

function Mine({ mine, now, from, onOpen, canCreate, onCreate }: { mine: Listing[]; now: Date; from: [number, number]; onOpen: (id: string) => void; canCreate: boolean; onCreate: () => void }) {
  if (mine.length === 0) {
    return (
      <div className="mk-empty">
        <p>You have no listings yet.</p>
        {canCreate && (
          <button type="button" className="mk-btn mk-btn--primary" onClick={onCreate}>
            Create a listing
          </button>
        )}
      </div>
    );
  }
  const sorted = [...mine].sort((a, b) => Number(isLive(b, now)) - Number(isLive(a, now)) || b.posted.localeCompare(a.posted));
  return (
    <ul className="mk-grid">
      {sorted.map((l) => (
        <li key={l.id}>
          <Card l={l} own distance={distanceM(from, [l.lng, l.lat])} now={now} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}

// ---------- One listing ----------

function Detail({ listing: l, persona, from, now, onBack, onNotice }: { listing: Listing; persona: Persona; from: [number, number]; now: Date; onBack: () => void; onNotice: (t: string) => void }) {
  const id = useId();
  const own = l.sellerId === persona.profileId;
  const live = isLive(l, now);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState<null | 'sold' | 'removed'>(null);
  const [days, setDays] = useState<number>(14);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  async function run(fn: () => Promise<void>, ok?: string) {
    setError('');
    setBusy(true);
    try {
      await fn();
      if (ok) onNotice(ok);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const mapHref = `?c=${l.lng},${l.lat}&z=18&pin=${encodeURIComponent(l.id)}#/map`;
  const reportCheck = canReportListing(persona, l, []);

  return (
    <section className="mk-detail" aria-labelledby={`${id}-t`}>
      <button type="button" className="mk-back" onClick={onBack}>
        ← Back to listings
      </button>
      <div className="mk-detail-grid">
        <Picture l={l} className="mk-photo mk-photo--big" />
        <div>
          <p className="mk-meta">
            <span className={`mk-tag mk-tag--${l.category}`}>{categoryLabel(l.category)}</span>
            {!live && <span className="mk-tag mk-tag--ended">{l.status === 'hidden' ? 'Removed' : 'Ended'}</span>}
          </p>
          <h2 id={`${id}-t`} className="mk-h2" tabIndex={-1} ref={heading}>
            {l.title}
          </h2>
          <p className="mk-price mk-price--big">{priceLabel(l)}</p>
          <p className="mk-desc">{l.description}</p>
          <dl className="mk-facts">
            <div>
              <dt>Meeting spot</dt>
              <dd>
                {l.area} ({distanceLabel(distanceM(from, [l.lng, l.lat]))})
              </dd>
            </div>
            <div>
              <dt>Posted by</dt>
              <dd>{own ? `You (${l.sellerName})` : l.sellerName}</dd>
            </div>
            <div>
              <dt>Posted</dt>
              <dd>{dayLabel(l.posted)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{endsLabel(l, now)}</dd>
            </div>
            <div>
              <dt>On the map</dt>
              <dd>{l.onMap && live ? 'Yes, at the meeting spot' : 'No'}</dd>
            </div>
          </dl>

          {!live && (
            <p className="mk-ended" role="status">
              {l.status === 'hidden' ? 'Neighbr staff removed this listing.' : 'This post has ended. It is no longer in the Marketplace or on the map.'}
            </p>
          )}

          <div className="mk-actions">
            {live && !own && (
              <>
                <button
                  type="button"
                  className="mk-btn mk-btn--primary"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const chat = await messageSeller(persona, l.id);
                      window.location.hash = `#/chats?c=${encodeURIComponent(chat)}`;
                    })
                  }
                >
                  Message the seller
                </button>
                {l.onMap && (
                  <a className="mk-btn" href={mapHref}>
                    See it on the map
                  </a>
                )}
                {reportCheck.ok && !reported && (
                  <button type="button" className="mk-btn" onClick={() => setReporting((r) => !r)} aria-expanded={reporting}>
                    Report this listing
                  </button>
                )}
                {reported && <span className="mk-reported">You reported this listing.</span>}
              </>
            )}
            {live && own && (
              <>
                {l.onMap && (
                  <a className="mk-btn" href={mapHref}>
                    See it on the map
                  </a>
                )}
                <button type="button" className="mk-btn" disabled={busy} onClick={() => setConfirmEnd('sold')}>
                  Mark as sold or done
                </button>
                <button type="button" className="mk-btn mk-btn--danger" disabled={busy} onClick={() => setConfirmEnd('removed')}>
                  Take it down
                </button>
              </>
            )}
            {!live && own && l.status !== 'hidden' && (
              <div className="mk-relist">
                <label htmlFor={`${id}-days`}>Post it again for</label>
                <select id={`${id}-days`} value={days} onChange={(e) => setDays(Number(e.target.value))}>
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} days
                    </option>
                  ))}
                </select>
                <button type="button" className="mk-btn mk-btn--primary" disabled={busy} onClick={() => run(() => relistListing(persona, l.id, days), 'Your listing is up again.')}>
                  Post again
                </button>
              </div>
            )}
          </div>
          {live && own && <p className="mk-hint">Only you see these buttons. Anyone who messages you appears in Chats.</p>}

          {confirmEnd && (
            <div className="mk-confirm" role="alertdialog" aria-labelledby={`${id}-ct`}>
              <p id={`${id}-ct`}>
                {confirmEnd === 'sold' ? 'Mark this as sold or done?' : 'Take this listing down?'} It leaves the Marketplace and the map, and you get a "This post has ended" notification.
              </p>
              <button
                type="button"
                className="mk-btn mk-btn--primary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await endListing(persona, l.id, confirmEnd);
                    setConfirmEnd(null);
                  }, 'This post has ended. It is off the Marketplace and the map.')
                }
              >
                Yes, end it
              </button>
              <button type="button" className="mk-btn" onClick={() => setConfirmEnd(null)}>
                Keep it up
              </button>
            </div>
          )}

          {reporting && !reported && (
            <ReportForm
              onSend={(reason, note) =>
                run(async () => {
                  await reportListing(persona, l.id, reason, note);
                  setReporting(false);
                  setReported(true);
                }, 'Thank you. Neighbr staff will look at this listing. The seller is not told who reported it.')
              }
              onCancel={() => setReporting(false)}
              busy={busy}
            />
          )}
          {error && (
            <p className="mk-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function ReportForm({ onSend, onCancel, busy }: { onSend: (reason: ListingReportReason, note: string) => void; onCancel: () => void; busy: boolean }) {
  const id = useId();
  const [reason, setReason] = useState<ListingReportReason>(LISTING_REPORT_REASONS[0]);
  const [note, setNote] = useState('');
  return (
    <form
      className="mk-report"
      aria-label="Report this listing"
      onSubmit={(e) => {
        e.preventDefault();
        onSend(reason, note);
      }}
    >
      <label htmlFor={`${id}-r`}>Why are you reporting it?</label>
      <select id={`${id}-r`} value={reason} onChange={(e) => setReason(e.target.value as ListingReportReason)}>
        {LISTING_REPORT_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-n`}>More detail (optional)</label>
      <textarea id={`${id}-n`} rows={3} maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} />
      <p className="mk-hint">Goes to Neighbr staff. The seller is not told who reported it.</p>
      <div className="mk-row">
        <button type="submit" className="mk-btn mk-btn--primary" disabled={busy}>
          Send report
        </button>
        <button type="button" className="mk-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------- Create a listing ----------

function CreateForm({ persona, areas, onCancel, onCreated }: { persona: Persona; areas: Area[]; onCancel: () => void; onCreated: (l: Listing) => void }) {
  const id = useId();
  const [draft, setDraft] = useState<ListingDraft>(emptyDraft);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [sendError, setSendError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    heading.current?.scrollIntoView?.({ block: 'start' });
  }, []);
  const cats = categoriesFor(persona);
  const cat = CATEGORIES.find((c) => c.id === draft.category);
  const set = (patch: Partial<ListingDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const err = (k: keyof DraftErrors) => (errors[k] ? <p className="mk-error" id={`${id}-${k}-e`}>{errors[k]}</p> : null);
  const bad = (k: keyof DraftErrors) => ({ 'aria-invalid': errors[k] ? true : undefined, 'aria-describedby': errors[k] ? `${id}-${k}-e` : undefined });

  async function handlePhoto(file: File | undefined) {
    setPhotoError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) return setPhotoError('Choose a photo (JPG or PNG).');
    if (file.size > 10 * 1024 * 1024) return setPhotoError('That photo is over 10 MB. Choose a smaller one.');
    try {
      set({ photo: await readPhoto(file) });
    } catch (e) {
      setPhotoError((e as Error).message);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSendError('');
    const found = validateListing(draft, persona, areas.map((a) => a.id));
    setErrors(found);
    const first = (['category', 'title', 'description', 'price', 'priceUnit', 'areaId', 'days'] as const).find((k) => found[k]);
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      onCreated(await createListing(persona, draft));
    } catch (e2) {
      setSendError((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mk-create" onSubmit={submit} noValidate aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="mk-h2" tabIndex={-1} ref={heading}>
        Create a listing
      </h2>
      {Object.keys(errors).length > 0 && (
        <p className="mk-error" role="alert">
          Please fix the {Object.keys(errors).length === 1 ? 'item' : `${Object.keys(errors).length} items`} marked below.
        </p>
      )}
      <div className="mk-field">
        <label htmlFor={`${id}-category`}>What kind of listing is it?</label>
        <select id={`${id}-category`} value={draft.category} onChange={(e) => set({ category: e.target.value as ListingCategory | '' })} {...bad('category')}>
          <option value="">Choose one</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {err('category')}
      </div>
      <div className="mk-field">
        <label htmlFor={`${id}-title`}>Title</label>
        <input id={`${id}-title`} type="text" maxLength={TITLE_MAX + 10} value={draft.title} placeholder={cat?.example ?? ''} onChange={(e) => set({ title: e.target.value })} {...bad('title')} />
        {err('title')}
      </div>
      <div className="mk-field">
        <label htmlFor={`${id}-description`}>Description</label>
        <textarea id={`${id}-description`} rows={4} maxLength={DESCRIPTION_MAX + 20} value={draft.description} onChange={(e) => set({ description: e.target.value })} {...bad('description')} />
        <p className="mk-hint">{DESCRIPTION_MAX - draft.description.length} characters left. Do not put your address or phone number here. Use Chats.</p>
        {err('description')}
      </div>
      {cat && cat.price !== 'none' && (
        <div className="mk-row">
          <div className="mk-field">
            <label htmlFor={`${id}-price`}>{cat.priceLabel}</label>
            <input id={`${id}-price`} type="number" inputMode="decimal" min={0} value={draft.price} onChange={(e) => set({ price: e.target.value })} {...bad('price')} />
            {err('price')}
          </div>
          {(cat.id === 'service' || cat.id === 'business' || cat.id === 'sale') && (
            <div className="mk-field">
              <label htmlFor={`${id}-priceUnit`}>Per (optional)</label>
              <input id={`${id}-priceUnit`} type="text" maxLength={UNIT_MAX + 5} value={draft.priceUnit} placeholder="per hour, per visit" onChange={(e) => set({ priceUnit: e.target.value })} {...bad('priceUnit')} />
              {err('priceUnit')}
            </div>
          )}
        </div>
      )}
      {cat?.price === 'none' && <p className="mk-hint">Free listings show "Free" as the price.</p>}
      <div className="mk-field">
        <label htmlFor={`${id}-areaId`}>Public meeting spot</label>
        <select id={`${id}-areaId`} value={draft.areaId} onChange={(e) => set({ areaId: e.target.value })} {...bad('areaId')}>
          <option value="">Choose a spot</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {areaLabel(a.name)}
            </option>
          ))}
        </select>
        <p className="mk-hint">Meet in a public place. Your home address is never shown.</p>
        {err('areaId')}
      </div>
      <div className="mk-field">
        <label htmlFor={`${id}-days`}>Keep it up for</label>
        <select id={`${id}-days`} value={draft.days} onChange={(e) => set({ days: Number(e.target.value) })}>
          {DURATIONS.map((d) => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>
        <p className="mk-hint">After that it leaves the Marketplace and the map, and you get a "This post has ended" notification. You can post it again.</p>
      </div>
      <label className="mk-check">
        <input type="checkbox" checked={draft.onMap} onChange={(e) => set({ onMap: e.target.checked })} />
        Show it on the map, at the meeting spot
      </label>
      <div className="mk-field">
        <label htmlFor={`${id}-photo`}>Photo (optional)</label>
        {draft.photo ? (
          <div className="mk-photo-pick">
            <img src={draft.photo} alt="The photo you added" />
            <button type="button" className="mk-link" onClick={() => set({ photo: undefined })}>
              Remove photo
            </button>
          </div>
        ) : (
          <input id={`${id}-photo`} type="file" accept="image/*" onChange={(e) => handlePhoto(e.target.files?.[0])} />
        )}
        <p className="mk-hint">Without a photo, a drawing is used.</p>
        {photoError && <p className="mk-error">{photoError}</p>}
      </div>
      {sendError && (
        <p className="mk-error" role="alert">
          {sendError}
        </p>
      )}
      <div className="mk-row">
        <button type="submit" className="mk-btn mk-btn--primary" disabled={busy}>
          Post listing
        </button>
        <button type="button" className="mk-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
