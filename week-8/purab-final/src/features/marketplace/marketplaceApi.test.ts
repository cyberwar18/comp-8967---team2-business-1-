// KAN-53 (Devu): the Marketplace data functions, expiring posts and the "This post has ended" notification.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { personaById } from '../requests/personas';
import { buildMapExtras } from '../map/extras';
import type { MapItem } from '../map/types';
import {
  clearSubmittedReports,
  createListing,
  endListing,
  getChat,
  getChats,
  getListingPins,
  getListingReports,
  getListings,
  getMapData,
  getMarketAreas,
  getNotifications,
  getOffers,
  getPosts,
  blockInChat,
  messageSeller,
  postOpenNotice,
  relistListing,
  reportListing,
  resolveListingReport,
  resetDemo,
  setClockForTests,
} from '../../data/api';
import { emptyDraft, type ListingDraft } from './marketplace';

const resident = personaById('resident'); // Team 2 Group 10
const maya = personaById('parent'); // Maya R., sells the bike (mk-01)
const rosa = personaById('business');
const priya = personaById('community-organizer');
const jordan = personaById('city-lead');
const councillor = personaById('councillor');

const NOW = '2026-11-14T15:00:00';
let clockNow = new Date(NOW);
const at = (iso: string) => {
  clockNow = new Date(iso);
};

const draft = (patch: Partial<ListingDraft> = {}): ListingDraft => ({
  ...emptyDraft(),
  category: 'sale',
  title: 'Desk lamp',
  description: 'Works well, with a new bulb.',
  price: '12',
  areaId: 'place-02',
  days: 7,
  ...patch,
});

beforeEach(() => {
  at(NOW);
  setClockForTests(() => clockNow);
});
afterEach(() => {
  clearSubmittedReports();
  setClockForTests(null);
});

describe('browsing and posting', () => {
  it('shows every live listing to anyone, and your own ended ones only to you', async () => {
    const forResident = await getListings(resident);
    expect(forResident.some((l) => l.id === 'mk-15')).toBe(false); // Rosa's ended shelves
    const forRosa = await getListings(rosa);
    expect(forRosa.some((l) => l.id === 'mk-15')).toBe(true);
    expect(forRosa.length).toBe(forResident.length + 1);
  });
  it('lists public meeting spots, not vacant units', async () => {
    const areas = await getMarketAreas();
    expect(areas.find((a) => a.id === 'place-14')).toBeUndefined(); // vacant storefront
    expect(areas.find((a) => a.id === 'place-13')?.name).toBe('Thompson Parkette');
  });
  it('posts a listing: it shows in the Marketplace and on the map, ends in 7 days', async () => {
    const l = await createListing(resident, draft());
    expect(l).toMatchObject({ sellerId: 'profile-resident', sellerName: 'Team 2 Group 10', posted: '2026-11-14', endsOn: '2026-11-21', status: 'active' });
    expect((await getListings(maya)).some((x) => x.id === l.id)).toBe(true);
    const pin = (await getListingPins()).find((p) => p.id === l.id)!;
    expect(pin).toMatchObject({ kind: 'listing', name: 'Desk lamp', status: '$12' });
  });
  it('leaves a listing off the map when the seller chooses so, and it is still in the Marketplace', async () => {
    const l = await createListing(resident, draft({ onMap: false }));
    expect((await getListingPins()).some((p) => p.id === l.id)).toBe(false);
    expect((await getListings(maya)).some((x) => x.id === l.id)).toBe(true);
  });
  it('refuses City staff and the councillor, a business offer from a resident, and an incomplete listing', async () => {
    await expect(createListing(jordan, draft())).rejects.toThrow(/do not post in the Marketplace/);
    await expect(createListing(councillor, draft())).rejects.toThrow(/do not post/);
    await expect(createListing(resident, draft({ category: 'business' }))).rejects.toThrow(/business or an organization/);
    await expect(createListing(resident, draft({ title: '' }))).rejects.toThrow(/title/);
    await expect(createListing(resident, draft({ areaId: 'x' }))).rejects.toThrow(/meeting spot/);
    await expect(createListing(resident, draft({ photo: 'x'.repeat(500_000) }))).rejects.toThrow(/too big/);
    expect((await getListings(resident)).filter((l) => l.sellerId === 'profile-resident' && l.title === '')).toHaveLength(0);
  });
  it('lets a business post an offer, and a free listing is Free', async () => {
    const offer = await createListing(rosa, draft({ category: 'business', title: 'Free cookie with coffee', price: '' }));
    expect(offer.category).toBe('business');
    expect(offer.price).toBeNull();
    const free = await createListing(resident, draft({ category: 'free', price: '' }));
    expect(free.price).toBe(0);
  });
  it('keeps what was posted after a refresh and forgets it on Reset demo', async () => {
    const l = await createListing(resident, draft({ title: 'Keep me' }));
    expect(JSON.parse(localStorage.getItem('pinpoint-demo-v1') ?? '{}').marketplace.listings.some((x: { id: string }) => x.id === l.id)).toBe(true);
    resetDemo();
    expect((await getListings(resident)).some((x) => x.id === l.id)).toBe(false);
    expect((await getListings(resident)).length).toBe(14);
  });
});

