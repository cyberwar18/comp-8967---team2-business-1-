// KAN-42 checks on the community workspace rules (Mounika).
import { describe, expect, it } from 'vitest';
import { getOrgEvents, getOrgMembers, getOrgPosts, getOrganizations, getVolunteerRoles } from '../../data/api';
import {
  EMPTY_DRAFT,
  approveEvent,
  buildEvent,
  canSeeEvent,
  canSeeMembers,
  canSignUp,
  cancelSignUp,
  canPost,
  buildPost,
  eventOnMap,
  memberFor,
  postIsActive,
  postsFor,
  validatePost,
  EMPTY_POST,
  eventsFor,
  filterMembers,
  membersOf,
  myMembership,
  roleCounts,
  signUp,
  spotsLeft,
  validateEvent,
  type CommunityData,
} from './communityData';

const ME = 'profile-resident';
const TODAY = new Date('2026-10-30T12:00:00');

async function load(): Promise<CommunityData> {
  const [organizations, members, roles, events, posts] = await Promise.all([getOrganizations(), getOrgMembers(), getVolunteerRoles(), getOrgEvents(), getOrgPosts()]);
  return { organizations, members, roles, events, posts };
}

describe('community data', () => {
  it('has a community organization, a food bank, a school and an institution', async () => {
    const d = await load();
    expect(d.organizations.map((o) => o.type).sort()).toEqual(['community', 'foodbank', 'institution', 'school']);
  });

  it('every member, role and event belongs to a real organization', async () => {
    const d = await load();
    const ids = new Set(d.organizations.map((o) => o.id));
    for (const x of [...d.members, ...d.roles, ...d.events]) expect(ids.has(x.orgId), x.id).toBe(true);
  });

  it('only members of the organization are on a sign-up list', async () => {
    const d = await load();
    for (const r of d.roles) {
      for (const id of r.signedUp) expect(d.members.find((m) => m.id === id)?.orgId, `${r.id} ${id}`).toBe(r.orgId);
      expect(r.signedUp.length).toBeLessThanOrEqual(r.spots);
    }
  });

  it('never makes contact details or addresses public', async () => {
    const d = await load();
    for (const x of [...d.organizations, ...d.members]) {
      expect(x.public.join(' '), x.id).not.toMatch(/contact|address/);
    }
  });

  it('brings in the map events that a group runs, marked as on the map', async () => {
    const d = await load();
    const market = d.events.find((e) => e.id === 'event-01');
    expect(market?.orgId).toBe('org-rnn');
    expect(market?.onMap).toBe(true);
  });
});

describe('who is acting', () => {
  it('finds the signed-in resident in the groups they joined', async () => {
    const d = await load();
    expect(myMembership(d, 'org-rnn', ME)?.role).toBe('volunteer');
    expect(myMembership(d, 'org-school', ME)).toBeUndefined();
  });

  it('an organizer from Viewing as is that member, only in their own group (KAN-48)', async () => {
    const d = await load();
    expect(memberFor(d, 'org-rnn', { profileId: 'mem-02', memberId: 'mem-02' })?.role).toBe('organizer');
    expect(memberFor(d, 'org-library', { profileId: 'mem-02', memberId: 'mem-02' })).toBeUndefined();
    expect(memberFor(d, 'org-rnn', { profileId: ME })?.role).toBe('volunteer');
  });

  it('only members can see the members list', async () => {
    const d = await load();
    expect(canSeeMembers(myMembership(d, 'org-rnn', ME))).toBe(true);
    expect(canSeeMembers(myMembership(d, 'org-school', ME))).toBe(false);
  });
});

