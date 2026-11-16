// KAN-53 (Devu): Marketplace and expiring posts.
// No screens in here, so every rule can be tested on its own. The data layer (src/data/api.ts) keeps
// the listings and uses these rules; the Marketplace page and the map only show what comes back.
//
// A listing is one of five kinds: For sale, Free, Wanted, Services, Business offers.
// Privacy and safety choices (so the demo is honest about them):
//   - a listing's pin sits at a PUBLIC meeting spot (a shop, the hall, the parkette), never at a home
//   - the seller is shown as a first name and initial ("Maya R."), never an address or phone number
//   - "Message the seller" opens a chat (Bhavana's Chats); "Report" goes to the Neighbr staff queue
//   - every listing has an end date; after it the listing leaves the Marketplace and the map and the
//     person who posted it gets a notification ("This post has ended")
import type { Persona } from '../requests/requests';

export type ListingCategory = 'sale' | 'free' | 'wanted' | 'service' | 'business';

export interface CategoryDef {
  id: ListingCategory;
  label: string;
  /** What to type in the title box, as a hint. */
  example: string;
  /** Is a price needed? 'required' = yes, 'optional' = may be left empty, 'none' = it is free. */
  price: 'required' | 'optional' | 'none';
  priceLabel: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'sale', label: 'For sale', example: 'Kids’ bike, 20 inch', price: 'required', priceLabel: 'Price ($)' },
  { id: 'free', label: 'Free', example: 'Moving boxes, about 20', price: 'none', priceLabel: 'Price' },
  { id: 'wanted', label: 'Wanted', example: 'Looking for a used ladder', price: 'optional', priceLabel: 'Most you would pay ($, optional)' },
  { id: 'service', label: 'Services', example: 'Snow shovelling for driveways', price: 'optional', priceLabel: 'Price ($, optional)' },
  { id: 'business', label: 'Business offers', example: 'Buy 2 loaves, get 1 free this week', price: 'optional', priceLabel: 'Price ($, optional)' },
];

export const categoryLabel = (id: ListingCategory) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

export type ListingStatus = 'active' | 'ended' | 'hidden';

/** Pictures drawn by the app (see art.tsx), so the demo needs no photo files. */
export type ArtId = 'bike' | 'shelf' | 'blower' | 'coat' | 'boxes' | 'plant' | 'books' | 'ladder' | 'table' | 'shovel' | 'pencil' | 'wrench' | 'bread' | 'cup';

export interface Listing {
  id: string;
  category: ListingCategory;
  title: string;
  description: string;
  /** Dollars. 0 = free. null = no price given ("Ask"). */
  price: number | null;
  /** "per hour", "per visit" ... */
  priceUnit?: string;
  /** A drawn picture (sample listings) or a photo the person added (a small JPEG as a data address). */
  art?: ArtId;
  photo?: string;
  photoAlt?: string;
  /** The public meeting spot (a place on the corridor) and where the pin goes. */
  areaId: string;
  area: string;
  lat: number;
  lng: number;
  /** Profile id of the seller (people from the demo) or a made-up id for neighbours who are not in the profile list. */
  sellerId: string;
  /** "Maya R." */
  sellerName: string;
  /** YYYY-MM-DD */
  posted: string;
  /** Last day it is shown. YYYY-MM-DD. */
  endsOn: string;
  onMap: boolean;
  status: ListingStatus;
  /** Why it ended early, if the seller ended it: 'sold' | 'removed'. */
  endedBy?: 'sold' | 'removed';
  /** The day the seller ended it (YYYY-MM-DD), if they did. */
  endedOn?: string;
  illustrative?: boolean;
}

export interface ListingDraft {
  category: ListingCategory | '';
  title: string;
  description: string;
  price: string; // typed text, checked by validateListing
  priceUnit: string;
  areaId: string;
  days: number; // 7 | 14 | 30
  onMap: boolean;
  photo?: string;
}

