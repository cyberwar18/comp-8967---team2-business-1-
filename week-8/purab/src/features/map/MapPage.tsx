// The map page: search and filter panel (KAN-9) beside the corridor map (KAN-7).
// The panel decides which items are visible; the map draws only those as pins.
// Clicking a result card or pressing Enter in search selects that pin, and the map flies to it.
// Data comes through the adapter in src/data/api.ts, never straight from the JSON file.
// On a phone the panel becomes a bottom sheet under the map that opens and closes.
//
// Bhavana's tasks 9–12 (src/features/cards):
//   9  "you are here" marker (the Me / My business switch lives in the top bar, see App.tsx)
//   10 place / profile card for the selected pin, inside the panel (bottom sheet on phone)
//   11 activity cards with the issue progress ring, in an "Around you" tab
//   12 cards and pins linked both ways (card -> pin flies; pin -> card opens and is highlighted)
//
// Purab's KAN-35 (src/features/report): "Report a problem" button on the map. Resident reports go to
// the City / ward councillor, business requests to the BIA. A sent report shows up straight away.
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Map as MlMap } from 'maplibre-gl';
import CorridorMap from './CorridorMap';
import { readUrlState } from './urlState';
import { allItems, type MapData, type MapItem, type WardArea } from './types';
import { buildMapExtras } from './extras';
import { publicRoadwork, schoolGeoJson, schoolPin, type School } from '../school/schoolData';
import { SearchAndFilters } from '../search/SearchAndFilters';
import type { MockData, MapItem as SearchItem } from '../search/filters';
import { actOnRequest, getListingPins, getMapData, getOffers, getPolls, getPosts, getProfiles, getSchools, getSupportable, getWards, onDataChange, submitReport } from '../../data/api';
import type { Persona } from '../requests/requests';
import type { NearbyRequest } from '../report/ReportProblem';
import { useIsPhone } from '../../app/useIsPhone';
import { PlaceCard } from '../cards/PlaceCard';
import { AroundYou } from '../cards/AroundYou';
import { useYouAreHere } from '../cards/useYouAreHere';
import { ProfileCard } from '../cards/ProfileCard';
import { useCorridorHighlight } from '../cards/useCorridorHighlight';
import { DEMO_BUSINESS_ID, DEMO_USER_ID, corridorLine, findItem, profileById, visibleToViewer, youAreHere, type CardData, type Item, type Mode } from '../cards/cardData';
import { ReportProblem } from '../report/ReportProblem';
import { YouSaidWeDid } from './YouSaidWeDid';
import { matchesStatusFilter, type StatusFilter } from './requestStatus';
import { useT } from '../../app/i18n';
import './MapPage.css';
import '../cards/Cards.css';

interface Props {
  mode?: Mode; // Me / My business, chosen in the top bar (task 9)
  showMe?: boolean; // "Show me on the map" (task 9)
  /** A profile to open, e.g. after clicking the avatar in the top bar. `n` changes on every click. */
  openProfile?: { id: string; n: number } | null;
  /** Sprint 5: staff (City 311, BIA, councillor) look at the public map. Hides private reports and the Report button. */
  viewerOverride?: string;
  /** Sprint 6: whether this person can send reports (City staff and the councillor handle them instead). */
  canReport?: boolean;
  /** Sprint 6 ("Me too"): who is reporting, so they can support a request already on the map. */
  persona?: Persona;
}

export default function MapPage({ mode = 'me', showMe = false, openProfile = null, viewerOverride, canReport = true, persona }: Props) {
  const [data, setData] = useState<MockData | null>(null);
  const [cards, setCards] = useState<CardData | null>(null);
  const [extra, setExtra] = useState<{ posts: MapItem[]; polls: MapItem[]; wards: WardArea[]; schools: School[]; listings: MapItem[] } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    const load = () =>
      Promise.all([getMapData(), getProfiles(), getOffers(), getPosts(), getPolls(), getWards(), getSchools(), getListingPins()])
        .then(([map, profiles, offers, posts, polls, wards, schools, listings]) => {
          if (!live) return;
          setData(map);
          setExtra({ posts: posts as unknown as MapItem[], polls: polls as unknown as MapItem[], wards, schools, listings: listings as unknown as MapItem[] });
          setCards({ ...(map as unknown as CardData), profiles: profiles as unknown as CardData['profiles'], offers: offers as unknown as CardData['offers'] });
        })
        .catch(() => live && setFailed(true));
    load();
    const off = onDataChange(load); // KAN-35: reload when a report is sent
    return () => {
      live = false;
      off();
    };
  }, []);

  if (failed) return <p className="mp-status">Could not load the map data. Refresh the page to try again.</p>;
  if (!data || !cards || !extra) return <p className="mp-status" aria-live="polite">Loading the map…</p>;
  return <MapView data={data} cards={cards} extra={extra} mode={mode} showMe={showMe} openProfile={openProfile} viewerOverride={viewerOverride} canReport={canReport} persona={persona} />;
}