describe('expiring posts', () => {
  it('takes a listing off the Marketplace and the map the day after its end date', async () => {
    const l = await createListing(resident, draft({ days: 7 }));
    at('2026-11-21T20:00:00'); // last day: still up
    expect((await getListingPins()).some((p) => p.id === l.id)).toBe(true);
    expect((await getListings(maya)).some((x) => x.id === l.id)).toBe(true);
    at('2026-11-22T08:00:00'); // the day after
    expect((await getListingPins()).some((p) => p.id === l.id)).toBe(false);
    expect((await getListings(maya)).some((x) => x.id === l.id)).toBe(false);
    expect((await getListings(resident)).find((x) => x.id === l.id)?.title).toBe('Desk lamp'); // still the seller's, to post again
  });
  it('turns the end of a listing into a notification for the person who posted it, and only for them', async () => {
    const l = await createListing(resident, draft({ days: 7 }));
    expect((await getNotifications(resident)).some((n) => n.id === `ended:${l.id}`)).toBe(false); // not yet
    at('2026-11-22T08:00:00');
    const note = (await getNotifications(resident)).find((n) => n.id === `ended:${l.id}`)!;
    expect(note).toMatchObject({ text: 'This post has ended', title: 'Desk lamp', href: `#/marketplace?l=${l.id}`, read: false });
    expect((await getNotifications(maya)).some((n) => n.id === `ended:${l.id}`)).toBe(false);
    expect((await getNotifications(jordan)).some((n) => n.text === 'This post has ended')).toBe(false);
  });
  it('stops reminding after 30 days', async () => {
    const l = await createListing(resident, draft({ days: 7 }));
    at('2026-12-30T08:00:00');
    expect((await getNotifications(resident)).some((n) => n.id === `ended:${l.id}`)).toBe(false);
  });
  it('tells Rosa about her ended shelves (sample), her ended "snow shovels" post and her ended offer', async () => {
    const texts = (await getNotifications(rosa)).filter((n) => n.text === 'This post has ended').map((n) => n.title);
    expect(texts).toEqual(expect.arrayContaining(['Display shelves for a shop, set of 3', 'Snow shovels and salt are in stock', 'Sidewalk-work special: 2 coffees for $5']));
  });
  it('a business post leaves the map after its end date', async () => {
    const posts = await getPosts();
    const offers = await getOffers();
    const places = (await getMapData()).places as MapItem[];
    const idsOn = (d: string) => buildMapExtras({ places, offers: offers as never, posts: posts as never }, new Date(d)).map((e) => e.id);
    expect(idsOn('2026-11-04T12:00:00')).toContain('post-01'); // ends Nov 5
    expect(idsOn('2026-11-05T12:00:00')).toContain('post-01'); // the last day
    expect(idsOn('2026-11-06T12:00:00')).not.toContain('post-01');
    expect(idsOn('2026-11-06T12:00:00')).toContain('post-02'); // ends Dec 20
    expect(idsOn('2026-12-21T12:00:00')).not.toContain('post-02');
  });
  it('a "We\'re open" notice has an end date: 14 days by default, and it must make sense', async () => {
    const p = (await postOpenNotice(rosa, 'place-01', "Rosa's Bakery is open as usual. Use the side door.")) as MapItem;
    expect(p.endsOn).toBe('2026-11-28');
    const custom = (await postOpenNotice(rosa, 'place-01', "Open as usual, use the side door.", '2026-11-20')) as MapItem;
    expect(custom.endsOn).toBe('2026-11-20');
    await expect(postOpenNotice(rosa, 'place-01', 'Open as usual, use the side door.', '2026-11-01')).rejects.toThrow(/today or later/);
    await expect(postOpenNotice(rosa, 'place-01', 'Open as usual, use the side door.', '2027-06-01')).rejects.toThrow(/90 days/);
    await expect(postOpenNotice(rosa, 'place-01', 'Open as usual, use the side door.', 'tomorrow')).rejects.toThrow(/end date/);
    at('2026-12-01T12:00:00');
    expect((await getNotifications(rosa)).some((n) => n.id === `ended:${custom.id}` && n.href === '#/updates')).toBe(true);
  });
});

