// Sprint 6 demo features: "Me too", "Was it fixed?", Corridor pulse, area alerts, ward polls, roadwork impact.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import raw from '../../data/mock-data.json';
import { personaById, PERSONAS } from '../requests/personas';
import { applyAction, can, accessOf, historyFor, neighboursText, type Persona, type ServiceRequest, type StaffMember } from '../requests/requests';
import { boardReport, summarize } from '../requests/insightsData';
import { canSeeResults, canVote, reachCount, reaches, roadworkImpacts, validateAlert, validatePoll, type AreaAlert, type WardPoll } from './neighbourhood';
import {
  actOnRequest,
  alertReach,
  clearSubmittedReports,
  createWardPoll,
  getAlerts,
  getMapData,
  getNotifications,
  getPosts,
  getRecentlyFixed,
  getSupportable,
  getWardPolls,
  postOpenNotice,
  sendAreaAlert,
  setClockForTests,
  voteWardPoll,
} from '../../data/api';

const data = raw as unknown as {
  requests: ServiceRequest[];
  staff: StaffMember[];
  profiles: { id: string; name: string }[];
  places: { id: string; name: string; category: string; lat: number; lng: number }[];
  updates: never[];
  wardPolls: WardPoll[];
  areaAlerts: AreaAlert[];
};
const staff = data.staff;
const orgs = Object.fromEntries(data.profiles.map((p) => [p.id, p.name]));
const seed = (id: string) => structuredClone(data.requests.find((r) => r.id === id)!);
const t0 = new Date('2026-11-04T15:00:00Z');
const act = (r: ServiceRequest, p: Persona, a: Parameters<typeof applyAction>[2], input = {}) => applyAction(r, p, a, input, staff, orgs, t0);

const resident = personaById('resident');
const parent = personaById('parent');
const business = personaById('business');
const lead = personaById('city-lead');
const councillor = personaById('councillor');

describe('"Me too": neighbours support a public request (Purab)', () => {
  it('a resident supports the pothole another resident posted to the map', () => {
    const r = act(seed('req-07'), resident, 'support');
    expect(r.supporters).toContain('profile-resident');
    expect(accessOf(resident, r, staff)).toBe('supporter');
    expect(neighboursText(r)).toBe('Reported by 3 neighbours');
    expect(historyFor(resident, r, staff).some((h) => h.internal)).toBe(false);
  });
  it('not your own, not private, not twice, not closed, and staff handle it instead', () => {
    expect(can(parent, seed('req-07'), 'support', staff, orgs).reason).toBe('You sent this one.');
    expect(can(business, seed('req-issue-05'), 'support', staff, orgs).reason).toMatch(/Only requests posted to the map/);
    const once = act(seed('req-07'), resident, 'support');
    expect(can(resident, once, 'support', staff, orgs).reason).toMatch(/already support/);
    expect(can(lead, seed('req-07'), 'support', staff, orgs).ok).toBe(false);
    expect(can(resident, { ...seed('req-07'), state: 'resolved' }, 'support', staff, orgs).reason).toMatch(/closed/);
  });
  it('a supporter cannot change the request', () => {
    const r = act(seed('req-07'), resident, 'support');
    expect(can(resident, r, 'follow-up', staff, orgs).reason).toMatch(/You support this request/);
  });
});

describe('"Was it fixed?" (Purab)', () => {
  const resolved = () => act(act(seed('req-issue-05'), lead, 'acknowledge'), lead, 'resolve', { text: 'Lamp replaced.' });
  it('the sender rates it once it is resolved, once', () => {
    expect(can(resident, seed('req-issue-05'), 'rate', staff, orgs).ok).toBe(false);
    const r = act(resolved(), resident, 'rate', { rating: 'fixed', text: 'Thanks!' });
    expect(r.rating).toMatchObject({ value: 'fixed', text: 'Thanks!' });
    expect(r.history.at(-1)?.text).toBe("Yes, it's fixed. Thanks!");
    expect(can(resident, r, 'rate', staff, orgs).reason).toMatch(/already rated/);
  });
  it('"not fixed" needs to say what is wrong, and the sender can still reopen', () => {
    expect(() => act(resolved(), resident, 'rate', { rating: 'not-fixed' })).toThrow(/still wrong/);
    const r = act(resolved(), resident, 'rate', { rating: 'not-fixed', text: 'Still flickering.' });
    expect(can(resident, r, 'reopen', staff, orgs, t0).ok).toBe(true); // same fixed day as the resolve, so it doesn't depend on today's date
  });
  it('only the sender rates', () => {
    expect(can(lead, resolved(), 'rate', staff, orgs).ok).toBe(false);
  });
});

