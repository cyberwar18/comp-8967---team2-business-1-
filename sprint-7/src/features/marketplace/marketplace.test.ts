// KAN-53 (Devu): the Marketplace rules, without any screen.
import { describe, expect, it } from 'vitest';
import raw from '../../data/mock-data.json';
import { personaById } from '../requests/personas';
import { layerOf } from '../map/itemLayer';
import type { MapItem } from '../map/types';
import {
  CATEGORIES,
  CORRIDOR_CENTER,
  activeFilterCount,
  addDays,
  browse,
  buildListing,
  canMessageSeller,
  canPost,
  canPostCategory,
  canReportListing,
  categoriesFor,
  dayLabel,
  distanceLabel,
  distanceM,
  emptyDraft,
  endedRecently,
  endsLabel,
  isLive,
  isoDay,
  listingPins,
  matchesQuery,
  noFilters,
  parsePrice,
  priceLabel,
  statusNow,
  validateListing,
  type Listing,
  type ListingDraft,
  type ListingReport,
} from './marketplace';

const data = raw as unknown as { listings: Listing[]; places: { id: string; name: string; lat: number; lng: number; status: string }[]; profiles: { id: string }[] };
const now = new Date('2026-11-14T12:00:00');
const all = data.listings;
const resident = personaById('resident');
const business = personaById('business');
const jordan = personaById('city-lead');
const councillor = personaById('councillor');
const areaIds = data.places.map((p) => p.id);
const ids = (rows: { listing: Listing }[]) => rows.map((r) => r.listing.id);

const goodDraft = (patch: Partial<ListingDraft> = {}): ListingDraft => ({
  ...emptyDraft(),
  category: 'sale',
  title: 'Kids bike',
  description: 'A blue bike in good shape.',
  price: '40',
  areaId: 'place-13',
  ...patch,
});

describe('the sample listings', () => {
  it('cover the five kinds, with unique ids and a public meeting spot that is a real place', () => {
    expect(new Set(all.map((l) => l.id)).size).toBe(all.length);
    for (const c of CATEGORIES) expect(all.some((l) => l.category === c.id), c.id).toBe(true);
    for (const l of all) {
      const place = data.places.find((p) => p.id === l.areaId)!;
      expect(place, l.id).toBeTruthy();
      expect([l.lat, l.lng]).toEqual([place.lat, place.lng]);
      expect(l.area).toBe(`Near ${place.name.replace(/\s*\(demo\)/, '')}`);
      expect(l.sellerName).not.toMatch(/\d{3}[ -]\d{3,4}/); // no phone numbers
      expect(l.illustrative).toBe(true);
    }
  });
  it('only use sellers from the profile list or made-up neighbours', () => {
    const known = new Set(data.profiles.map((p) => p.id));
    for (const l of all) expect(known.has(l.sellerId) || l.sellerId.startsWith('seller-'), l.id).toBe(true);
  });
  it('gives free listings a price of 0 and sale listings a price', () => {
    for (const l of all.filter((x) => x.category === 'free')) expect(l.price).toBe(0);
    for (const l of all.filter((x) => x.category === 'sale')) expect(l.price).toBeGreaterThan(0);
  });
  it('include one that has already ended, to show the notification', () => {
    expect(all.filter((l) => !isLive(l, now)).map((l) => l.id)).toEqual(['mk-15']);
  });
});

