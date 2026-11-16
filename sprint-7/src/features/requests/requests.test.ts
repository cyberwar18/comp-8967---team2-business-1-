// Sprint 5 (Purab): the rules for one request, from the person who sends it to the organization and back.
import { describe, expect, it } from 'vitest';
import raw from '../../data/mock-data.json';
import { personaById } from './personas';
import {
  PermissionError,
  ValidationError,
  accessOf,
  accessSummary,
  applyAction,
  blockedEntry,
  can,
  canView,
  filterQueue,
  historyFor,
  queueCounts,
  requestFromReport,
  ringStatus,
  stepsOf,
  type ActionId,
  type ActionInput,
  type Persona,
  type ServiceRequest,
  type StaffMember,
} from './requests';

const data = raw as unknown as { requests: ServiceRequest[]; staff: StaffMember[]; profiles: { id: string; name: string }[] };
const staff = data.staff;
const orgs = Object.fromEntries(data.profiles.map((p) => [p.id, p.name]));
const seed = (id: string) => structuredClone(data.requests.find((r) => r.id === id)!);

const resident = personaById('resident');
const business = personaById('business');
const lead = personaById('city-lead');
const crew = personaById('city-crew');
const bia = personaById('bia-lead');
const councillor = personaById('councillor');

const t0 = new Date('2026-11-01T15:00:00Z');
const later = (days: number) => new Date(t0.getTime() + days * 86400000);
const act = (r: ServiceRequest, p: Persona, a: ActionId, input: ActionInput = {}, now = t0) => applyAction(r, p, a, input, staff, orgs, now);

/** The resident's street light request, received and assigned to the crew. */
function assigned(): ServiceRequest {
  let r = seed('req-issue-05');
  r = act(r, lead, 'acknowledge');
  return act(r, lead, 'assign', { assigneeId: 'staff-311-roads' });
}

describe('who can see a request', () => {
  it('the resident, City 311 staff and the councillor (copy) see the street light request; the BIA does not', () => {
    const r = seed('req-issue-05');
    expect(accessOf(resident, r, staff)).toBe('requester');
    expect(accessOf(lead, r, staff)).toBe('lead');
    expect(accessOf(crew, r, staff)).toBe('staff');
    expect(accessOf(councillor, r, staff)).toBe('copy');
    expect(canView(bia, r, staff)).toBe(false);
    expect(canView(business, r, staff)).toBe(false);
  });

  it("the business owner and the BIA see the bakery's request; the City does not", () => {
    const r = seed('req-issue-04');
    expect(accessOf(business, r, staff)).toBe('requester');
    expect(accessOf(bia, r, staff)).toBe('lead');
    expect(canView(lead, r, staff)).toBe(false);
    expect(canView(resident, r, staff)).toBe(false);
  });

  it('internal notes and blocked attempts are for staff only', () => {
    let r = assigned();
    r = act(r, crew, 'note', { text: 'Pole 4417, needs a bucket truck.' });
    r = { ...r, history: [...r.history, blockedEntry(crew, 'decline', 'Only the lead can decline.', t0)] };
    expect(historyFor(lead, r, staff).filter((h) => h.internal)).toHaveLength(2);
    expect(historyFor(resident, r, staff).some((h) => h.internal)).toBe(false);
    expect(historyFor(councillor, r, staff).some((h) => h.internal)).toBe(false);
  });

  it('the person who sent it sees the organization only: no staff names or job titles (Nigel, Nov 2)', () => {
    const rows = accessSummary(assigned(), staff, orgs, true).map((x) => x.who).join(' | ');
    expect(rows).toMatch(/City of Windsor 311/);
    expect(rows).not.toMatch(/Jordan|Sam|intake lead|crew/);
    expect(accessSummary(assigned(), staff, orgs).map((x) => x.who).join(' ')).toMatch(/Sam Patel/);
  });
});