describe('Corridor pulse and board report (Bhavana)', () => {
  const city = data.requests.filter((r) => r.toProfile === 'profile-city');
  it('counts, speed, ratings, kinds and hotspots', () => {
    const i = summarize(city, data.places, t0);
    expect(i.total).toBe(5); // includes Devu's street-light outcome (req-12)
    expect(i.open).toBe(3);
    expect(i.overdue).toBe(3);
    expect(i.avgDaysToResolve).toBe(7.8); // the crosswalk (8.3 days) and the street light near Glidden Grocer
    expect(i.fixedRate).toBe(100);
    expect(i.supporters).toBe(1);
    expect(i.byCategory.map((c) => c.category)).toContain('Roads');
    expect(i.hotspots[0]).toMatchObject({ placeId: 'place-05', count: 2 }); // the pothole + 1 supporter
    expect(i.mostSupported?.id).toBe('req-07');
  });
  it('writes a one-page board report without residents’ names', () => {
    const r = boardReport('City of Windsor 311', summarize(city, data.places, t0), city, t0);
    expect(r.title).toBe('City of Windsor 311: November 2026 report');
    expect(r.lines.join(' ')).toMatch(/resolved in 7.8 days/);
    expect(r.fixed[0]).toMatch(/Faded crosswalk at Thompson: Crosswalk repainted/);
    expect(JSON.stringify(r)).not.toMatch(/Maya|Chris|Team 2/);
  });
});

describe('area alerts (Bhavana)', () => {
  const alert = data.areaAlerts[0];
  it('reach the people whose home is inside the circle', () => {
    expect(reaches(alert, resident)).toBe(true);
    expect(reaches(alert, lead)).toBe(false); // staff have no home in the demo
    const tiny = { ...alert, radiusM: 100 };
    expect(reaches(tiny, personaById('parent'))).toBe(false);
    expect(reachCount({ ...alert, audience: 'businesses' }, PERSONAS)).toBe(1);
  });
  it('need a title, a message and a place', () => {
    expect(validateAlert({ title: '', message: '', placeId: '', radiusM: 250, audience: 'everyone', until: '' })).toMatchObject({ title: expect.any(String), message: expect.any(String), placeId: expect.any(String) });
  });
});

describe('ward polls (Mounika)', () => {
  const poll = data.wardPolls[0];
  it('residents vote once; businesses and organizations cannot', () => {
    expect(canVote(poll, resident, t0).ok).toBe(true);
    expect(canVote(poll, business, t0).reason).toMatch(/Only residents/);
    expect(canVote(poll, personaById('school-staff'), t0).ok).toBe(false);
    expect(canVote({ ...poll, votedBy: ['profile-resident'] }, resident, t0).reason).toMatch(/You voted/);
    expect(canVote(poll, resident, new Date('2026-12-20')).reason).toMatch(/closed/);
  });
  it('results after voting, when closed, and always for the councillor', () => {
    expect(canSeeResults(poll, resident, t0)).toBe(false);
    expect(canSeeResults(poll, councillor, t0)).toBe(true);
    expect(canSeeResults({ ...poll, votedBy: ['profile-resident'] }, resident, t0)).toBe(true);
  });
  it('a question needs two different choices and a future closing date', () => {
    expect(validatePoll({ question: 'Which park first?', options: ['A', 'a'], closesOn: '2026-11-01', nextStep: '' }, t0)).toMatchObject({ options: expect.any(String), closesOn: expect.any(String) });
  });
});