describe('ending a listing early, and posting it again', () => {
  it('lets only the seller end it; it leaves the Marketplace and the map and the seller gets the notification', async () => {
    await expect(endListing(resident, 'mk-01', 'sold')).rejects.toThrow(/Only the person who posted/);
    await endListing(maya, 'mk-01', 'sold');
    expect((await getListings(resident)).some((l) => l.id === 'mk-01')).toBe(false);
    expect((await getListingPins()).some((p) => p.id === 'mk-01')).toBe(false);
    const note = (await getNotifications(maya)).find((n) => n.id === 'ended:mk-01')!;
    expect(note.text).toBe('This post has ended');
    const mine = (await getListings(maya)).find((l) => l.id === 'mk-01')!;
    expect(mine).toMatchObject({ status: 'ended', endedBy: 'sold', endedOn: '2026-11-14' });
    await expect(endListing(maya, 'mk-01', 'removed')).rejects.toThrow(/already ended/);
  });
  it('posts it again for 7, 14 or 30 days, and not while it is still up', async () => {
    await expect(relistListing(maya, 'mk-01', 7)).rejects.toThrow(/still up/);
    await endListing(maya, 'mk-01', 'removed');
    await expect(relistListing(resident, 'mk-01', 7)).rejects.toThrow(/Only the person who posted/);
    await expect(relistListing(maya, 'mk-01', 5)).rejects.toThrow(/how long/);
    await relistListing(maya, 'mk-01', 30);
    const l = (await getListings(resident)).find((x) => x.id === 'mk-01')!;
    expect(l).toMatchObject({ status: 'active', endsOn: '2026-12-14', posted: '2026-11-14' });
    expect(l.endedBy).toBeUndefined();
    expect((await getListingPins()).some((p) => p.id === 'mk-01')).toBe(true);
  });
  it('lets Rosa post her ended shelves again', async () => {
    await relistListing(rosa, 'mk-15', 14);
    expect((await getListings(resident)).some((l) => l.id === 'mk-15')).toBe(true);
  });
});