type Tab = 'search' | 'around' | 'outcomes';

function MapView({
  data,
  cards,
  extra,
  mode,
  showMe,
  openProfile,
  viewerOverride,
  canReport = true,
  persona,
}: {
  data: MockData;
  cards: CardData;
  extra: { posts: MapItem[]; polls: MapItem[]; wards: WardArea[]; schools: School[]; listings: MapItem[] };
  mode: Mode;
  showMe: boolean;
  openProfile: { id: string; n: number } | null;
  viewerOverride?: string;
  canReport?: boolean;
  persona?: Persona;
}) {
  const t = useT();
  // Who is looking decides what they may see: private reports only show to whoever raised them.
  const viewerId = viewerOverride ?? (mode === 'business' ? DEMO_BUSINESS_ID : DEMO_USER_ID);
  const viewData = useMemo(() => visibleToViewer(data as unknown as CardData, viewerId) as unknown as MockData, [data, viewerId]);
  const items = useMemo(() => allItems(viewData as unknown as MapData), [viewData]);
  const phone = useIsPhone();

  // Offers, business posts and BIA polls: only public ones ever reach the map (see extras.ts).
  // KAN-43: the school pin and its routes. Only PUBLIC roadwork counts for the alert (see schoolData.ts).
  const roadworks = useMemo(() => publicRoadwork(items as never), [items]);
  const schoolGeo = useMemo(() => schoolGeoJson(extra.schools, roadworks), [extra.schools, roadworks]);
  const extras = useMemo(
    () => [
      ...buildMapExtras({ places: items, offers: cards.offers as never, posts: extra.posts as never, polls: extra.polls as never }),
      ...(extra.schools.map((s) => schoolPin(s, roadworks)) as MapItem[]),
      ...extra.listings, // KAN-53 (Devu): Marketplace listings, only live ones the seller put on the map
    ],
    [items, cards, extra, roadworks],
  );
  // Only offers, posts and polls that have a card in the side panel open one.
  const hasCard = useCallback((id: string) => findItem(cards, id) !== undefined, [cards]);

  // What the search box and chips currently let through. Starts as everything.
  const [visible, setVisible] = useState<MapItem[]>(items);

  const [selectedId, setSelectedIdRaw] = useState<string | null>(() => {
    const pin = readUrlState(window.location.search).pin;
    return pin && (items.some((i) => i.id === pin) || extras.some((i) => i.id === pin)) ? pin : null;
  });
  // Task 10/12: is the card open? "Back to list" closes the card but keeps the pin selected,
  // so the pin keeps its ring and the list highlights its row. "×" clears the selection.
  const [detailOpen, setDetailOpen] = useState(selectedId !== null && hasCard(selectedId));
  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdRaw(id);
    setDetailOpen(id !== null && hasCard(id)); // polls and business posts show their details in the map popup
  }, [hasCard]);
  const backToList = useCallback(() => setDetailOpen(false), []);

  // Phone only: is the list sheet open? Closed by default so the map gets the space.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('search');
  // Sprint 6 (Devu): which request pins the map shows (all, in progress, resolved, declined).
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // KAN-35: Report a problem. After "See it on the map", wait until the reloaded data has the
  // new report, then select it (its card opens and the map flies to its pin).
  const [reportOpen, setReportOpen] = useState(false);
  // Week 8: a QR poster links to #/map?report=<place id>: open Report a problem with that place chosen.
  const [reportStart, setReportStart] = useState<string | undefined>(undefined);
  useEffect(() => {
    const fromLink = () => {
      const m = window.location.hash.match(/^#\/?map\?(?:.*&)?report=([\w-]+)/);
      if (!m) return;
      setReportStart(m[1]);
      setReportOpen(true);
      // tidy the address so a refresh doesn't open the form again
      try {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/map`);
      } catch {
        /* history blocked: leave the address as it is */
      }
    };
    fromLink();
    window.addEventListener('hashchange', fromLink);
    return () => window.removeEventListener('hashchange', fromLink);
  }, []);
  // Sprint 6 (Purab): pick the exact spot on the map while the report form waits.
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<[number, number] | null>(null);
  // "Me too": requests already on the map that this person could support instead.
  const [nearby, setNearby] = useState<NearbyRequest[]>([]);
  useEffect(() => {
    if (!persona) return;
    let live = true;
    const load = () => getSupportable(persona).then((n) => live && setNearby(n));
    load();
    const off = onDataChange(load);
    return () => {
      live = false;
      off();
    };
  }, [persona]);
  const handleSupport = useCallback(
    async (id: string) => {
      if (persona) await actOnRequest(id, persona, 'support');
    },
    [persona],
  );
  const [map, setMap] = useState<MlMap | null>(null);
  useEffect(() => {
    if (!picking || !map) return;
    const canvas = map.getCanvas();
    const before = canvas.style.cursor;
    canvas.style.cursor = 'crosshair';
    const onClick = (e: { lngLat: { lng: number; lat: number } }) => {
      setPicked([e.lngLat.lng, e.lngLat.lat]);
      setPicking(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPicking(false);
    map.once('click', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      map.off('click', onClick);
      window.removeEventListener('keydown', onKey);
      canvas.style.cursor = before;
    };
  }, [picking, map]);
  const [pendingReport, setPendingReport] = useState<string | null>(null);

  // Task 9: who is looking, and the approximate "you are here" point.
  const here = useMemo(() => youAreHere(cards), [cards]);
  useYouAreHere(map, showMe, here);

  // Profile cards (resident, business, BIA). Shown on top of whatever was open; closing returns to it.
  // KAN-37: profiles open from other profiles (resident -> councillor, business -> owner), so keep
  // a short history: Back returns to the previous profile, × closes them all.
  const [profileStack, setProfileStack] = useState<string[]>([]);
  const profileId = profileStack.length ? profileStack[profileStack.length - 1] : null;
  const [corridorShown, setCorridorShown] = useState(false);
  const showsCorridor = useCallback((id: string | undefined) => !!id && profileById(cards, id)?.role === 'bia', [cards]);
  const openProfileCard = useCallback(
    (id: string) => {
      setProfileStack([id]);
      setCorridorShown(showsCorridor(id)); // a BIA profile shows its corridor straight away
      if (phone) setSheetOpen(true);
    },
    [showsCorridor, phone],
  );
  const pushProfile = useCallback(
    (id: string) => {
      setProfileStack((st) => (st[st.length - 1] === id ? st : [...st, id]));
      setCorridorShown(showsCorridor(id));
    },
    [showsCorridor],
  );
  const closeProfile = useCallback(() => {
    setProfileStack([]);
    setCorridorShown(false);
  }, []);
  const backProfile = useCallback(() => {
    setProfileStack((st) => {
      const next = st.slice(0, -1);
      setCorridorShown(showsCorridor(next[next.length - 1]));
      return next;
    });
  }, [showsCorridor]);
  useEffect(() => {
    if (openProfile) openProfileCard(openProfile.id);
  }, [openProfile, openProfileCard]);
  const line = useMemo(() => corridorLine(cards), [cards]);
  useCorridorHighlight(
    map,
    corridorShown && profileId !== null,
    line,
    phone ? { top: 80, bottom: 320, left: 40, right: 40 } : { top: 100, bottom: 100, left: 460, right: 100 },
  );

  // Switching to My business opens the business's own card, where its private requests are.
  useEffect(() => {
    if (mode !== 'business') return;
    const biz = cards.profiles.find((p) => p.id === DEMO_BUSINESS_ID);
    if (biz?.placeId) setSelectedId(biz.placeId);
  }, [mode, cards, setSelectedId]);

  // Task 12: the open card's pin always stays on the map, even if the search would hide it
  // (e.g. picking an event in Around you while the search says "books").
  const mapItems = useMemo(() => {
    // When a search or chip narrows the pins, offers/posts/polls only stay if their place is still showing.
    const narrowed = visible.length < items.length;
    const ids = new Set(visible.map((i) => i.id));
    const shownExtras = narrowed ? extras.filter((e) => (typeof e.placeId === 'string' && ids.has(e.placeId)) || e.id === selectedId) : extras;
    const base = [...visible, ...shownExtras].filter((i) => matchesStatusFilter(i, statusFilter));
    if (!selectedId || base.some((i) => i.id === selectedId)) return base;
    const sel = items.find((i) => i.id === selectedId);
    return sel ? [...base, sel] : base;
  }, [visible, items, extras, selectedId, statusFilter]);

  // Stable callbacks, so the panel doesn't re-send its results on every render.
  const handleResults = useCallback((results: SearchItem[]) => setVisible(results), []);
  const handleFocus = useCallback(
    (item: SearchItem) => {
      setSelectedId(item.id);
      if (phone) setSheetOpen(false); // show the map after choosing a result
    },
    [phone, setSelectedId],
  );
  const selectFromProfile = useCallback(
    (id: string) => {
      setProfileStack([]);
      setCorridorShown(false);
      setSelectedId(id);
      if (phone) setSheetOpen(false);
    },
    [phone, setSelectedId],
  );
  const handleAroundSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (phone) setSheetOpen(false);
    },
    [phone, setSelectedId],
  );
  // Task 12: tapping a pin opens its card (on a phone, the sheet opens to show it).
  const handleMapSelect = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (phone && id && hasCard(id)) setSheetOpen(true);
    },
    [phone, setSelectedId, hasCard],
  );

  // Back from a card: bring the highlighted card in the list into view and give it keyboard focus,
  // so keyboard users continue where they were (a11y check).
  useEffect(() => {
    if (detailOpen || !selectedId) return;
    const el = document.querySelector('.mp-lists .mp-tabpanel:not([hidden]) [aria-current="true"]') as HTMLElement | null;
    el?.scrollIntoView?.({ block: 'center' });
    el?.focus({ preventScroll: true });
  }, [detailOpen, selectedId]);

  useEffect(() => {
    if (!pendingReport || !hasCard(pendingReport)) return;
    setProfileStack([]);
    setSelectedId(pendingReport);
    if (phone) setSheetOpen(true);
    setPendingReport(null);
  }, [pendingReport, hasCard, setSelectedId, phone]);
  const handleReportSubmit = useCallback(async (report: Item) => {
    await submitReport(report as unknown as SearchItem);
  }, []);
  const handleReportShow = useCallback((id: string) => {
    setReportOpen(false);
    setPendingReport(id);
  }, []);

  // Escape closes the open profile, then the open card (a11y check: keyboard users need a quick way out).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || reportOpen) return;
      if (profileId) backProfile();
      else if (detailOpen && selectedId) backToList();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [profileId, detailOpen, selectedId, backProfile, backToList, reportOpen]);

  const collapsed = phone && !sheetOpen;
  const selectedName = selectedId && detailOpen ? findItem(cards, selectedId)?.name : undefined;
  const profileName = profileId ? profileById(cards, profileId)?.name : undefined;

  return (
    <div className="mp-root">
      <aside className={`mp-panel${collapsed ? ' mp-panel--collapsed' : ''}`} aria-label="Search and results">
        <button
          type="button"
          className="mp-sheet-toggle"
          aria-expanded={!collapsed}
          aria-controls="mp-panel-body"
          onClick={() => setSheetOpen((o) => !o)}
        >
          <span className="mp-sheet-handle" aria-hidden="true" />
          {collapsed
            ? profileName
              ? `Show profile: ${profileName}`
              : selectedName
                ? `Show details: ${selectedName}`
                : `Show list and filters (${visible.length})`
            : 'Hide list'}
        </button>
        <div id="mp-panel-body" className="mp-panel-body">
          {/* Lists stay mounted (so search text and chips are kept) and are hidden while a card is open. */}
          <div className="mp-lists" hidden={(detailOpen && selectedId !== null) || profileId !== null}>
            <div role="tablist" aria-label="Panel" className="mp-tabs">
              <button type="button" role="tab" aria-selected={tab === 'search'} onClick={() => setTab('search')}>
                Search
              </button>
              <button type="button" role="tab" aria-selected={tab === 'around'} onClick={() => setTab('around')}>
                Around you
              </button>
              <button type="button" role="tab" aria-selected={tab === 'outcomes'} onClick={() => setTab('outcomes')}>
                You said, we did
              </button>
            </div>
            <div className="mp-tabpanel mp-tabpanel--search" role="tabpanel" hidden={tab !== 'search'}>
              <SearchAndFilters data={viewData} selectedId={selectedId} onResultsChange={handleResults} onFocusItem={handleFocus} />
            </div>
            <div className="mp-tabpanel" role="tabpanel" hidden={tab !== 'around'}>
              <AroundYou data={cards} viewerId={viewerId} from={here} selectedId={selectedId} onSelect={handleAroundSelect} />
            </div>
            <div className="mp-tabpanel" role="tabpanel" hidden={tab !== 'outcomes'}>
              <YouSaidWeDid
                items={items}
                places={data.places}
                filter={statusFilter}
                onFilter={setStatusFilter}
                selectedId={selectedId}
                onSelect={handleAroundSelect}
                viewerId={viewerId}
              />
            </div>
          </div>

          {profileId && (
            <div className="mp-detail">
              <ProfileCard
                data={cards}
                profileId={profileId}
                viewerId={viewerId}
                onClose={closeProfile}
                onBack={backProfile}
                onSelect={selectFromProfile}
                onOpenProfile={pushProfile}
                corridorShown={corridorShown}
                onToggleCorridor={() => setCorridorShown((v) => !v)}
              />
            </div>
          )}

          {!profileId && detailOpen && selectedId && (
            <div className="mp-detail">
              <PlaceCard data={cards} selectedId={selectedId} viewerId={viewerId} mode={mode} onSelect={setSelectedId} onBack={backToList} onOpenProfile={openProfileCard} />
            </div>
          )}
        </div>
      </aside>
      <div className="mp-map">
        {canReport && !picking && (
        <button
          type="button"
          className="rp-open"
          onClick={() => setReportOpen(true)}
          aria-haspopup="dialog"
          aria-label={mode === 'business' ? 'Request help from the BIA' : t('rp.title')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 9v4m0 4h.01M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
          <span className="rp-open-long">{mode === 'business' ? 'Request help from the BIA' : t('rp.title')}</span>
          <span className="rp-open-short" aria-hidden="true">
            {mode === 'business' ? 'Ask BIA' : t('rp.short')}
          </span>
        </button>
        )}
        {picking && (
          <div className="rp-pickbar" role="status">
            Click the map where the problem is
            <button type="button" onClick={() => setPicking(false)}>
              Cancel
            </button>
          </div>
        )}
        {reportOpen && canReport && (
          <ReportProblem
            key={reportStart ?? 'report'}
            startPlaceId={reportStart}
            data={cards}
            mode={mode}
            viewerId={viewerId}
            from={here}
            onSubmit={handleReportSubmit}
            onShow={handleReportShow}
            onClose={() => {
              setReportOpen(false);
              setReportStart(undefined);
              setPicking(false);
              setPicked(null);
            }}
            onPickOnMap={map ? () => setPicking(true) : undefined}
            nearby={nearby}
            onSupport={persona ? handleSupport : undefined}
            picked={picked}
            picking={picking}
          />
        )}
        <CorridorMap
          allItems={items}
          items={mapItems}
          selectedId={selectedId}
          onSelect={handleMapSelect}
          onMapReady={setMap}
          areas={extra.wards}
          schoolGeo={schoolGeo}
          // keep pins clear of the floating panel when the map frames the corridor
          fitPadding={phone ? { top: 70, bottom: 150, left: 40, right: 40 } : { top: 80, bottom: 60, left: 430, right: 80 }}
        />
      </div>
    </div>
  );
}
