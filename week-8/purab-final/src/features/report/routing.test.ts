// KAN-35 (Purab): who a report goes to, and the report it creates.
import { describe, expect, it } from 'vitest';
import raw from '../../data/mock-data.json';
import { DEMO_BUSINESS_ID, DEMO_USER_ID, isVisibleTo, profileById, recipientsOf, type CardData } from '../cards/cardData';
import { layerOf } from '../map/itemLayer';
import {
  BUSINESS_TYPES,
  NOTE_MAX,
  RESIDENT_TYPES,
  buildReport,
  placesNearest,
  plainName,
  routeFor,
  validateDraft,
} from './routing';

const data = raw as unknown as CardData;
const role = (id?: string) => (id ? profileById(data, id)?.role : undefined);

describe('routing (Nigel, Oct 19)', () => {
  it('never sends a resident report to the BIA', () => {
    for (const t of RESIDENT_TYPES) {
      const { to, cc } = routeFor(data, t);
      expect(to, t.id).toBeDefined();
      expect(to?.role).not.toBe('bia');
      expect(cc?.role).not.toBe('bia');
    }
  });

  it('sends street lights and potholes to City 311 with a copy to the ward councillor', () => {
    for (const id of ['streetlight', 'pothole', 'sidewalk']) {
      const { to, cc } = routeFor(data, RESIDENT_TYPES.find((t) => t.id === id)!);
      expect(to?.id).toBe('profile-city');
      expect(cc?.id).toBe('profile-councillor');
    }
  });

  it('sends anything else from a resident to the ward councillor', () => {
    expect(routeFor(data, RESIDENT_TYPES.find((t) => t.id === 'other')!).to?.role).toBe('councillor');
  });

  it('sends every business request to the BIA', () => {
    for (const t of BUSINESS_TYPES) expect(routeFor(data, t).to?.role, t.id).toBe('bia');
  });
});

describe('validateDraft', () => {
  it('asks for a problem and a place', () => {
    expect(validateDraft('me', { typeId: '', placeId: '', note: '' })).toEqual({
      typeId: 'Choose what the problem is.',
      placeId: 'Choose where it is, from the list or on the map.',
    });
  });

  it('needs a description for "Something else" only', () => {
    expect(validateDraft('me', { typeId: 'other', placeId: 'place-10', note: '' }).note).toBeTruthy();
    expect(validateDraft('me', { typeId: 'streetlight', placeId: 'place-10', note: '' })).toEqual({});
  });

  it('limits the details to 500 characters', () => {
    const errs = validateDraft('me', { typeId: 'pothole', placeId: 'place-10', note: 'x'.repeat(NOTE_MAX + 1) });
    expect(errs.note).toMatch(/500/);
  });

  it("doesn't accept a resident type in business mode", () => {
    expect(validateDraft('business', { typeId: 'pothole', placeId: 'place-01', note: '' }).typeId).toBeTruthy();
  });
});

describe('buildReport', () => {
  const now = new Date('2026-10-24T12:00:00Z');

  it('creates a private resident report at the Reported step, sent to the City', () => {
    const r = buildReport(data, 'me', DEMO_USER_ID, { typeId: 'streetlight', placeId: 'place-10', note: '  Off for 3 nights ' }, now);
    expect(r).toMatchObject({
      kind: 'issue',
      chip: 'issues',
      status: 'reported',
      visibility: 'private until approved',
      reportedBy: DEMO_USER_ID,
      placeId: 'place-10',
      routedToProfile: 'profile-city',
      ccProfile: 'profile-councillor',
      description: 'Off for 3 nights',
      updatedAt: '2026-10-24',
      illustrative: true,
    });
    expect(r.name).toBe('Street light out near Wyandotte Pharmacy');
    // The existing cards read it the same way as the mock data.
    expect(role(recipientsOf(data, r).to?.id)).toBe('city');
    expect(isVisibleTo(r, DEMO_USER_ID)).toBe(true);
    expect(isVisibleTo(r, DEMO_BUSINESS_ID)).toBe(false);
  });

  it('creates a business request sent to the BIA, with no copy', () => {
    const r = buildReport(data, 'business', DEMO_BUSINESS_ID, { typeId: 'access', placeId: 'place-01', note: '' }, now);
    expect(r.routedToProfile).toBe('profile-bia');
    expect(r.ccProfile).toBeUndefined();
    expect(r.description).toBeUndefined();
    expect(layerOf(r as never)).toBe('roadwork'); // "Roadworks and access" -> Roadwork layer
  });

  it('puts the pin a few metres from the place and gives every report its own id', () => {
    const place = data.places.find((p) => p.id === 'place-10')!;
    const a = buildReport(data, 'me', DEMO_USER_ID, { typeId: 'pothole', placeId: 'place-10', note: '' }, now);
    const b = buildReport(data, 'me', DEMO_USER_ID, { typeId: 'pothole', placeId: 'place-10', note: '' }, now);
    expect(a.id).not.toBe(b.id);
    expect(a.lng).toBe(place.lng);
    expect(Math.abs((a.lat as number) - (place.lat as number))).toBeLessThan(0.0002);
  });

  it('refuses an incomplete draft', () => {
    expect(() => buildReport(data, 'me', DEMO_USER_ID, { typeId: '', placeId: 'place-10', note: '' })).toThrow();
  });
});

describe('helpers', () => {
  it('lists places nearest first', () => {
    const p = data.places.find((x) => x.id === 'place-10')!;
    expect(placesNearest(data, [p.lng as number, p.lat as number])[0].id).toBe('place-10');
  });

  it('drops "(demo)" from names', () => {
    expect(plainName('City of Windsor 311 (demo)')).toBe('City of Windsor 311');
  });
});