describe('roadwork impact for businesses (Devu)', () => {
  it("Rosa's Bakery is about 20 m from the public sidewalk work; parks and the BIA office are not shops", () => {
    const impacts = roadworkImpacts(data.places, data.updates);
    expect(impacts[0]).toMatchObject({ placeId: 'place-01', roadworkId: 'update-01' });
    expect(impacts[0].metres).toBeLessThan(30);
    expect(impacts.some((i) => i.placeId === 'place-13')).toBe(false);
  });
});

describe('through the data adapter', () => {
  beforeEach(() => setClockForTests(() => t0));
  afterEach(() => {
    clearSubmittedReports();
    setClockForTests(null);
  });

  it('supporting puts the request in your list, tells the sender, and keeps you updated', async () => {
    expect((await getSupportable(resident)).some((s) => s.id === 'req-07')).toBe(true);
    expect((await getSupportable(parent)).some((s) => s.id === 'req-07')).toBe(false); // her own
    await actOnRequest('req-07', resident, 'support');
    expect((await getNotifications(parent)).some((n) => n.text === 'A neighbour added their support')).toBe(true);
    await actOnRequest('req-07', personaById('city-crew'), 'update', { text: 'Patched tonight.' });
    expect((await getNotifications(resident)).some((n) => n.text === 'City of Windsor 311 sent an update (you support it)')).toBe(true);
  });

  it('a public request without its own pin still shows on the map', async () => {
    const pin = (await getMapData()).updates.find((u) => u.id === 'issue-req-07');
    expect(pin).toMatchObject({ visibility: 'public', status: 'acknowledged' });
  });

  it('only the City, the BIA and the councillor send alerts; they reach people as notifications', async () => {
    await expect(sendAreaAlert(resident, { title: 'Test alert', message: 'Testing the alert reach.', placeId: 'place-01', radiusM: 100, audience: 'everyone', until: '' })).rejects.toThrow(/Only the City/);
    const a = await sendAreaAlert(lead, { title: 'Water shut-off', message: 'No water 9 am to 2 pm for repairs.', placeId: 'place-01', radiusM: 100, audience: 'everyone', until: '' });
    expect(alertReach(a)).toBe(2); // Rosa's Bakery and Maya (near Thompson Parkette) are within 100 m
    expect((await getNotifications(business)).some((n) => n.text === 'City of Windsor 311: Water shut-off')).toBe(true);
    expect((await getAlerts(resident)).received.some((x) => x.id === a.id)).toBe(false);
    expect((await getAlerts(lead)).sent[0].id).toBe(a.id);
  });

  it('the councillor asks, a resident votes once', async () => {
    await expect(createWardPoll(resident, { question: 'Which bench first?', options: ['A', 'B'], closesOn: '2026-11-30', nextStep: '' })).rejects.toThrow(/Only the ward councillor/);
    const p = await createWardPoll(councillor, { question: 'Which bench should be fixed first?', options: ['Parkette', 'Library'], closesOn: '2026-11-30', nextStep: '' });
    await voteWardPoll(resident, p.id, 'a');
    await expect(voteWardPoll(resident, p.id, 'b')).rejects.toThrow(/You voted/);
    expect((await getWardPolls())[0].options[0].votes).toBe(1);
  });

  it('only the business itself posts "We’re open", and it appears in the posts on the map', async () => {
    await expect(postOpenNotice(resident, 'place-01', "We're open as usual.")).rejects.toThrow(/Only the business/);
    await postOpenNotice(business, 'place-01', "Rosa's Bakery is open as usual. Use the side entrance.");
    expect((await getPosts()).some((p) => p.placeId === 'place-01' && p.name === "We're open during the roadwork")).toBe(true);
  });

  it('recently fixed lists public, resolved requests with the result', async () => {
    await actOnRequest('req-07', lead, 'resolve', { text: 'Pothole filled.' });
    const f = await getRecentlyFixed();
    expect(f[0]).toMatchObject({ id: 'req-07', done: 'Pothole filled.', neighbours: 2 });
  });
});
