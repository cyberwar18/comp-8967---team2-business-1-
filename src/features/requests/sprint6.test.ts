// Sprint 6: Nigel's Nov 2 feedback and this week's features (Purab and Bhavana).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import raw from '../../data/mock-data.json';
import { PERSONAS, personaById } from './personas';
import {
  accessOf,
  applyAction,
  can,
  dueText,
  filterQueue,
  historyFor,
  overdueDays,
  requestFromReport,
  type Persona,
  type ServiceRequest,
  type StaffMember,
} from './requests';
import {
  actOnRequest,
  clearSubmittedReports,
  getMapData,
  getNotifications,
  getRequests,
  markRequestRead,
  resetDemo,
  setClockForTests,
  submitReport,
} from '../../data/api';
import { buildReport, validateDraft } from '../report/routing';
import type { CardData } from '../cards/cardData';
import type { MapItem } from '../search/filters';

const data = raw as unknown as { requests: ServiceRequest[]; staff: StaffMember[]; profiles: { id: string; name: string }[] };
const cards = raw as unknown as CardData;
const staff = data.staff;
const orgs = Object.fromEntries(data.profiles.map((p) => [p.id, p.name]));
const seed = (id: string) => structuredClone(data.requests.find((r) => r.id === id)!);
const t0 = new Date('2026-11-01T15:00:00Z');
const act = (r: ServiceRequest, p: Persona, a: Parameters<typeof applyAction>[2], input = {}) => applyAction(r, p, a, input, staff, orgs, t0);

const resident = personaById('resident');
const lead = personaById('city-lead');
const crew = personaById('city-crew');
const bia = personaById('bia-lead');
const councillor = personaById('councillor');
const school = personaById('school-staff');

describe('a cross-section of user types (Viewing as and onboarding)', () => {
  it('has people, organizations and staff, each with a landing page', () => {
    for (const g of ['people', 'organizations', 'staff']) expect(PERSONAS.some((p) => p.group === g)).toBe(true);
    for (const p of PERSONAS) expect(['map', 'requests', 'community']).toContain(p.landing);
    expect(PERSONAS.length).toBeGreaterThanOrEqual(10);
  });

  it('lands each type on its own page', () => {
    expect(personaById('resident').landing).toBe('map');
    expect(personaById('school-staff')).toMatchObject({ landing: 'community', community: { orgId: 'org-school', as: 'organizer' }, schoolRole: 'staff' });
    expect(personaById('parent').schoolRole).toBe('parent');
    expect(personaById('city-lead').landing).toBe('requests');
  });

  it('City staff and the councillor handle requests; everyone else can send them', () => {
    expect(personaById('city-lead').canReport).toBe(false);
    expect(personaById('councillor').canReport).toBe(false);
    for (const id of ['resident', 'business', 'community-organizer', 'school-staff', 'library-staff', 'bia-lead']) expect(personaById(id).canReport).toBe(true);
  });
});

describe('any user can send a request, organizations too (Nigel, Nov 2)', () => {
  const fromBia = () =>
    requestFromReport({ id: 'r-bia', name: 'Street light out near the BIA office', reportedBy: 'profile-bia', routedToProfile: 'profile-city', ccProfile: 'profile-councillor' }, 'Olde Riverside BIA (demo)', 'organization', t0);

  it('the BIA sends a street light request to the City as an individual', () => {
    const r = fromBia();
    expect(accessOf(bia, r, staff)).toBe('requester');
    expect(accessOf(lead, r, staff)).toBe('lead');
    expect(can(bia, r, 'follow-up', staff, orgs).ok).toBe(true);
    expect(can(bia, r, 'acknowledge', staff, orgs).ok).toBe(false); // it's the City's to handle
  });

  it("a school sends one too, and sees the City's answer", () => {
    let r = requestFromReport({ id: 'r-sch', name: 'Unsafe crossing on Route A', reportedBy: 'profile-school', routedToProfile: 'profile-city' }, 'Riverside Public School (demo)', 'organization', t0);
    r = act(r, lead, 'acknowledge');
    r = act(r, lead, 'update', { text: 'A crossing guard starts Monday.' });
    expect(historyFor(school, r, staff).at(-1)?.text).toBe('A crossing guard starts Monday.');
  });

  it('an organization cannot send a request to itself', () => {
    expect(() => requestFromReport({ id: 'x', name: 'x', reportedBy: 'profile-city', routedToProfile: 'profile-city' }, 'City', 'organization')).toThrow(/to itself/);
  });
});

describe('the sender chooses: post to the map or send privately', () => {
  const draft = { typeId: 'streetlight', placeId: 'place-08', note: '' };
  it('private by default', () => {
    expect(buildReport(cards, 'me', 'profile-resident', draft, t0).visibility).toBe('private until approved');
  });
  it('public when the sender posts it to the map', () => {
    const report = buildReport(cards, 'me', 'profile-resident', { ...draft, share: 'public' }, t0);
    expect(report.visibility).toBe('public');
    expect(requestFromReport(report as never, 'Team 2 Group 10', 'resident', t0).public).toBe(true);
  });
  it('a spot picked on the map replaces the place list, and is named after the nearest place', () => {
    const point: [number, number] = [-82.96808, 42.32887];
    expect(validateDraft('me', { typeId: 'streetlight', placeId: '', note: '', point })).toEqual({});
    const r = buildReport(cards, 'me', 'profile-resident', { typeId: 'streetlight', placeId: '', note: '', point }, t0);
    expect([r.lng, r.lat]).toEqual(point);
    expect(r.name).toMatch(/near Second Spin Cycles/);
  });
  it('keeps the photo with the report and the request', () => {
    const r = buildReport(cards, 'me', 'profile-resident', { ...draft, photo: 'data:image/jpeg;base64,AAAA' }, t0);
    expect(requestFromReport(r as never, 'Team 2 Group 10', 'resident', t0).photo).toBe('data:image/jpeg;base64,AAAA');
  });
});