describe('events stay private until approved', () => {
  it('hides a pending event from other members', async () => {
    const d = await load();
    const me = myMembership(d, 'org-rnn', ME);
    const potluck = d.events.find((e) => e.id === 'oe-02')!;
    expect(potluck.visibility).toBe('private until approved');
    expect(canSeeEvent(potluck, me)).toBe(false);
    expect(eventsFor(d, 'org-rnn', me).map((e) => e.id)).not.toContain('oe-02');
  });

  it('shows a pending event to the organizers', async () => {
    const d = await load();
    const org = memberFor(d, 'org-rnn', { profileId: 'mem-02', memberId: 'mem-02' });
    expect(eventsFor(d, 'org-rnn', org).map((e) => e.id)).toContain('oe-02');
  });

  it('lists events soonest first', async () => {
    const d = await load();
    const starts = eventsFor(d, 'org-rnn', undefined).map((e) => e.start);
    expect(starts).toEqual([...starts].sort());
  });

  it('a new event starts private and its creator can see it', async () => {
    const d = await load();
    const me = myMembership(d, 'org-rnn', ME);
    const ev = buildEvent({ ...EMPTY_DRAFT, name: ' Bulb planting ', date: '2026-11-08', start: '10:00' }, 'org-rnn', me, 'oe-x');
    expect(ev).toMatchObject({ name: 'Bulb planting', start: '2026-11-08T10:00', visibility: 'private until approved', status: 'pending', createdBy: me!.id });
    expect(canSeeEvent(ev, me)).toBe(true);
    expect(canSeeEvent(ev, undefined)).toBe(false);
  });

  it('only members can create events', async () => {
    const d = await load();
    expect(() => buildEvent({ ...EMPTY_DRAFT, name: 'x', date: '2026-11-08', start: '10:00' }, 'org-school', myMembership(d, 'org-school', ME), 'e')).toThrow();
  });

  it('an organizer can approve it; a volunteer cannot', async () => {
    const d = await load();
    const me = myMembership(d, 'org-rnn', ME);
    const org = memberFor(d, 'org-rnn', { profileId: 'mem-02', memberId: 'mem-02' });
    expect(approveEvent(d.events, 'oe-02', me).find((e) => e.id === 'oe-02')?.visibility).toBe('private until approved');
    const after = approveEvent(d.events, 'oe-02', org).find((e) => e.id === 'oe-02');
    expect(after).toMatchObject({ visibility: 'public', status: 'upcoming' });
    expect(canSeeEvent(after!, undefined)).toBe(true);
  });
});

describe('create event form', () => {
  it('asks for a name, a date and a start time', () => {
    expect(Object.keys(validateEvent(EMPTY_DRAFT, TODAY)).sort()).toEqual(['date', 'name', 'start']);
  });

  it('refuses past dates and an end before the start', () => {
    const e = validateEvent({ ...EMPTY_DRAFT, name: 'Walk', date: '2026-10-29', start: '18:00', end: '17:00' }, TODAY);
    expect(e.date).toMatch(/passed/);
    expect(e.end).toMatch(/after/);
  });

  it('accepts a good event today', () => {
    expect(validateEvent({ ...EMPTY_DRAFT, name: 'Walk', date: '2026-10-30', start: '18:00', end: '19:00' }, TODAY)).toEqual({});
  });

  it('limits the details to 300 characters', () => {
    expect(validateEvent({ ...EMPTY_DRAFT, name: 'Walk', date: '2026-11-01', start: '18:00', description: 'x'.repeat(301) }, TODAY).description).toBeTruthy();
  });
});

describe('volunteer sign-ups', () => {
  it('lets a member sign up once and cancel', async () => {
    const d = await load();
    const me = myMembership(d, 'org-rnn', ME);
    const before = d.roles.find((r) => r.id === 'vol-01')!;
    const signed = signUp(d.roles, 'vol-01', me);
    const after = signed.find((r) => r.id === 'vol-01')!;
    expect(spotsLeft(after)).toBe(spotsLeft(before) - 1);
    expect(canSignUp(after, me)).toBe(false); // no double sign-up
    expect(cancelSignUp(signed, 'vol-01', me).find((r) => r.id === 'vol-01')!.signedUp).toEqual(before.signedUp);
  });

  it('cannot sign up for a full role or as a non-member', async () => {
    const d = await load();
    const me = myMembership(d, 'org-rnn', ME);
    const full = d.roles.find((r) => r.id === 'vol-02')!;
    expect(spotsLeft(full)).toBe(0);
    expect(canSignUp(full, me)).toBe(false);
    expect(canSignUp(d.roles.find((r) => r.id === 'vol-05')!, myMembership(d, 'org-school', ME))).toBe(false);
  });
});