describe('end dates', () => {
  const l = { status: 'active' as const, endsOn: '2026-11-14' };
  it('keeps a post up through its last day, and ends it the day after', () => {
    expect(statusNow(l, new Date('2026-11-14T23:30:00'))).toBe('active');
    expect(statusNow(l, new Date('2026-11-15T00:30:00'))).toBe('ended');
  });
  it('treats a post the seller ended, or staff removed, as not live', () => {
    expect(isLive({ status: 'ended', endsOn: '2027-01-01' }, now)).toBe(false);
    expect(isLive({ status: 'hidden', endsOn: '2027-01-01' }, now)).toBe(false);
  });
  it('adds days and names days', () => {
    expect(addDays(new Date('2026-11-28T10:00:00'), 7)).toBe('2026-12-05');
    expect(isoDay(new Date('2026-01-05T10:00:00'))).toBe('2026-01-05');
    expect(dayLabel('2026-12-05')).toBe('Dec 5');
  });
  it('says what happened in words', () => {
    const live = all.find((x) => x.id === 'mk-01')!;
    expect(endsLabel(live, now)).toBe(`Ends ${dayLabel(live.endsOn)}`);
    expect(endsLabel(all.find((x) => x.id === 'mk-15')!, now)).toBe('Ended Nov 9');
    expect(endsLabel({ ...live, status: 'ended', endedBy: 'sold' }, now)).toMatch(/sold/);
    expect(endsLabel({ ...live, status: 'hidden' }, now)).toMatch(/staff/);
  });
  it('tells the owner about an ended post for 30 days, and not before it ends', () => {
    expect(endedRecently('2026-11-09', 'active', now)).toBe(true);
    expect(endedRecently('2026-11-14', 'active', now)).toBe(false); // last day, still up
    expect(endedRecently('2026-09-01', 'active', now)).toBe(false); // too long ago
    expect(endedRecently('2027-01-01', 'ended', now, '2026-11-14')).toBe(true); // the seller ended it today
  });
});

describe('price and distance words', () => {
  it('says Free, a price, a unit, or what is missing', () => {
    expect(priceLabel({ category: 'free', price: 0 })).toBe('Free');
    expect(priceLabel({ category: 'sale', price: 45 })).toBe('$45');
    expect(priceLabel({ category: 'sale', price: 12.5 })).toBe('$12.50');
    expect(priceLabel({ category: 'service', price: 25, priceUnit: 'per visit' })).toBe('$25 per visit');
    expect(priceLabel({ category: 'wanted', price: 30 })).toBe('Up to $30');
    expect(priceLabel({ category: 'wanted', price: null })).toBe('Budget not given');
    expect(priceLabel({ category: 'service', price: null })).toBe('Ask for the price');
    expect(priceLabel({ category: 'business', price: null })).toBe('See the offer');
  });
  it('reads typed prices', () => {
    expect(parsePrice(' $12 ')).toBe(12);
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
    expect(parsePrice('-3')).toBeNull();
  });
  it('measures metres and says them simply', () => {
    const d = distanceM([-82.9704, 42.328], [-82.9704, 42.329]);
    expect(Math.round(d / 10)).toBe(11); // about 111 m
    expect(distanceLabel(40)).toBe('under 100 m away');
    expect(distanceLabel(342)).toBe('340 m away');
    expect(distanceLabel(1240)).toBe('1.2 km away');
  });
});