describe('the ward councillor can comment (Nigel, Nov 2)', () => {
  it('a copy holder comments; the sender and the City see it', () => {
    const r = act(seed('req-issue-05'), councillor, 'comment', { text: 'I have asked the City to prioritise this.' });
    const last = r.history.at(-1)!;
    expect(last).toMatchObject({ action: 'comment', text: 'I have asked the City to prioritise this.' });
    expect(last.internal).toBeUndefined();
    expect(historyFor(resident, r, staff).at(-1)?.action).toBe('comment');
  });
  it('but still cannot change the request', () => {
    expect(can(councillor, seed('req-issue-05'), 'resolve', staff, orgs).reason).toMatch(/can comment\. Only City of Windsor 311/);
  });
  it('comments are only for copy holders', () => {
    expect(can(lead, seed('req-issue-05'), 'comment', staff, orgs).ok).toBe(false);
    expect(can(resident, seed('req-issue-05'), 'comment', staff, orgs).ok).toBe(false);
  });
});

describe('due dates and overdue warnings (Bhavana)', () => {
  it('street lights are due in 5 days; overdue is said in words', () => {
    const r = seed('req-issue-05'); // sent Oct 7
    expect(overdueDays(r, t0)).toBe(20); // due Oct 12
    expect(dueText(r, t0)).toBe('Overdue by 20 days');
  });
  it('closed requests are never overdue', () => {
    expect(overdueDays(seed('req-11'), t0)).toBe(0);
    expect(dueText(seed('req-11'), t0)).toBe('');
  });
  it('filters overdue requests and sorts oldest first', () => {
    const city = data.requests.filter((r) => r.toProfile === 'profile-city');
    expect(filterQueue(city, 'overdue', lead, t0).every((r) => overdueDays(r, t0) > 0)).toBe(true);
    const oldest = filterQueue(city, 'all', lead, t0, 'oldest');
    expect(oldest[0].id).toBe('req-issue-05');
  });
});

describe('moving a request to another City team (Bhavana)', () => {
  it('needs a reason, and the record says who it moved from and to', () => {
    let r = act(seed('req-issue-05'), lead, 'assign', { assigneeId: 'staff-311-roads' });
    expect(() => act(r, lead, 'assign', { assigneeId: 'staff-311-parks' })).toThrow(/why/);
    r = act(r, lead, 'assign', { assigneeId: 'staff-311-parks', text: 'The light is in the parkette, so Parks looks after it.' });
    expect(r.assigneeId).toBe('staff-311-parks');
    expect(r.history.at(-1)?.text).toMatch(/^Moved from Sam Patel.* to Dana Wright.*Parks looks after it\.$/);
  });
  it('only the lead can move it', () => {
    const r = act(seed('req-issue-05'), lead, 'assign', { assigneeId: 'staff-311-roads' });
    expect(can(crew, r, 'assign', staff, orgs).ok).toBe(false);
  });
});

describe('notifications and keeping the demo after a refresh (data adapter)', () => {
  beforeEach(() => setClockForTests(() => t0));
  afterEach(() => {
    clearSubmittedReports();
    setClockForTests(null);
  });

  it('the sender is told about every answer, in plain words, until they open the request', async () => {
    await actOnRequest('req-issue-05', lead, 'acknowledge');
    await actOnRequest('req-issue-05', lead, 'ask-info', { text: 'Which side of the street?' });
    await actOnRequest('req-issue-05', councillor, 'comment', { text: 'Following this one.' });
    // (The sample hydrant-flushing area alert also reaches the resident; here we look at the request's notifications.)
    const notes = (await getNotifications(resident)).filter((n) => n.requestId);
    expect(notes.map((n) => n.text)).toEqual(
      expect.arrayContaining(['City of Windsor 311 received your request', 'City of Windsor 311 asked you a question', 'Ward Councillor commented']),
    );
    expect(notes.every((n) => !n.read)).toBe(true);
    markRequestRead(resident, 'req-issue-05');
    expect((await getNotifications(resident)).filter((n) => n.requestId).every((n) => n.read)).toBe(true);
  });

  it('only the sender gets them, and internal notes never become notifications', async () => {
    await actOnRequest('req-issue-05', lead, 'note', { text: 'Pole 4417.' });
    expect((await getNotifications(resident)).filter((n) => n.requestId)).toHaveLength(0);
    // Rosa only hears about her own request (the BIA's answers in the sample data), not the resident's.
    expect((await getNotifications(personaById('business'))).filter((n) => n.requestId).map((n) => n.text)).toEqual([
      'Olde Riverside BIA sent an update',
      'Olde Riverside BIA received your request',
    ]);
  });

  it('saves the demo in the browser, and Reset demo goes back to the sample data', async () => {
    await submitReport({
      id: 'report-keep', kind: 'issue', chip: 'issues', name: 'Kept', category: 'Roads', status: 'reported', lat: 42.33, lng: -82.97,
      reportedBy: 'profile-resident', routedToProfile: 'profile-city', illustrative: true,
    } as unknown as MapItem);
    expect(localStorage.getItem('pinpoint-demo-v1')).toMatch(/report-keep/);
    resetDemo();
    expect(localStorage.getItem('pinpoint-demo-v1')).toBeNull();
    expect((await getMapData()).updates.some((u) => u.id === 'report-keep')).toBe(false);
    expect((await getRequests(resident)).some((r) => r.id === 'req-report-keep')).toBe(false);
  });
});