describe('message the seller (Bhavana\'s Chats)', () => {
  it('opens a chat with the seller and a first line about the listing, once', async () => {
    const id = await messageSeller(resident, 'mk-01');
    const again = await messageSeller(resident, 'mk-01');
    expect(again).toBe(id);
    const chat = (await getChat(resident, id))!;
    expect(chat.messages).toHaveLength(1);
    expect(chat.messages[0].text).toBe('Hi, is "Kids\' bike, 20 inch" still available?');
    // Maya sees it in her own chats
    expect((await getChats(maya)).some((c) => c.id === id)).toBe(true);
  });
  it('works with a neighbour who is only known from the listing, and with an organization', async () => {
    const id = await messageSeller(resident, 'mk-03'); // Marcus T.
    expect((await getChat(resident, id))!.otherName).toBe('Marcus T.');
    const org = await messageSeller(resident, 'mk-07'); // Riverside Neighbours Network
    expect((await getChats(priya)).some((c) => c.id === org)).toBe(true);
  });
  it('explains why when it cannot: your own listing, an ended post, City staff, a blocked person', async () => {
    await expect(messageSeller(maya, 'mk-01')).rejects.toThrow(/own listing/);
    await expect(messageSeller(resident, 'mk-15')).rejects.toThrow(/ended/);
    await expect(messageSeller(jordan, 'mk-01')).rejects.toThrow(/City staff message people about their requests only/);
    const id = await messageSeller(resident, 'mk-01');
    await blockInChat(maya, id);
    await expect(messageSeller(resident, 'mk-01')).rejects.toThrow(/isn't accepting messages from you/); // never says "blocked you"
  });
});

describe('report a listing (Neighbr staff queue)', () => {
  it('writes a report with a copy of the listing, and the seller is not told who reported it', async () => {
    await reportListing(resident, 'mk-03', 'Scam or fake', 'Asked me to pay by gift card.');
    const [r] = await getListingReports();
    expect(r).toMatchObject({ listingId: 'mk-03', title: 'Snow blower, barely used', sellerName: 'Marcus T.', reportedBy: 'profile-resident', reason: 'Scam or fake', note: 'Asked me to pay by gift card.', status: 'open' });
    // the seller's own view of listings never carries reports
    expect(JSON.stringify(await getListings(personaById('business')))).not.toMatch(/reportedBy|gift card/);
  });
  it('refuses your own listing, a second report from the same person, a bad reason and a long note', async () => {
    await expect(reportListing(maya, 'mk-01', 'Scam or fake')).rejects.toThrow(/own listing/);
    await reportListing(resident, 'mk-01', 'Wrong category or misleading');
    await expect(reportListing(resident, 'mk-01', 'Scam or fake')).rejects.toThrow(/already reported/);
    await expect(reportListing(rosa, 'mk-01', 'because' as never)).rejects.toThrow(/reason/);
    await expect(reportListing(rosa, 'mk-01', 'Scam or fake', 'x'.repeat(400))).rejects.toThrow(/under 300/);
    await expect(reportListing(rosa, 'nope', 'Scam or fake')).rejects.toThrow(/not found/);
    expect(await getListingReports()).toHaveLength(1);
  });
  it('lists the newest first, and staff can hide a listing: it leaves the Marketplace and the map', async () => {
    await reportListing(resident, 'mk-03', 'Scam or fake');
    clockNow = new Date('2026-11-14T16:00:00');
    await reportListing(resident, 'mk-04', 'Something else');
    const reports = await getListingReports();
    expect(reports.map((r) => r.listingId)).toEqual(['mk-04', 'mk-03']);
    await resolveListingReport(reports[1].id, 'hidden');
    expect((await getListings(maya)).some((l) => l.id === 'mk-03')).toBe(false);
    expect((await getListingPins()).some((p) => p.id === 'mk-03')).toBe(false);
    expect((await getListingReports()).find((r) => r.listingId === 'mk-03')!.status).toBe('hidden');
    await resolveListingReport(reports[0].id, 'kept');
    expect((await getListings(maya)).some((l) => l.id === 'mk-04')).toBe(true);
    await expect(resolveListingReport('nope', 'kept')).rejects.toThrow(/not found/);
  });
  it('a hidden listing cannot be posted again by its seller, and does not send them an "ended" notice', async () => {
    await reportListing(resident, 'mk-03', 'Scam or fake');
    await resolveListingReport((await getListingReports())[0].id, 'hidden');
    // Marcus is not a persona, so use Maya's: hide hers
    await reportListing(rosa, 'mk-01', 'Scam or fake');
    await resolveListingReport((await getListingReports()).find((r) => r.listingId === 'mk-01')!.id, 'hidden');
    await expect(relistListing(maya, 'mk-01', 7)).rejects.toThrow(/Neighbr staff removed/);
    expect((await getNotifications(maya)).some((n) => n.id === 'ended:mk-01')).toBe(false);
  });
});
