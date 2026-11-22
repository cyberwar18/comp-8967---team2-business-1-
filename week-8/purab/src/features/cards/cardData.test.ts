// Checks the data rules behind tasks 9–12.
import { describe, expect, it } from 'vitest';
import raw from '../../data/mock-data.json';
import {
  DEMO_BUSINESS_ID,
  DEMO_USER_ID,
  aroundYou,
  distanceM,
  formatDistance,
  formatWhen,
  happeningAt,
  initials,
  issueProgress,
  isVisibleTo,
  pinIdFor,
  youAreHere,
  profileForPlace,
  requestsBy,
  type CardData,
  type Item,
} from './cardData';

const data = raw as unknown as CardData;
const byId = (id: string) => [...data.places, ...data.events, ...data.updates, ...(data.offers ?? [])].find((i) => i.id === id)!;

describe('task 9: user presence', () => {
  it('makes avatar initials and ignores "(demo)"', () => {
    expect(initials('Morgan Ellis (demo)')).toBe('ME');
    expect(initials('Team 2 Group 10')).toBe('TG');
    expect(initials("Rosa's Bakery")).toBe('RB');
  });
});

describe('task 10: place and profile cards', () => {
  it('every place has hours (or is vacant) for the card', () => {
    for (const p of data.places) {
      if (p.status !== 'vacant') expect(p.hours, p.name).toBeTruthy();
    }
  });

  it("finds the profile that runs Rosa's Bakery", () => {
    expect(profileForPlace(data, 'place-01')?.role).toBe('business');
  });

  it("lists what is happening at Rosa's Bakery, without private reports for a resident", () => {
    const here = happeningAt(data, 'place-01').map((i) => i.id);
    expect(here).toContain('offer-01');
    expect(here).toContain('update-01');
    expect(here).not.toContain('issue-04'); // private until the BIA approves
  });

  it('shows the business its own private requests', () => {
    expect(requestsBy(data, DEMO_BUSINESS_ID).map((i) => i.id)).toContain('issue-04');
    expect(happeningAt(data, 'place-01').map((i) => i.id)).not.toContain('issue-04'); // shown under My requests only
  });
});

describe('task 11: activity cards and Around you', () => {
  it('turns issue status into progress steps', () => {
    expect(issueProgress('reported')).toMatchObject({ step: 1, total: 3, label: 'Reported' });
    expect(issueProgress('acknowledged')).toMatchObject({ step: 2 });
    expect(issueProgress('resolved')).toMatchObject({ step: 3 });
    expect(issueProgress('???')).toMatchObject({ step: 0, label: 'Unknown' });
  });

  it('formats event times', () => {
    expect(formatWhen('2026-10-16T16:00', '2026-10-16T20:00')).toBe('Fri, Oct 16 · 4:00 PM – 8:00 PM');
  });

  it('measures distance and rounds it for people', () => {
    const m = distanceM([-82.95, 42.339], [-82.949, 42.339]);
    expect(m).toBeGreaterThan(70);
    expect(m).toBeLessThan(90);
    expect(formatDistance(m)).toBe('80 m away');
    expect(formatDistance(1530)).toBe('1.5 km away');
  });

  it('sorts nearest first and puts past events last', () => {
    const list = aroundYou(data, DEMO_USER_ID);
    const metres = list.filter((e) => e.item.status !== 'past').map((e) => e.metres ?? 0);
    expect(metres).toEqual([...metres].sort((a, b) => a - b));
    expect(list.at(-1)?.item.status).toBe('past');
  });

  it('includes offers, but only private reports the viewer raised', () => {
    const ids = aroundYou(data, DEMO_USER_ID).map((e) => e.item.id);
    expect(ids).toContain('offer-01');
    expect(ids).toContain('issue-05'); // the demo resident raised this one
    expect(ids).not.toContain('issue-04'); // the bakery's private request
  });

  it('filters by kind', () => {
    const events = aroundYou(data, DEMO_USER_ID, undefined, 'event');
    expect(events.length).toBe(5);
    expect(events.every((e) => e.item.kind === 'event')).toBe(true);
  });
});

describe('task 9: you are here', () => {
  it('sits on one of the corridor places, not a home address', () => {
    const [lng, lat] = youAreHere(data);
    expect(data.places.some((p) => p.lng === lng && p.lat === lat)).toBe(true);
  });
});

describe('task 12: linking cards and pins', () => {
  it('an offer selects its shop pin; everything else selects itself', () => {
    expect(pinIdFor(byId('offer-01'))).toBe('place-01');
    expect(pinIdFor(byId('event-01'))).toBe('event-01');
  });

  it('public items are visible to everyone', () => {
    const pub: Item = { id: 'x', kind: 'update', name: 'x', visibility: 'public' };
    expect(isVisibleTo(pub, 'anyone')).toBe(true);
  });
});