describe('search and filters', () => {
  const run = (patch: Partial<ReturnType<typeof noFilters>>, from = CORRIDOR_CENTER) => browse(all, { ...noFilters(), ...patch }, from, now);
  it('shows every live listing by default, never the ended one', () => {
    const r = run({});
    expect(r).toHaveLength(all.length - 1);
    expect(ids(r)).not.toContain('mk-15');
  });
  it('filters by kind', () => {
    expect(run({ category: 'free' }).every((r) => r.listing.category === 'free')).toBe(true);
    expect(run({ category: 'wanted' })).toHaveLength(2);
  });
  it('searches the title, description, area and seller, every word must match', () => {
    expect(ids(run({ query: 'bike' }))).toEqual(expect.arrayContaining(['mk-01', 'mk-12']));
    expect(ids(run({ query: 'MAYA' }))).toEqual(expect.arrayContaining(['mk-01', 'mk-09']));
    expect(ids(run({ query: 'bike tune' }))).toEqual(['mk-12']);
    expect(run({ query: 'zzzz' })).toHaveLength(0);
    expect(matchesQuery(all[0], '   ')).toBe(true);
  });
  it('Free only keeps free things and hides listings with no price', () => {
    const r = run({ freeOnly: true });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.listing.price === 0)).toBe(true);
  });
  it('filters by price and hides listings with no price while a limit is on', () => {
    const r = run({ minPrice: '20', maxPrice: '50' });
    expect(r.every((x) => x.listing.price !== null && x.listing.price >= 20 && x.listing.price <= 50)).toBe(true);
    expect(ids(r)).toEqual(expect.arrayContaining(['mk-01', 'mk-04'])); // $45 and $25
    expect(ids(r)).not.toContain('mk-14'); // no price
    expect(ids(run({ maxPrice: '0' })).every((id) => all.find((l) => l.id === id)!.price === 0)).toBe(true);
  });
  it('filters by distance from the person', () => {
    const rosa = [-82.970455, 42.328051] as [number, number];
    const near = run({ maxDistanceM: 150 }, rosa);
    expect(near.length).toBeGreaterThan(0);
    expect(near.every((r) => r.distance <= 150)).toBe(true);
    expect(near.length).toBeLessThan(run({ maxDistanceM: 300 }, rosa).length);
    expect(run({ maxDistanceM: 300 }, rosa).length).toBeLessThan(run({ maxDistanceM: 1000 }, rosa).length);
    expect(run({ maxDistanceM: 1000 }, rosa)).toHaveLength(all.length - 1);
  });
  it('sorts newest first, by price, or nearest', () => {
    const newest = run({ sort: 'newest' }).map((r) => r.listing.posted);
    expect(newest).toEqual([...newest].sort().reverse());
    const price = run({ sort: 'price-low' }).map((r) => r.listing.price);
    const real = price.filter((p): p is number => p !== null);
    expect(real).toEqual([...real].sort((a, b) => a - b));
    expect(price.at(-1)).toBeNull(); // no price goes last
    const near = run({ sort: 'nearest' }).map((r) => r.distance);
    expect(near).toEqual([...near].sort((a, b) => a - b));
  });
  it('counts the filters that are on', () => {
    expect(activeFilterCount(noFilters())).toBe(0);
    expect(activeFilterCount({ ...noFilters(), query: 'x', freeOnly: true, maxDistanceM: 150, category: 'sale' })).toBe(4);
  });
});

describe('who can post', () => {
  it('lets people and organizations post, and not City staff or the councillor', () => {
    expect(canPost(resident).ok).toBe(true);
    expect(canPost(business).ok).toBe(true);
    expect(canPost(jordan).ok).toBe(false);
    expect(canPost(councillor).ok).toBe(false);
  });
  it('keeps business offers for businesses and organizations', () => {
    expect(canPostCategory(resident, 'business').ok).toBe(false);
    expect(canPostCategory(business, 'business').ok).toBe(true);
    expect(canPostCategory(personaById('community-organizer'), 'business').ok).toBe(true);
    expect(categoriesFor(resident).map((c) => c.id)).toEqual(['sale', 'free', 'wanted', 'service']);
    expect(categoriesFor(jordan)).toEqual([]);
  });
});

describe('making a listing', () => {
  it('accepts a complete listing', () => {
    expect(validateListing(goodDraft(), resident, areaIds)).toEqual({});
  });
  it('asks for what is missing, in plain words', () => {
    const e = validateListing(emptyDraft(), resident, areaIds);
    expect(Object.keys(e).sort()).toEqual(['areaId', 'category', 'description', 'title']);
    expect(validateListing(goodDraft({ price: '' }), resident, areaIds).price).toMatch(/Enter a price/);
    expect(validateListing(goodDraft({ price: 'abc' }), resident, areaIds).price).toMatch(/number/);
    expect(validateListing(goodDraft({ price: '0' }), resident, areaIds).price).toMatch(/Free/);
    expect(validateListing(goodDraft({ price: '99999' }), resident, areaIds).price).toMatch(/under/);
    expect(validateListing(goodDraft({ areaId: 'nowhere' }), resident, areaIds).areaId).toMatch(/meeting spot/);
    expect(validateListing(goodDraft({ title: 'x'.repeat(80) }), resident, areaIds).title).toMatch(/under/);
    expect(validateListing(goodDraft({ days: 3 }), resident, areaIds).days).toBeTruthy();
  });
  it('lets a free listing, a wanted post and a service go without a price', () => {
    expect(validateListing(goodDraft({ category: 'free', price: '' }), resident, areaIds)).toEqual({});
    expect(validateListing(goodDraft({ category: 'wanted', price: '' }), resident, areaIds)).toEqual({});
    expect(validateListing(goodDraft({ category: 'service', price: '' }), resident, areaIds)).toEqual({});
  });
  it('refuses a business offer from a resident', () => {
    expect(validateListing(goodDraft({ category: 'business' }), resident, areaIds).category).toMatch(/business or an organization/);
  });
  it('builds the listing with the end date, the area and the seller as a first name and initial', () => {
    const place = data.places.find((p) => p.id === 'place-13')!;
    const l = buildListing(goodDraft({ days: 7 }), resident, 'Team 2 Group 10', place, 'mk-new', now);
    expect(l).toMatchObject({ id: 'mk-new', category: 'sale', price: 40, posted: '2026-11-14', endsOn: '2026-11-21', status: 'active', onMap: true, sellerId: 'profile-resident', area: 'Near Thompson Parkette' });
    expect(l.art).toBe('boxes');
    expect(buildListing(goodDraft({ category: 'free', price: '12' }), resident, 'X', place, 'mk-f', now).price).toBe(0); // free means 0
    expect(buildListing(goodDraft({ photo: 'data:image/jpeg;base64,AAA' }), resident, 'X', place, 'mk-p', now).photo).toBeTruthy();
    expect(buildListing(goodDraft({ category: 'service', priceUnit: ' per hour ' }), resident, 'X', place, 'mk-u', now).priceUnit).toBe('per hour');
  });
});

