// Data helpers for Bhavana's tasks 9–12 (user presence, place/profile cards,
// activity cards, linking cards and pins). No UI here, so it is easy to test.
// Everything reads the illustrative mock data in src/data/mock-data.json.

export type Kind = 'place' | 'event' | 'update' | 'issue' | 'offer';
export type Mode = 'me' | 'business';

export interface Item {
  id: string;
  kind: Kind;
  name: string;
  category?: string;
  status?: string;
  lat?: number;
  lng?: number;
  address?: string;
  hours?: string | null;
  description?: string;
  start?: string;
  end?: string;
  placeId?: string | null;
  reportedBy?: string;
  visibility?: string;
  updatedAt?: string;
  validUntil?: string;
  [extra: string]: unknown;
}

export type Role = 'resident' | 'business' | 'bia' | 'ngo' | 'councillor' | 'city' | 'mp' | 'school' | 'institution'; // school, institution: Sprint 6

export interface Profile {
  id: string;
  role: Role;
  name: string;
  badge?: string;
  area?: string;
  bio?: string;
  placeId?: string;
  owner?: string;
  interests?: string[];
  skills?: string[];
  public?: string[];
  private?: string[];
  ownerProfileId?: string; // business only: the owner's own (resident) profile. Private link.
  handles?: string[]; // councillor, city, MP: what they deal with
  [extra: string]: unknown;
}

export interface Ward {
  id: string;
  name: string;
  responsibleProfiles?: string[];
  [extra: string]: unknown;
}

export interface CardData {
  meta: { label: string; corridor?: string; coordinatesNote?: string };
  places: Item[];
  events: Item[];
  updates: Item[]; // also holds the issues
  offers?: Item[];
  profiles: Profile[];
  wards?: Ward[];
}

// The signed-in demo user and the business they can switch to (Me / My business).
export const DEMO_USER_ID = 'profile-resident';
export const DEMO_BUSINESS_ID = 'profile-business';


export const ROLE_LABEL: Record<Profile['role'], string> = {
  resident: 'Resident',
  business: 'Business',
  bia: 'BIA',
  ngo: 'Community group',
  councillor: 'Ward councillor',
  city: 'City service',
  mp: 'MP',
  school: 'School',
  institution: 'Institution',
};

export function profileById(data: CardData, id: string): Profile | undefined {
  return data.profiles.find((p) => p.id === id);
}

/** Initials for the avatar circle, e.g. "Morgan Ellis (demo)" -> "ME". */
export function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/** Every item that can be selected: map items plus offers (offers have no pin of their own). */
export function allCardItems(data: CardData): Item[] {
  return [...data.places, ...data.events, ...data.updates, ...(data.offers ?? [])];
}

export function findItem(data: CardData, id: string | null): Item | undefined {
  return id ? allCardItems(data).find((i) => i.id === id) : undefined;
}

export function placeOf(data: CardData, item: Item): Item | undefined {
  return item.placeId ? data.places.find((p) => p.id === item.placeId) : undefined;
}

/** The public profile (business, BIA or community group) that runs this place. */
export function profileForPlace(data: CardData, placeId: string): Profile | undefined {
  return data.profiles.find((p) => p.placeId === placeId);
}

/** Only public items are shown to everyone; private reports are seen by their author (and the BIA). */
export function isVisibleTo(item: Item, viewerProfileId: string): boolean {
  if (!item.visibility || item.visibility === 'public') return true;
  return item.reportedBy === viewerProfileId;
}

/**
 * Public events, offers, updates and issues linked to a place ("Happening here" on the place card).
 * Private reports never show here; the owner sees them under "My requests" instead.
 */
export function happeningAt(data: CardData, placeId: string): Item[] {
  return [...data.events, ...(data.offers ?? []), ...data.updates].filter(
    (i) => i.placeId === placeId && (!i.visibility || i.visibility === 'public'),
  );
}

/** Requests a profile has raised, for the owner-only "My requests" section. */
export function requestsBy(data: CardData, profileId: string): Item[] {
  return data.updates.filter((i) => i.kind === 'issue' && i.reportedBy === profileId);
}

// ---- Progress ring for issues -------------------------------------------
export const ISSUE_STEPS = ['reported', 'acknowledged', 'resolved'] as const;

