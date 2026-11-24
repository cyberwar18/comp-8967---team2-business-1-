// KAN-50 (Purab): settings rules and the adapter that stores and applies them.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import raw from '../../data/mock-data.json';
import { personaById } from '../requests/personas';
import { reaches, type AreaAlert } from '../updates/neighbourhood';
import {
  DEFAULT_SETTINGS,
  NOTICE_KINDS,
  applySettings,
  displayName,
  hasHomeArea,
  keepNotice,
  roleAndOrg,
  validateSettings,
  withDefaults,
  type HomePlace,
} from './settings';
import {
  effectivePersona,
  getMessageSetting,
  getNotifications,
  getProfileSummary,
  getSettings,
  resetDemo,
  saveSettings,
  setClockForTests,
} from '../../data/api';

const places = (raw as { places: HomePlace[] }).places.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng }));
const now = new Date('2026-11-12T15:00:00Z');

beforeEach(() => setClockForTests(() => now));
afterEach(() => {
  resetDemo();
  setClockForTests(null);
});

describe('settings rules', () => {
  it('everything is on by default, and older saved data is filled in', () => {
    expect(withDefaults(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(withDefaults({ notify: { chats: false } as never }).notify).toMatchObject({ chats: false, requests: true, alerts: true });
    expect(NOTICE_KINDS.map((k) => k.id)).toEqual(['requests', 'chats', 'alerts', 'community', 'marketplace']);
  });

  it('people and organizations have a home area; staff do not', () => {
    expect(hasHomeArea(personaById('resident'))).toBe(true);
    expect(hasHomeArea(personaById('community-organizer'))).toBe(true);
    expect(hasHomeArea(personaById('city-lead'))).toBe(false);
    expect(hasHomeArea(personaById('neighbr-staff'))).toBe(false);
  });

  it('a home area must be a listed place, and staff cannot set one', () => {
    const s = { ...DEFAULT_SETTINGS, homePlaceId: 'place-01' };
    expect(validateSettings(personaById('resident'), s, places)).toBeNull();
    expect(validateSettings(personaById('resident'), { ...s, homePlaceId: 'my-house' }, places)).toMatch(/Choose a home area/);
    expect(validateSettings(personaById('city-crew'), s, places)).toMatch(/Staff accounts have no home area/);
  });

  it('the chosen home area replaces the demo default', () => {
    const r = personaById('resident');
    const moved = applySettings(r, { ...DEFAULT_SETTINGS, homePlaceId: 'place-13' }, places);
    expect(moved.home).toEqual([-82.970787, 42.328319]);
    expect(applySettings(r, DEFAULT_SETTINGS, places)).toBe(r); // nothing chosen: same person
  });

  it('keeps only the notification kinds left on', () => {
    const s = { ...DEFAULT_SETTINGS, notify: { ...DEFAULT_SETTINGS.notify, alerts: false } };
    expect(keepNotice(s, 'alerts')).toBe(false);
    expect(keepNotice(s, 'chats')).toBe(true);
  });

  it('shows the plain name, role and organization', () => {
    expect(displayName(personaById('parent'))).toBe('Maya R.');
    expect(roleAndOrg(personaById('community-organizer'))).toEqual({ role: 'Community organizer', org: 'Riverside Neighbours Network' });
    expect(roleAndOrg(personaById('city-lead'))).toEqual({ role: 'City 311 intake lead' });
  });
});

describe('settings in the adapter', () => {
  it('saves per person, even when two staff share one organization profile', async () => {
    await saveSettings(personaById('city-lead'), { notify: { ...DEFAULT_SETTINGS.notify, chats: false } });
    expect((await getSettings(personaById('city-lead'))).notify.chats).toBe(false);
    expect((await getSettings(personaById('city-crew'))).notify.chats).toBe(true);
  });

  it('refuses a choice that is not allowed, with the reason', async () => {
    await expect(saveSettings(personaById('resident'), { ...DEFAULT_SETTINGS, homePlaceId: 'nowhere' })).rejects.toThrow(/Choose a home area/);
    expect(await getSettings(personaById('resident'))).toEqual(DEFAULT_SETTINGS);
  });

  it('turning a kind off takes it out of the bell, and turning it on brings it back', async () => {
    const r = personaById('resident');
    const alertsIn = async () => (await getNotifications(r)).filter((n) => n.id.startsWith('alert:')).length;
    expect(await alertsIn()).toBe(1); // the hydrant flushing alert
    await saveSettings(r, { notify: { ...DEFAULT_SETTINGS.notify, alerts: false } });
    expect(await alertsIn()).toBe(0);
    const left = await getNotifications(r);
    expect(left.length).toBeGreaterThan(0); // chats and the rest still arrive
    await saveSettings(r, DEFAULT_SETTINGS);
    expect(await alertsIn()).toBe(1);
  });

  it('the home area decides which area alerts reach you', async () => {
    const r = personaById('resident'); // demo home: Second Spin Cycles
    const nearBakery: AreaAlert = { ...(raw as unknown as { areaAlerts: AreaAlert[] }).areaAlerts[0], id: 'a-test', center: [-82.970455, 42.328051], radiusM: 100 };
    expect(reaches(nearBakery, effectivePersona(r))).toBe(false);
    await saveSettings(r, { ...DEFAULT_SETTINGS, homePlaceId: 'place-02' }); // Northside Books, next to the bakery
    expect(reaches(nearBakery, effectivePersona(r))).toBe(true);
  });

  it('Reset demo forgets settings', async () => {
    await saveSettings(personaById('parent'), { ...DEFAULT_SETTINGS, homePlaceId: 'place-12' });
    resetDemo();
    expect(await getSettings(personaById('parent'))).toEqual(DEFAULT_SETTINGS);
    expect(effectivePersona(personaById('parent')).home).toEqual(personaById('parent').home);
  });

  it('"Who can message me" stays Bhavana\'s setting, shared with Chats', async () => {
    expect(await getMessageSetting(personaById('resident'))).toBe('anyone');
  });
});

describe('profile summary', () => {
  it('counts what is yours', async () => {
    const maya = await getProfileSummary(personaById('parent'));
    expect(maya.profile?.id).toBe('profile-resident-maya');
    expect(maya.sent).toBeGreaterThanOrEqual(2); // the pothole and the crosswalk
    expect(maya.open).toBeGreaterThanOrEqual(1);
    expect(maya.listings).toBeGreaterThanOrEqual(1); // the kids' bike
  });

  it('a business shows the owner as a separate profile', async () => {
    const rosa = await getProfileSummary(personaById('business'));
    expect(rosa.profile?.id).toBe('profile-business');
    expect(rosa.owner?.id).toBe('profile-owner-rosa');
  });

  it('never includes a home address or contact details', async () => {
    const json = JSON.stringify(await getProfileSummary(personaById('resident')));
    expect(json).not.toMatch(/"address"|"phone"|"email"/);
  });
});