describe('members search reuses the map search', () => {
  it('matches every typed word in name, role or skills', async () => {
    const d = await load();
    const rnn = membersOf(d, 'org-rnn');
    expect(filterMembers(rnn, 'garden', 'all').map((m) => m.name)).toEqual(['Team 2 Group 10', 'Grace Liu (demo)']);
    expect(filterMembers(rnn, 'gardening photography', 'all').map((m) => m.name)).toEqual(['Grace Liu (demo)']);
    expect(filterMembers(rnn, 'zzz', 'all')).toEqual([]);
  });

  it('filters by role chip and counts each chip', async () => {
    const d = await load();
    const rnn = membersOf(d, 'org-rnn');
    expect(filterMembers(rnn, '', 'organizer').map((m) => m.name)).toEqual(['Priya Nair (demo)']);
    expect(roleCounts(rnn, '')).toEqual({ all: 6, organizer: 1, coordinator: 1, volunteer: 2, member: 2 });
  });
});

describe('the shared map (KAN-48)', () => {
  it('puts a public event with a place on the map until it ends', async () => {
    const d = await load();
    const coat = d.events.find((e) => e.id === 'oe-01')!; // Nov 14, community hall
    expect(eventOnMap(coat, new Date('2026-11-07T12:00:00'))).toBe(true);
    expect(eventOnMap(coat, new Date('2026-11-14T17:00:00'))).toBe(false); // over
    expect(eventOnMap(d.events.find((e) => e.id === 'oe-02')!, TODAY)).toBe(false); // still waiting for approval
    expect(eventOnMap(d.events.find((e) => e.id === 'oe-05')!, TODAY)).toBe(false); // no place on the corridor
  });

  it('shows a service change from its first to its last day', async () => {
    const d = await load();
    const closed = d.posts.find((p) => p.id === 'op-01')!; // Nov 6 to Nov 11
    expect(postIsActive(closed, new Date('2026-11-05T12:00:00'))).toBe(false);
    expect(postIsActive(closed, new Date('2026-11-11T20:00:00'))).toBe(true);
    expect(postIsActive(closed, new Date('2026-11-12T08:00:00'))).toBe(false);
    expect(postsFor(d, 'org-library', new Date('2026-11-12T08:00:00'))).toEqual([]); // drops off afterwards
  });

  it('only organizers of a group with a place on the map can post', async () => {
    const d = await load();
    const library = d.organizations.find((o) => o.id === 'org-library')!;
    const rnn = d.organizations.find((o) => o.id === 'org-rnn')!;
    expect(canPost(library, memberFor(d, 'org-library', { profileId: 'mem-12', memberId: 'mem-12' }))).toBe(true);
    expect(canPost(library, memberFor(d, 'org-library', { profileId: ME }))).toBe(false); // not a member
    expect(canPost(rnn, memberFor(d, 'org-rnn', { profileId: 'mem-02', memberId: 'mem-02' }))).toBe(false); // no place on the map
    expect(() => buildPost({ title: 'x', message: '', from: '2026-11-09', until: '2026-11-09' }, library, undefined, 'p')).toThrow();
  });

  it('checks the service change form', () => {
    expect(Object.keys(validatePost(EMPTY_POST, TODAY)).sort()).toEqual(['from', 'title', 'until']);
    expect(validatePost({ title: 'Closed', message: '', from: '2026-11-10', until: '2026-11-09' }, TODAY).until).toMatch(/on or after/);
    expect(validatePost({ title: 'Closed', message: '', from: '2026-10-01', until: '2026-10-02' }, TODAY).until).toMatch(/passed/);
    expect(validatePost({ title: 'Closed', message: '', from: '2026-11-09', until: '2026-11-09' }, TODAY)).toEqual({});
  });
});