describe('the City handles it', () => {
  it('the intake lead acknowledges and assigns; every step goes in the record', () => {
    const r = assigned();
    expect(r.state).toBe('assigned');
    expect(r.assigneeId).toBe('staff-311-roads');
    expect(r.history.map((h) => h.action)).toEqual(['created', 'acknowledge', 'assign']);
    expect(r.history[2].text).toMatch(/Sam Patel/);
  });

  it('the crew cannot assign, acknowledge or decline, and is told why', () => {
    const r = assigned();
    for (const a of ['assign', 'decline'] as ActionId[]) {
      const c = can(crew, r, a, staff, orgs);
      expect(c.ok).toBe(false);
      expect(c.reason).toMatch(/Only the City of Windsor 311 lead/);
    }
    expect(() => act(r, crew, 'decline', { text: 'Not our job at all.' })).toThrow(PermissionError);
  });

  it('only the person it is assigned to can update or resolve it', () => {
    const r = seed('req-issue-05'); // not assigned yet
    expect(can(crew, r, 'update', staff, orgs).reason).toMatch(/assigned to/);
    const done = act(assigned(), crew, 'resolve', { text: 'Lamp replaced.' });
    expect(done.state).toBe('resolved');
    expect(done.resolvedAt).toBe(t0.toISOString());
  });

  it('cannot assign to someone from another organization', () => {
    const r = act(seed('req-issue-05'), lead, 'acknowledge');
    expect(() => act(r, lead, 'assign', { assigneeId: 'staff-bia-support' })).toThrow(/your own team/);
  });

  it('a copy holder can read but change nothing', () => {
    const r = assigned();
    for (const a of ['update', 'resolve', 'note', 'publish'] as ActionId[]) {
      expect(can(councillor, r, a, staff, orgs).reason).toMatch(/copy to stay informed/);
    }
  });

  it('another organization cannot touch it', () => {
    expect(() => act(seed('req-issue-05'), bia, 'acknowledge')).toThrow(PermissionError);
  });
});

describe('more information needed', () => {
  it('asking a question waits for the resident; the answer sends it back to the crew', () => {
    let r = act(assigned(), crew, 'ask-info', { text: 'Which pole is it?' });
    expect(r.state).toBe('needs-info');
    expect(can(crew, r, 'reply', staff, orgs).ok).toBe(false); // only the requester answers
    r = act(r, resident, 'reply', { text: 'The one by the door.' });
    expect(r.state).toBe('assigned');
    expect(r.history.at(-1)).toMatchObject({ action: 'reply', text: 'The one by the door.' });
  });

  it("the resident can't reply when nobody asked", () => {
    expect(can(resident, assigned(), 'reply', staff, orgs).ok).toBe(false);
  });

  it('a question needs text', () => {
    expect(() => act(assigned(), crew, 'ask-info', { text: '  ' })).toThrow(ValidationError);
  });
});

describe('declined', () => {
  it('needs a real reason, and closes the request', () => {
    const r = seed('req-issue-05');
    expect(() => act(r, lead, 'decline', { text: 'No.' })).toThrow(/at least 10/);
    const d = act(r, lead, 'decline', { text: 'This light is on private property; please contact the owner.' });
    expect(d.state).toBe('declined');
    expect(can(lead, d, 'resolve', staff, orgs).ok).toBe(false);
  });

  it('the resident can still follow up, and the lead can reopen it', () => {
    const d = act(seed('req-issue-05'), lead, 'decline', { text: 'Private light, contact the owner.' });
    expect(act(d, resident, 'follow-up', { text: 'It is a City pole, number 4417.' }).state).toBe('declined');
    expect(act(d, lead, 'reopen-staff').state).toBe('reopened');
  });
});

describe('back to the resident', () => {
  it('can reopen within 14 days if the problem comes back, and the published outcome is taken down', () => {
    let r = act({ ...assigned(), public: true }, crew, 'resolve', { text: 'Lamp replaced.' });
    r = act(r, lead, 'publish', { text: 'Street light repaired.' });
    expect(r.outcome).toBe('Street light repaired.');
    const back = act(r, resident, 'reopen', { text: 'Out again.' }, later(3));
    expect(back.state).toBe('reopened');
    expect(back.outcome).toBeUndefined();
    expect(back.public).toBe(true); // still on the map: the sender chose that
    expect(can(lead, back, 'acknowledge', staff, orgs).ok).toBe(true);
  });

  it('cannot reopen after 14 days', () => {
    const r = act(assigned(), crew, 'resolve', { text: 'Lamp replaced.' });
    const c = can(resident, r, 'reopen', staff, orgs, later(15));
    expect(c.ok).toBe(false);
    expect(c.reason).toMatch(/14 days/);
  });

  it('can withdraw an open request, but not a resolved one', () => {
    expect(act(seed('req-issue-05'), resident, 'withdraw').state).toBe('withdrawn');
    expect(can(resident, act(assigned(), crew, 'resolve', { text: 'Done.' }), 'withdraw', staff, orgs).ok).toBe(false);
  });

  it("the resident can't take staff actions", () => {
    expect(can(resident, assigned(), 'resolve', staff, orgs).reason).toMatch(/Only City of Windsor 311/);
  });
});

