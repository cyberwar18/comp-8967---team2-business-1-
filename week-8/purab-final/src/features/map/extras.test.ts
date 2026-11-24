import { describe, expect, it } from 'vitest';
import data from '../../data/mock-data.json';
import { visibleToViewer, type CardData } from '../cards/cardData';
import { buildMapExtras, isPublic, shortDate } from './extras';
import { layerOf } from './itemLayer';
import { allItems, type MapData, type MapItem } from './types';

const places = data.places as unknown as MapItem[];
const TODAY = new Date('2026-10-20T12:00:00Z');
const extras = buildMapExtras({ places, offers: data.offers as never, posts: data.posts as never, polls: data.polls as never }, TODAY);
const ids = extras.map((e) => e.id);

describe('business posts and offers layer', () => {
  it('puts public offers and posts in the posts layer, with a pin near their shop', () => {
    const offer = extras.find((e) => e.id === 'offer-01')!;
    expect(layerOf(offer)).toBe('posts');
    expect(layerOf(extras.find((e) => e.id === 'post-01')!)).toBe('posts');
    const bakery = places.find((p) => p.id === 'place-01')!;
    const dLat = (offer.lat - bakery.lat) * 111000;
    const dLng = (offer.lng - bakery.lng) * 82000;
    expect(Math.hypot(dLat, dLng)).toBeLessThan(25); // about 10 m, never on top of the shop's own pin
    expect(Math.hypot(dLat, dLng)).toBeGreaterThan(5);
  });
  it('gives two items at the same shop different spots', () => {
    const two = buildMapExtras(
      { places, offers: [{ id: 'a', kind: 'offer', name: 'A', placeId: 'place-01' }, { id: 'b', kind: 'offer', name: 'B', placeId: 'place-01' }] },
      TODAY,
    );
    expect([two[0].lat, two[0].lng]).not.toEqual([two[1].lat, two[1].lng]);
  });
  it('takes an expired offer off the map', () => {
    const later = buildMapExtras({ places, offers: data.offers as never }, new Date('2026-10-26T12:00:00Z'));
    expect(later.map((e) => e.id)).not.toContain('offer-02'); // valid until Oct 25
    expect(later.map((e) => e.id)).toContain('offer-01'); // valid until Oct 31
  });
  it('formats short dates', () => {
    expect(shortDate('2026-10-31')).toBe('Oct 31');
  });
});

describe('private requests stay off the public map', () => {
  it('drops the business draft post that is waiting for the BIA', () => {
    const draft = (data.posts as { id: string; visibility?: string }[]).find((p) => p.id === 'post-03')!;
    expect(draft.visibility).toBe('private until approved'); // the test data really is private
    expect(ids).not.toContain('post-03');
  });
  it('never lets a private item through, even with a public-looking name', () => {
    const sneaky = buildMapExtras(
      { places, posts: [{ id: 'x', kind: 'post', name: 'Public sale', placeId: 'place-01', visibility: 'private' }, { id: 'y', kind: 'post', name: 'Open', placeId: 'place-01' }] },
      TODAY,
    );
    expect(sneaky.map((e) => e.id)).toEqual(['y']);
    expect(isPublic({ visibility: 'private until approved' })).toBe(false);
    expect(isPublic({})).toBe(true);
    expect(isPublic({ visibility: 'public' })).toBe(true);
  });
  it("shows another person no private pin at all, and a person only their own report", () => {
    const all = (viewer: string) => [
      ...allItems(visibleToViewer(data as unknown as CardData, viewer) as unknown as MapData),
      ...extras,
    ];
    const privateOf = (viewer: string) => all(viewer).filter((i) => !isPublic(i as { visibility?: string })).map((i) => i.id);
    expect(privateOf('profile-bia')).toEqual([]); // the BIA's public map shows none
    expect(privateOf('profile-nobody')).toEqual([]);
    expect(all('profile-resident').map((i) => i.id)).not.toContain('issue-04'); // the bakery's request to the BIA
    expect(all('profile-resident').map((i) => i.id)).toContain('issue-05'); // the resident's own report
    expect(privateOf('profile-business')).toEqual(['issue-04']); // only the business's own request, and never the draft post
  });
});

describe('BIA polls', () => {
  it('draws open and closed polls in the polls layer', () => {
    const open = extras.find((e) => e.id === 'poll-01')!;
    const closed = extras.find((e) => e.id === 'poll-02')!;
    expect(layerOf(open)).toBe('polls');
    expect(open.status).toBe('open until Nov 6');
    expect(closed.status).toBe('closed');
  });
});