export function issueProgress(status: string | undefined): { step: number; total: number; label: string } {
  // Sprint 5: a request can also end without being fixed (declined by the organization, or withdrawn).
  if (status === 'declined' || status === 'withdrawn') return { step: 0, total: ISSUE_STEPS.length, label: status === 'declined' ? 'Declined' : 'Withdrawn' };
  const i = ISSUE_STEPS.indexOf((status ?? '') as (typeof ISSUE_STEPS)[number]);
  const step = i < 0 ? 0 : i + 1;
  const label = i < 0 ? 'Unknown' : ISSUE_STEPS[i][0].toUpperCase() + ISSUE_STEPS[i].slice(1);
  return { step, total: ISSUE_STEPS.length, label };
}

// ---- Dates ---------------------------------------------------------------
const day = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const time = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** "Fri, Oct 16 · 4:00 PM – 8:00 PM" */
export function formatWhen(start?: string, end?: string): string {
  if (!start) return '';
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return '';
  const e = end ? new Date(end) : null;
  return `${day(s)} · ${time(s)}${e && !Number.isNaN(e.getTime()) ? ` – ${time(e)}` : ''}`;
}

/** "Oct 31" for offer end dates and update dates. */
export function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---- Distance and the "Around you" list ----------------------------------
/** Metres between two [lng, lat] points (haversine). */
export function distanceM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m away`;
  return `${(m / 1000).toFixed(1)} km away`;
}

/** Where an item sits on the map: its own point, or its place's point (offers). */
export function pointOf(data: CardData, item: Item): [number, number] | null {
  if (typeof item.lng === 'number' && typeof item.lat === 'number') return [item.lng, item.lat];
  const place = placeOf(data, item);
  return place && typeof place.lng === 'number' && typeof place.lat === 'number' ? [place.lng, place.lat] : null;
}

/**
 * "You are here": an approximate demo point, never a home address.
 * It is worked out from the mock data (the place nearest the middle of the corridor),
 * so it stays on the street even when the place coordinates are corrected.
 */
export function youAreHere(data: CardData): [number, number] {
  const pts = data.places
    .filter((p) => typeof p.lng === 'number' && typeof p.lat === 'number')
    .map((p) => [p.lng as number, p.lat as number] as [number, number]);
  if (pts.length === 0) return [-83.0, 42.3]; // Windsor, only if there is no data
  const mid: [number, number] = [
    pts.reduce((t, p) => t + p[0], 0) / pts.length,
    pts.reduce((t, p) => t + p[1], 0) / pts.length,
  ];
  return pts.reduce((best, p) => (distanceM(mid, p) < distanceM(mid, best) ? p : best));
}

export type AroundFilter = 'all' | 'event' | 'offer' | 'update' | 'issue';

export interface AroundEntry {
  item: Item;
  metres: number | null;
}

/**
 * Activities for the "Around you" list: events, offers, public updates and issues
 * the viewer may see, nearest first. Past events go to the end.
 */
export function aroundYou(
  data: CardData,
  viewerProfileId: string,
  from: [number, number] = youAreHere(data),
  filter: AroundFilter = 'all',
): AroundEntry[] {
  const activities = [...data.events, ...(data.offers ?? []), ...data.updates]
    .filter((i) => isVisibleTo(i, viewerProfileId))
    .filter((i) => filter === 'all' || i.kind === filter);
  return activities
    .map((item) => {
      const p = pointOf(data, item);
      return { item, metres: p ? distanceM(from, p) : null };
    })
    .sort((a, b) => {
      const pa = a.item.status === 'past' ? 1 : 0;
      const pb = b.item.status === 'past' ? 1 : 0;
      if (pa !== pb) return pa - pb;
      return (a.metres ?? Infinity) - (b.metres ?? Infinity);
    });
}

/** Which pin to select when a card is clicked. Offers have no pin, so they select their place. */
export function pinIdFor(item: Item): string | null {
  if (item.kind === 'offer') return item.placeId ?? null;
  return item.id;
}

// ---- Profile cards (week 3 follow-up: resident, business, BIA) -------------

/** Whether the viewer may see who raised a report. Private reports hide the reporter from others. */
export function canSeeReporter(item: Item, viewerProfileId: string): boolean {
  return !item.visibility || item.visibility === 'public' || item.reportedBy === viewerProfileId;
}

/** Public notices and updates a profile has posted (e.g. the BIA's roadworks notice). */
export function publicPostsBy(data: CardData, profileId: string): Item[] {
  return data.updates.filter((i) => i.reportedBy === profileId && i.visibility === 'public');
}

/**
 * What a business, BIA or community group has going on: offers and events at its place.
 * BIAs and community groups also list the public notices they posted. A business's own
 * reports (requests to the BIA) are not "what's on", so they are left out.
 */
export function profileActivity(data: CardData, profile: Profile): Item[] {
  const atPlace = profile.placeId
    ? [...(data.offers ?? []), ...data.events].filter((i) => i.placeId === profile.placeId)
    : [];
  const posts = profile.role === 'bia' || profile.role === 'ngo' ? publicPostsBy(data, profile.id) : [];
  const seen = new Set<string>();
  return [...atPlace, ...posts].filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

/** Plain-language names for the public / private field lists in the data. */
export function fieldLabel(field: string): string {
  const f = field.trim();
  return f.charAt(0).toUpperCase() + f.slice(1);
}

/**
 * The BIA's corridor as a line, from the two intersections written in the data's coordinatesNote
 * ("between 42.32,-82.97 (Thompson) and 42.33,-82.96 (Glidden)"). Falls back to the
 * west-most and east-most places. Returned as [lng, lat] pairs.
 */
export function corridorLine(data: CardData): [number, number][] {
  const note = data.meta.coordinatesNote ?? '';
  const pts = [...note.matchAll(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/g)].map((m) => [Number(m[2]), Number(m[1])] as [number, number]);
  if (pts.length >= 2) return [pts[0], pts[1]];
  const placed = data.places
    .filter((p) => typeof p.lng === 'number' && typeof p.lat === 'number')
    .sort((a, b) => (a.lng as number) - (b.lng as number));
  if (placed.length < 2) return [];
  const w = placed[0];
  const e = placed[placed.length - 1];
  return [
    [w.lng as number, w.lat as number],
    [e.lng as number, e.lat as number],
  ];
}

// ---- Interests on a profile: find matching things on the corridor ------------

const STOP_WORDS = new Set(['local', 'and', 'the', 'for', 'with', 'of', 'in', 'on', 'a']);

/** "Gardening" -> ["garden"], "Local markets" -> ["market"], "Walkable cities" -> ["walk", "city"]. */
export function interestWords(interest: string): string[] {
  return interest
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w && !STOP_WORDS.has(w))
    .map((w) => {
      if (w.endsWith('ies') && w.length > 4) return `${w.slice(0, -3)}y`;
      if (w.endsWith('able') && w.length > 6) return w.slice(0, -4);
      if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
      if (w.endsWith('s') && !w.endsWith('ss') && w.length > 4) return w.slice(0, -1);
      return w;
    })
    .filter((w) => w.length >= 3);
}

/**
 * Places, events, offers and public updates on the corridor that match an interest,
 * by name or category. Upcoming events come first; private reports are never included.
 */
export function interestMatches(data: CardData, interest: string): Item[] {
  const words = interestWords(interest);
  if (words.length === 0) return [];
  const pool = [...data.events, ...(data.offers ?? []), ...data.places, ...data.updates.filter((u) => u.visibility === 'public')];
  const hits = pool.filter((i) => {
    const text = `${i.name} ${i.category ?? ''}`.toLowerCase();
    // Match at the start of a word only, so "walk" finds "Lights Walk" but not "Sidewalk".
    return words.some((w) => new RegExp(`\\b${w}`).test(text));
  });
  const rank = (i: Item) => (i.kind === 'event' ? (i.status === 'past' ? 3 : 0) : i.kind === 'offer' ? 1 : 2);
  return hits.sort((a, b) => rank(a) - rank(b));
}

/**
 * The map data as one viewer may see it: reports marked "private until approved" are removed
 * unless this viewer raised them. Used for the search list and the pins, so private reports
 * never appear for other people (the BIA would see them in its own workspace later).
 */
export function visibleToViewer<T extends { updates: Item[] }>(data: T, viewerProfileId: string): T {
  return { ...data, updates: data.updates.filter((u) => isVisibleTo(u, viewerProfileId)) };
}

// ---- KAN-37: resident at the centre, owner separate from business ---------------
// Nigel (Oct 19): everything is centred on the resident. A business sits in the BIA corridor;
// its owner is a resident of the city. A resident's report (pothole, street light) goes to
// whoever is responsible (city, ward councillor), not the BIA.

/** Who is responsible for local problems: the city and the ward councillor. */
export const RESPONDER_ROLES: Role[] = ['councillor', 'city', 'mp'];

/** The owner's personal profile for a business. Only the owner may be shown this link. */
export function ownerOf(data: CardData, business: Profile): Profile | undefined {
  return business.ownerProfileId ? profileById(data, business.ownerProfileId) : undefined;
}

/** Businesses this person owns (from the business side: ownerProfileId). */
export function businessesOwnedBy(data: CardData, ownerId: string): Profile[] {
  return data.profiles.filter((p) => p.role === 'business' && p.ownerProfileId === ownerId);
}

/**
 * Whether the viewer is this person: the profile itself, or (in My business mode) the business
 * whose owner this is. Used for "only you see this" sections.
 */
export function isSamePerson(data: CardData, profile: Profile, viewerId: string): boolean {
  if (profile.id === viewerId) return true;
  const viewer = profileById(data, viewerId);
  if (!viewer) return false;
  if (viewer.role === 'business' && viewer.ownerProfileId === profile.id) return true; // owner, seen from the business
  if (profile.role === 'business' && profile.ownerProfileId === viewer.id) return true; // business, seen by its owner
  return false;
}

/** The BIA a business belongs to (the demo has one corridor). */
export function biaFor(data: CardData, business: Profile): Profile | undefined {
  return business.role === 'business' ? data.profiles.find((p) => p.role === 'bia') : undefined;
}

/**
 * Where a report goes. Resident reports name their responder (routedToProfile, with an optional
 * copy to ccProfile). Business reports without one go to the BIA.
 */
export function recipientsOf(data: CardData, item: Item): { to?: Profile; cc?: Profile } {
  const toId = typeof item.routedToProfile === 'string' ? item.routedToProfile : undefined;
  const ccId = typeof item.ccProfile === 'string' ? item.ccProfile : undefined;
  if (toId) return { to: profileById(data, toId), cc: ccId ? profileById(data, ccId) : undefined };
  const reporter = item.reportedBy ? profileById(data, item.reportedBy) : undefined;
  if (reporter?.role === 'business') return { to: data.profiles.find((p) => p.role === 'bia') };
  return {};
}

/** Short name for sentences: "City of Windsor 311", "the BIA". */
export function shortName(p?: Profile): string {
  if (!p) return 'the BIA';
  if (p.role === 'bia') return 'the BIA';
  return p.name.replace(/\s*\(demo\)/, '');
}

/** Who handles problems in the resident's area: the ward's responders, then the MP. */
export function areaResponders(data: CardData): Profile[] {
  const ids = new Set((data.wards ?? []).flatMap((w) => w.responsibleProfiles ?? []));
  const fromWard = data.profiles.filter((p) => ids.has(p.id));
  const others = data.profiles.filter((p) => RESPONDER_ROLES.includes(p.role) && !ids.has(p.id));
  return [...fromWard, ...others];
}

/** Reports sent to (or copied to) a responder that this viewer may see. */
export function reportsSentTo(data: CardData, responderId: string, viewerId: string): Item[] {
  return data.updates.filter(
    (i) => i.kind === 'issue' && (i.routedToProfile === responderId || i.ccProfile === responderId) && isVisibleTo(i, viewerId),
  );
}

/** Upcoming events and offers that match any of a resident's interests (for "Coming up for you"). */
export function comingUpFor(data: CardData, profile: Profile, limit = 3): Item[] {
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const interest of profile.interests ?? []) {
    for (const i of interestMatches(data, interest)) {
      if ((i.kind !== 'event' && i.kind !== 'offer') || i.status === 'past' || seen.has(i.id)) continue;
      seen.add(i.id);
      out.push(i);
    }
  }
  // Events first, soonest first; then offers, ending soonest first.
  const rank = (i: Item) => (i.kind === 'event' ? 0 : 1);
  const when = (i: Item) => String(i.kind === 'event' ? (i.start ?? '') : (i.validUntil ?? ''));
  return out.sort((a, b) => rank(a) - rank(b) || when(a).localeCompare(when(b))).slice(0, limit);
}