describe('listings on the map', () => {
  it('draws only live listings the seller put on the map', () => {
    const pins = listingPins(all, now);
    expect(pins.map((p) => p.id)).not.toContain('mk-15'); // ended
    expect(pins).toHaveLength(all.length - 1);
    const hidden = listingPins([{ ...all[0], onMap: false }], now);
    expect(hidden).toHaveLength(0);
    expect(listingPins([{ ...all[0], status: 'hidden' }], now)).toHaveLength(0);
    expect(listingPins([{ ...all[0], status: 'ended' }], now)).toHaveLength(0);
  });
  it('puts every pin next to its public meeting spot, never exactly on it, and spreads pins at the same spot', () => {
    const pins = listingPins(all, now);
    for (const p of pins) {
      const l = all.find((x) => x.id === p.id)!;
      const d = distanceM([l.lng, l.lat], [p.lng, p.lat]);
      expect(d).toBeLessThan(30);
    }
    const bakery = pins.filter((p) => all.find((l) => l.id === p.id)!.areaId === 'place-01');
    expect(new Set(bakery.map((p) => `${p.lat},${p.lng}`)).size).toBe(bakery.length);
  });
  it('belongs to its own Marketplace layer on the map', () => {
    expect(layerOf(listingPins(all, now)[0] as unknown as MapItem)).toBe('marketplace');
  });
  it('carries what the popup needs and nothing private', () => {
    const p = listingPins(all, now).find((x) => x.id === 'mk-01')!;
    expect(p).toMatchObject({ kind: 'listing', name: "Kids' bike, 20 inch", category: 'For sale', status: '$45', area: 'Near Thompson Parkette', sellerName: 'Maya R.', visibility: 'public' });
    expect(JSON.stringify(p)).not.toMatch(/sellerId|profile-/);
  });
});

describe('reporting and messaging rules', () => {
  const l = all.find((x) => x.id === 'mk-01')!; // Maya R.'s bike
  const report = (by: string): ListingReport => ({ id: 'r', listingId: 'mk-01', title: '', description: '', category: 'sale', sellerId: '', sellerName: '', reportedBy: by, reason: 'Scam or fake', note: '', at: '', status: 'open' });
  it('does not let you report your own listing, or report the same one twice', () => {
    expect(canReportListing(resident, l, []).ok).toBe(true);
    expect(canReportListing(personaById('parent'), l, []).ok).toBe(false);
    expect(canReportListing(resident, l, [report('profile-resident')]).reason).toMatch(/already reported/);
    expect(canReportListing(business, l, [report('profile-resident')]).ok).toBe(true);
  });
  it('does not let you message yourself or an ended post', () => {
    expect(canMessageSeller(resident, l, now).ok).toBe(true);
    expect(canMessageSeller(personaById('parent'), l, now).reason).toMatch(/own listing/);
    expect(canMessageSeller(resident, all.find((x) => x.id === 'mk-15')!, now).reason).toMatch(/ended/);
  });
});