describe('publishing the outcome', () => {
  it('never for a request the sender sent privately', () => {
    const done = act(assigned(), crew, 'resolve', { text: 'Fixed.' });
    expect(can(lead, done, 'publish', staff, orgs).reason).toMatch(/send this privately/);
  });

  it('only after it is resolved, and only by the lead, when the sender posted it to the map', () => {
    const r = { ...assigned(), public: true };
    expect(can(lead, r, 'publish', staff, orgs).reason).toMatch(/Resolve the request/);
    const done = act(r, crew, 'resolve', { text: 'Fixed.' });
    expect(can(crew, done, 'publish', staff, orgs).ok).toBe(false);
    const pub = act(done, lead, 'publish', { text: 'Street light repaired on Nov 3.' });
    expect(pub).toMatchObject({ public: true, outcome: 'Street light repaired on Nov 3.' });
    expect(can(lead, pub, 'publish', staff, orgs).reason).toMatch(/already on the map/);
    // Anyone can now see the outcome, but only the creation and the outcome in the record.
    expect(accessOf(bia, pub, staff)).toBe('public');
    expect(historyFor(bia, pub, staff).map((h) => h.action)).toEqual(['created', 'publish']);
  });
});

describe('the BIA loop (business -> BIA -> business)', () => {
  it('the coordinator assigns to business support, who answers and resolves', () => {
    let r = seed('req-09');
    r = act(r, bia, 'acknowledge');
    r = act(r, bia, 'assign', { assigneeId: 'staff-bia-support' });
    const support: Persona = { id: 'bia-support', label: 'Lee Chen (demo)', title: 'Business support officer', kind: 'staff', profileId: 'profile-bia', staffId: 'staff-bia-support' };
    r = act(r, support, 'update', { text: 'We asked bylaw to patrol 7 to 10 am this week.' });
    r = act(r, support, 'resolve', { text: 'Bylaw patrols added; signs updated.' });
    expect(r.state).toBe('resolved');
    expect(r.history.map((h) => h.action)).toEqual(['created', 'acknowledge', 'assign', 'update', 'resolve']);
  });
});

describe('helpers', () => {
  it('maps request states to the 3-step ring on the map', () => {
    expect(ringStatus('new')).toBe('reported');
    expect(ringStatus('needs-info')).toBe('acknowledged');
    expect(ringStatus('resolved')).toBe('resolved');
    expect(ringStatus('declined')).toBe('declined');
  });

  it('shows four steps with the current one marked', () => {
    expect(stepsOf(assigned()).map((s) => s.state)).toEqual(['done', 'done', 'current', 'todo']);
  });

  it('counts and filters the queue', () => {
    const list = data.requests.filter((r) => r.toProfile === 'profile-city');
    expect(queueCounts(list, t0)).toEqual({ new: 1, working: 1, waiting: 1, overdue: 3, closed: 2 });
    expect(filterQueue(list, 'mine', crew).map((r) => r.id).sort()).toEqual(['req-07', 'req-11', 'req-12']);
    expect(filterQueue(list, 'waiting', lead).map((r) => r.id)).toEqual(['req-08']);
  });

  it('turns a sent report into a new request', () => {
    const r = requestFromReport(
      { id: 'report-x', name: 'Pothole near the diner', category: 'Roads', placeId: 'place-05', reportedBy: 'profile-resident', routedToProfile: 'profile-city', ccProfile: 'profile-councillor' },
      'Team 2 Group 10',
      'resident',
      t0,
    );
    expect(r).toMatchObject({ id: 'req-report-x', issueId: 'report-x', state: 'new', toProfile: 'profile-city', public: false });
    expect(r.history).toHaveLength(1);
  });
});