export const DURATIONS = [7, 14, 30] as const;
export const TITLE_MIN = 3;
export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 500;
export const PRICE_MAX = 10000;
export const UNIT_MAX = 20;

export const emptyDraft = (): ListingDraft => ({ category: '', title: '', description: '', price: '', priceUnit: '', areaId: '', days: 14, onMap: true });

// ---- Dates (local days, so "ends on Dec 5" means the end of Dec 5 where the person is) ------------

const pad = (n: number) => String(n).padStart(2, '0');
/** 2026-11-14 for the day this date falls on (local time). */
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function addDays(d: Date, days: number): string {
  const next = new Date(d.getTime());
  next.setDate(next.getDate() + days);
  return isoDay(next);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-12-05" -> "Dec 5" */
export function dayLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}` : iso;
}

/** What a listing is right now: after its end date it counts as ended, even if nobody ended it. */
export function statusNow(l: Pick<Listing, 'status' | 'endsOn'>, now: Date): ListingStatus {
  if (l.status !== 'active') return l.status;
  return l.endsOn < isoDay(now) ? 'ended' : 'active';
}

export const isLive = (l: Pick<Listing, 'status' | 'endsOn'>, now: Date) => statusNow(l, now) === 'active';

/** "Ends Dec 5" / "Ended Nov 9" / "Sold" */
export function endsLabel(l: Listing, now: Date): string {
  const s = statusNow(l, now);
  if (s === 'hidden') return 'Removed by Neighbr staff';
  if (s === 'ended') return l.endedBy === 'sold' ? 'Marked as sold or done' : l.endedBy === 'removed' ? 'Taken down' : `Ended ${dayLabel(l.endsOn)}`;
  return `Ends ${dayLabel(l.endsOn)}`;
}

// ---- Price -------------------------------------------------------------------------------------

export function priceLabel(l: Pick<Listing, 'category' | 'price' | 'priceUnit'>): string {
  if (l.category === 'free' || l.price === 0) return 'Free';
  if (l.price === null || l.price === undefined) return l.category === 'wanted' ? 'Budget not given' : l.category === 'business' ? 'See the offer' : 'Ask for the price';
  const money = Number.isInteger(l.price) ? `$${l.price}` : `$${l.price.toFixed(2)}`;
  const unit = l.priceUnit ? ` ${l.priceUnit}` : '';
  return l.category === 'wanted' ? `Up to ${money}` : `${money}${unit}`;
}

/** Shorter text for the map pin's second line. */
export const pinStatus = (l: Pick<Listing, 'category' | 'price' | 'priceUnit'>) => priceLabel(l);

// ---- Distance ------------------------------------------------------------------------------------

/** Metres between two [lng, lat] points (haversine). */
export function distanceM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function distanceLabel(m: number): string {
  if (m < 100) return 'under 100 m away';
  if (m < 1000) return `${Math.round(m / 10) * 10} m away`;
  return `${(m / 1000).toFixed(1)} km away`;
}

/** The middle of the corridor, used when a person has no home spot (City staff, for example). */
export const CORRIDOR_CENTER: [number, number] = [-82.9683, 42.3288];

// The whole corridor is about 400 m long, so the steps are short.
export const DISTANCES = [
  { id: 'any', label: 'Any distance', m: null },
  { id: '150', label: 'Within 150 m', m: 150 },
  { id: '300', label: 'Within 300 m', m: 300 },
  { id: '500', label: 'Within 500 m', m: 500 },
  { id: '1000', label: 'Within 1 km', m: 1000 },
] as const;

// ---- Search and filters ----------------------------------------------------------------------------

export type SortId = 'newest' | 'price-low' | 'nearest';
export const SORTS: { id: SortId; label: string }[] = [
  { id: 'newest', label: 'Newest first' },
  { id: 'price-low', label: 'Price, low to high' },
  { id: 'nearest', label: 'Nearest first' },
];

export interface Filters {
  query: string;
  category: ListingCategory | 'all';
  /** Typed text; empty = no limit. */
  minPrice: string;
  maxPrice: string;
  freeOnly: boolean;
  /** Metres, or null for any distance. */
  maxDistanceM: number | null;
  sort: SortId;
}

export const noFilters = (): Filters => ({ query: '', category: 'all', minPrice: '', maxPrice: '', freeOnly: false, maxDistanceM: null, sort: 'newest' });

/** Which filters are doing something (so the page can say "2 filters on" and offer Clear). */
export function activeFilterCount(f: Filters): number {
  return [f.query.trim() !== '', f.category !== 'all', f.minPrice.trim() !== '', f.maxPrice.trim() !== '', f.freeOnly, f.maxDistanceM !== null].filter(Boolean).length;
}

/** "12" -> 12, "" or "abc" -> null. */
export function parsePrice(text: string): number | null {
  const t = text.trim().replace(/^\$/, '');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** Does the typed search match? Every word must appear in the title, description, area, seller or kind. */
export function matchesQuery(l: Listing, query: string): boolean {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = norm(`${l.title} ${l.description} ${l.area} ${l.sellerName} ${categoryLabel(l.category)}`);
  return words.every((w) => hay.includes(w));
}

export interface WithDistance {
  listing: Listing;
  /** Metres from the person (or from the middle of the corridor). */
  distance: number;
}

/**
 * The listings to show: live ones only (ended and removed ones are never in the Marketplace),
 * narrowed by search and filters, in the chosen order. A listing with no price is hidden whenever a
 * price limit or "Free only" is on, because we cannot say whether it fits.
 */
export function browse(all: Listing[], f: Filters, from: [number, number], now: Date): WithDistance[] {
  const min = parsePrice(f.minPrice);
  const max = parsePrice(f.maxPrice);
  const rows = all
    .filter((l) => isLive(l, now))
    .map((l) => ({ listing: l, distance: distanceM(from, [l.lng, l.lat]) }))
    .filter(({ listing: l, distance }) => {
      if (f.category !== 'all' && l.category !== f.category) return false;
      if (!matchesQuery(l, f.query)) return false;
      if (f.freeOnly && !(l.category === 'free' || l.price === 0)) return false;
      if (min !== null || max !== null) {
        if (l.price === null) return false;
        if (min !== null && l.price < min) return false;
        if (max !== null && l.price > max) return false;
      }
      if (f.maxDistanceM !== null && distance > f.maxDistanceM) return false;
      return true;
    });
  const byNewest = (a: WithDistance, b: WithDistance) => b.listing.posted.localeCompare(a.listing.posted) || a.listing.id.localeCompare(b.listing.id);
  const priceOf = (r: WithDistance) => r.listing.price ?? Number.POSITIVE_INFINITY;
  if (f.sort === 'price-low') rows.sort((a, b) => priceOf(a) - priceOf(b) || byNewest(a, b));
  else if (f.sort === 'nearest') rows.sort((a, b) => a.distance - b.distance || byNewest(a, b));
  else rows.sort(byNewest);
  return rows;
}

// ---- Who can post what ------------------------------------------------------------------------------

export interface Check {
  ok: boolean;
  reason?: string;
}
const yes: Check = { ok: true };
const no = (reason: string): Check => ({ ok: false, reason });

/** City staff and the ward councillor handle requests; they do not post in the Marketplace. */
export function canPost(p: Persona): Check {
  if (p.canReport === false) return no('City staff and the ward councillor handle requests. They do not post in the Marketplace.');
  return yes;
}

/** Business offers are for businesses and organizations. */
export function canPostCategory(p: Persona, category: ListingCategory): Check {
  const base = canPost(p);
  if (!base.ok) return base;
  const business = p.reportMode === 'business' || p.group === 'organizations' || p.id === 'bia-lead';
  if (category === 'business' && !business) return no('Business offers are posted by a business or an organization.');
  return yes;
}

export const categoriesFor = (p: Persona) => CATEGORIES.filter((c) => canPostCategory(p, c.id).ok);

// ---- Making a listing ---------------------------------------------------------------------------------

export type DraftErrors = Partial<Record<'category' | 'title' | 'description' | 'price' | 'priceUnit' | 'areaId' | 'days', string>>;

export function validateListing(d: ListingDraft, p: Persona, areaIds: string[]): DraftErrors {
  const e: DraftErrors = {};
  const cat = CATEGORIES.find((c) => c.id === d.category);
  if (!cat) e.category = 'Choose what kind of listing this is.';
  else if (!canPostCategory(p, cat.id).ok) e.category = canPostCategory(p, cat.id).reason;
  const title = d.title.trim();
  if (title.length < TITLE_MIN) e.title = `Give it a title of at least ${TITLE_MIN} letters.`;
  else if (title.length > TITLE_MAX) e.title = `Keep the title under ${TITLE_MAX} characters.`;
  const text = d.description.trim();
  if (text.length < DESCRIPTION_MIN) e.description = `Say a little more (at least ${DESCRIPTION_MIN} characters).`;
  else if (text.length > DESCRIPTION_MAX) e.description = `Keep the description under ${DESCRIPTION_MAX} characters.`;
  if (cat && cat.price !== 'none') {
    const raw = d.price.trim();
    const n = parsePrice(raw);
    if (raw === '' && cat.price === 'required') e.price = 'Enter a price. Use Free if you are giving it away.';
    else if (raw !== '' && n === null) e.price = 'Enter the price as a number, like 25.';
    else if (n !== null && n > PRICE_MAX) e.price = `Keep the price under $${PRICE_MAX.toLocaleString('en-CA')}.`;
    else if (n === 0 && cat.id === 'sale') e.price = 'A price of $0 is a free item. Choose Free instead.';
  }
  if (d.priceUnit.trim().length > UNIT_MAX) e.priceUnit = `Keep this under ${UNIT_MAX} characters.`;
  if (!d.areaId || !areaIds.includes(d.areaId)) e.areaId = 'Choose a public meeting spot.';
  if (!(DURATIONS as readonly number[]).includes(d.days)) e.days = 'Choose how long it stays up.';
  return e;
}

export interface Area {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const areaLabel = (name: string) => `Near ${name.replace(/\s*\(demo\)/, '')}`;

export function buildListing(d: ListingDraft, p: Persona, sellerName: string, area: Area, id: string, now: Date): Listing {
  const cat = CATEGORIES.find((c) => c.id === d.category);
  if (!cat) throw new Error('Choose what kind of listing this is.');
  const price = cat.price === 'none' ? 0 : parsePrice(d.price);
  const unit = d.priceUnit.trim();
  return {
    id,
    category: cat.id,
    title: d.title.trim(),
    description: d.description.trim(),
    price,
    ...(unit && price !== null && price > 0 ? { priceUnit: unit } : {}),
    ...(d.photo ? { photo: d.photo, photoAlt: `Photo added by ${sellerName}` } : { art: defaultArt(cat.id) }),
    areaId: area.id,
    area: areaLabel(area.name),
    lat: area.lat,
    lng: area.lng,
    sellerId: p.profileId,
    sellerName,
    posted: isoDay(now),
    endsOn: addDays(now, d.days),
    onMap: d.onMap,
    status: 'active',
    illustrative: true,
  };
}

/** A drawn picture to use when no photo was added. */
export function defaultArt(category: ListingCategory): ArtId {
  return { sale: 'boxes', free: 'plant', wanted: 'ladder', service: 'wrench', business: 'bread' }[category] as ArtId;
}

/** "Maya R. (demo)" -> "Maya R."; "Team 2 Group 10" stays as it is. */
export const sellerNameFor = (p: Pick<Persona, 'label'>) => p.label.replace(/\s*\(demo\)/, '');

// ---- The map -------------------------------------------------------------------------------------------

// Pins for the same meeting spot sit a few metres apart so they never hide each other.
const NUDGES: [number, number][] = [
  [0.00009, 0.00005],
  [-0.00009, 0.00005],
  [0.00009, -0.00005],
  [-0.00009, -0.00005],
  [0, 0.0001],
  [0, -0.0001],
];

export interface ListingPin {
  id: string;
  kind: 'listing';
  chip: 'marketplace';
  name: string;
  category: string;
  status: string;
  lat: number;
  lng: number;
  description: string;
  area: string;
  sellerName: string;
  endsOn: string;
  visibility: 'public';
  illustrative: true;
  [extra: string]: unknown;
}

/**
 * The pins for the map: only live listings whose seller chose "Show on the map", at a public meeting
 * spot. Ended listings (by date or by the seller) and removed ones are never drawn.
 */
export function listingPins(all: Listing[], now: Date): ListingPin[] {
  const used: Record<string, number> = {};
  return all
    .filter((l) => l.onMap && isLive(l, now))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((l) => {
      const n = used[l.areaId] ?? 0;
      used[l.areaId] = n + 1;
      const [dLat, dLng] = NUDGES[n % NUDGES.length];
      return {
        id: l.id,
        kind: 'listing' as const,
        chip: 'marketplace' as const,
        name: l.title,
        category: categoryLabel(l.category),
        status: pinStatus(l),
        lat: l.lat + dLat,
        lng: l.lng + dLng,
        description: l.description,
        area: l.area,
        sellerName: l.sellerName,
        endsOn: l.endsOn,
        visibility: 'public' as const,
        illustrative: true as const,
      };
    });
}

// ---- Ending a post: the notification --------------------------------------------------------------------

/** How long after a post ended its notification keeps showing in the bell. */
export const ENDED_NOTICE_DAYS = 30;

/** Has this post ended (by its date, or because the seller ended it) recently enough to tell its owner? */
export function endedRecently(endsOn: string, status: ListingStatus | 'active', now: Date, endedOn?: string): boolean {
  const ended = status !== 'active' || endsOn < isoDay(now);
  if (!ended) return false;
  const from = new Date(`${endedOn ?? endsOn}T12:00:00`);
  const days = (now.getTime() - from.getTime()) / 86400000;
  return days <= ENDED_NOTICE_DAYS;
}

// ---- Reporting a listing ---------------------------------------------------------------------------------

export const LISTING_REPORT_REASONS = ['Scam or fake', 'Not allowed here (illegal, unsafe or adult)', 'Wrong category or misleading', 'Harassment or hate', 'Something else'] as const;
export type ListingReportReason = (typeof LISTING_REPORT_REASONS)[number];

export interface ListingReport {
  id: string;
  listingId: string;
  /** A copy of what was reported, so staff can judge it even if the seller changes or ends the listing. */
  title: string;
  description: string;
  category: ListingCategory;
  sellerId: string;
  sellerName: string;
  /** Who reported it (profile id). Neighbr staff see this; the seller never does. */
  reportedBy: string;
  reason: ListingReportReason;
  note: string;
  at: string;
  status: 'open' | 'hidden' | 'kept';
}

export const NOTE_MAX = 300;

export function canReportListing(p: Persona, l: Listing, reports: ListingReport[]): Check {
  if (l.sellerId === p.profileId) return no('This is your own listing.');
  if (reports.some((r) => r.listingId === l.id && r.reportedBy === p.profileId)) return no('You already reported this listing. Neighbr staff will look at it.');
  return yes;
}

/** Can this person message the seller? (the chat rules in chats.ts decide the rest, such as blocks) */
export function canMessageSeller(p: Persona, l: Listing, now: Date): Check {
  if (l.sellerId === p.profileId) return no('This is your own listing.');
  if (!isLive(l, now)) return no('This post has ended.');
  return yes;
}

/** First message, so the seller knows which listing this is about. */
export const firstMessage = (l: Pick<Listing, 'title'>) => `Hi, is "${l.title}" still available?`;
