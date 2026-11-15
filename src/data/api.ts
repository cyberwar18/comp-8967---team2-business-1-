// Mock-data adapter (Purab).
// Every screen gets its data through these functions, never by importing the JSON file.
// When Neighbr's real backend is ready, only this file changes: swap each body for a
// fetch() call to the API. The screens keep calling the same functions.
//
// The functions are async on purpose, so screens already handle data that arrives later.
import raw from './mock-data.json';
import type { MapItem, MockData } from '../features/search/filters';
import type { WardArea } from '../features/map/types';
import {
  canApprove,
  canPost,
  eventOnMap,
  postIsActive,
  type OrgEvent,
  type OrgMember,
  type OrgPost,
  type Organization,
  type VolunteerRole,
} from '../features/community/communityData';
import {
  PermissionError,
  accessOf,
  applyAction,
  blockedEntry,
  canView,
  historyFor,
  STATE_LABEL,
  requestFromReport,
  ringStatus,
  type ActionId,
  type ActionInput,
  type OrgNames,
  type Persona,
  type ServiceRequest,
  type StaffMember,
} from '../features/requests/requests';
import { canSeeNotice, type Notice, type School } from '../features/school/schoolData';
import {
  OPEN_NOTICE_MAX,
  canAskWard,
  canSendAlerts,
  canVote,
  isCurrent,
  reaches,
  validateAlert,
  validatePoll,
  type AlertDraft,
  type AreaAlert,
  type PollDraft,
  type WardPoll,
} from '../features/updates/neighbourhood';
import { PERSONAS } from '../features/requests/personas';

export interface Profile {
  id: string;
  kind: 'profile';
  role: 'resident' | 'business' | 'bia' | 'ngo' | 'councillor' | 'city' | 'mp' | 'school' | 'institution'; // responders added in KAN-36; school, institution in Sprint 6
  name: string;
  badge?: string;
  area?: string;
  bio: string;
  placeId?: string;
  public: string[];
  private: string[];
  illustrative: boolean;
  [extra: string]: unknown;
}

/** A business offer (Bhavana, task 11). Offers have no pin of their own: placeId points to the shop. */
export interface Offer {
  id: string;
  kind: 'offer';
  name: string;
  placeId: string;
  validUntil: string;
  description?: string;
  illustrative: boolean;
}

interface RawData extends MockData {
  profiles: Profile[];
  offers?: Offer[];
  posts?: MapItem[]; // business posts (public ones are drawn on the map)
  polls?: MapItem[]; // BIA polls with demo voting
  wards?: WardArea[]; // ward / council areas, drawn as an outline
  // KAN-42 (Mounika): community organizations, schools and institutions
  organizations?: Organization[];
  schools?: School[]; // KAN-43
  schoolNotices?: Notice[]; // KAN-43
  orgMembers?: OrgMember[];
  volunteerRoles?: VolunteerRole[];
  orgEvents?: OrgEvent[];
  orgPosts?: OrgPost[]; // KAN-48: service changes (the library)
  // Sprint 5 (Purab): staff accounts and the requests they handle (simulated)
  staff?: StaffMember[];
  requests?: ServiceRequest[];
  // Sprint 6: the Updates section
  wardPolls?: WardPoll[];
  areaAlerts?: AreaAlert[];
}

const data = raw as unknown as RawData;

// The signed-in person in the demo. Login is simulated in the shell.
const DEMO_USER_ID = 'profile-resident';

// KAN-35: reports sent from "Report a problem" during this visit. Kept in memory for the demo
// (Sprint 6: also saved in the browser, see the end of this file); with a real backend, submitReport becomes a POST and the list comes back
// from getMapData.
const submitted: MapItem[] = [];
const listeners = new Set<() => void>();

/** Everything the map and the search panel need: places, events, updates, issues and chips. */
export async function getMapData(): Promise<MockData> {
  // A fresh object each time, so screens notice new reports and status changes.
  // KAN-48 (Mounika): approved community events and library service changes join the shared map
  // while they are current, then drop off (Nigel, Nov 2: map items stay a while, then disappear).
  const now = clock();
  return { ...data, events: [...data.events, ...communityEventPins(now)], updates: [...servicePins(now), ...allIssues()] }; // new reports stay last
}

export async function getPlaces(): Promise<MapItem[]> {
  return data.places;
}

export async function getEvents(): Promise<MapItem[]> {
  return data.events;
}

/** Public updates and issues (they share one list in the data). */
export async function getUpdates(): Promise<MapItem[]> {
  return allIssues();
}

/**
 * Send a report (KAN-35). The report is built and routed in features/report/routing.ts;
 * this only stores it and tells the screens that the data changed.
 * Real backend: POST /reports, then notify.
 */
export async function submitReport(report: MapItem): Promise<MapItem> {
  if (!report.id || report.kind !== 'issue') throw new Error('submitReport expects an issue with an id');
  if ([...data.updates, ...submitted].some((u) => u.id === report.id)) throw new Error(`Report ${report.id} already exists`);
  submitted.push(report);
  // Sprint 5: every report also becomes a request that the receiving organization works on.
  if (report.routedToProfile && report.reportedBy) {
    const sender = data.profiles.find((p) => p.id === report.reportedBy);
    const req = requestFromReport(
      report as Parameters<typeof requestFromReport>[0],
      (report.senderName as string | undefined) ?? sender?.name ?? 'Resident',
      // Sprint 6: organizations (BIA, school, community group, library) send requests like anyone else.
      sender?.role === 'business' ? 'business' : !sender || sender.role === 'resident' ? 'resident' : 'organization',
      clock(),
    );
    // KAN-48: a community group member can send a request for their group. It still comes from the person.
    if (typeof report.onBehalfOf === 'string') req.onBehalfOf = report.onBehalfOf;
    requests.push(req);
  }
  notify();
  return report;
}

/** Call `fn` whenever the data changes (for example after a report is sent). Returns an unsubscribe function. */
export function onDataChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Tests only: forget reports sent during a test. */
export function clearSubmittedReports(): void {
  submitted.length = 0;
  resetRequests();
}

export async function getProfiles(): Promise<Profile[]> {
  return data.profiles;
}

/** Business offers, shown in the Around you list and on each shop's card. */
export async function getOffers(): Promise<Offer[]> {
  return data.offers ?? [];
}

/** Business posts. Private drafts are in the list too; the map drops them (see features/map/extras.ts). */
export async function getPosts(): Promise<MapItem[]> {
  return [...(data.posts ?? []), ...extraPosts];
}

/** BIA polls (Devu, demo voting on the map). */
export async function getPolls(): Promise<MapItem[]> {
  return data.polls ?? [];
}

/** The ward / council area where resident reports go (drawn as an outline). */
export async function getWards(): Promise<WardArea[]> {
  return data.wards ?? [];
}

/** The demo person shown as signed in, in the top bar. */
export async function getCurrentUser(): Promise<Profile> {
  const me = data.profiles.find((p) => p.id === DEMO_USER_ID);
  if (!me) throw new Error(`Demo user ${DEMO_USER_ID} is missing from mock-data.json`);
  return me;
}

// ---- KAN-42 (Mounika): community organization workspace ----
// Read-only for now. Events made in the workspace and volunteer sign-ups are kept in the
// page's memory for the demo; with a real backend they become POST calls here.

/** Community organizations, food banks, schools and institutions. */
export async function getOrganizations(): Promise<Organization[]> {
  return data.organizations ?? [];
}

/** Everyone who belongs to an organization, with their role. */
export async function getOrgMembers(): Promise<OrgMember[]> {
  return data.orgMembers ?? [];
}

/** Volunteer roles that organizations are looking to fill. */
export async function getVolunteerRoles(): Promise<VolunteerRole[]> {
  return data.volunteerRoles ?? [];
}

/** Events created in a workspace, plus the public map events that an organization runs (orgId). */
export async function getOrgEvents(): Promise<OrgEvent[]> {
  return allOrgEvents();
}

// KAN-48: events created and approved during this visit, and service changes posted. Kept in memory
// for the demo (gone after a refresh). Real backend: POST /org-events, POST /org-events/:id/approve,
// POST /org-posts, and the server checks the same rules again.
const sessionEvents: OrgEvent[] = [];
const approvedIds = new Set<string>();
const sessionPosts: OrgPost[] = [];

function allOrgEvents(): OrgEvent[] {
  const fromMap = data.events
    .filter((e) => typeof e.orgId === 'string')
    .map((e) => ({
      id: e.id,
      kind: 'org-event' as const,
      orgId: e.orgId as string,
      name: e.name,
      category: e.category,
      start: String(e.start ?? ''),
      end: e.end ? String(e.end) : undefined,
      placeId: e.placeId ?? null,
      createdBy: null,
      visibility: 'public',
      status: e.status === 'past' ? 'past' : 'upcoming',
      onMap: true,
      illustrative: true,
    })) as OrgEvent[];
  const made = [...(data.orgEvents ?? []), ...sessionEvents].map((e) =>
    approvedIds.has(e.id) ? { ...e, visibility: 'public' as const, status: 'upcoming' as const } : e,
  );
  return [...fromMap, ...made];
}

/** A member creates an event. It always starts private until an organizer approves it. */
export async function submitOrgEvent(ev: OrgEvent): Promise<OrgEvent> {
  if (ev.visibility !== 'private until approved') throw new Error('New events start private until approved');
  if (allOrgEvents().some((e) => e.id === ev.id)) throw new Error(`Event ${ev.id} already exists`);
  sessionEvents.push(ev);
  notify();
  return ev;
}

/** An organizer approves a pending event; it becomes public and, if it has a place, a pin on the map. */
export async function approveOrgEvent(id: string, viewer: OrgMember | undefined): Promise<OrgEvent> {
  const ev = allOrgEvents().find((e) => e.id === id);
  if (!ev) throw new Error(`Event ${id} not found`);
  if (!canApprove(ev, viewer)) throw new Error('Only an organizer of this group can approve its events');
  approvedIds.add(id);
  notify();
  return { ...ev, visibility: 'public', status: 'upcoming' };
}

/** Service changes posted by organizations (current, coming and past). */
export async function getOrgPosts(): Promise<OrgPost[]> {
  return [...(data.orgPosts ?? []), ...sessionPosts];
}

/** An organizer posts a service change. It is public and goes on the map at the organization's location. */
export async function submitOrgPost(post: OrgPost, poster: OrgMember | undefined): Promise<OrgPost> {
  const org = (data.organizations ?? []).find((o) => o.id === post.orgId);
  if (!canPost(org, poster)) throw new Error('Only organizers can post service changes');
  sessionPosts.push(post);
  notify();
  return post;
}

function placeOf(id: string | null | undefined): MapItem | undefined {
  return id ? data.places.find((p) => p.id === id) : undefined;
}

/** Approved community events with a place, as event pins (a little off the place so they don't overlap). */
function communityEventPins(now: Date): MapItem[] {
  const orgs = data.organizations ?? [];
  return allOrgEvents()
    .filter((e) => !e.onMap && eventOnMap(e, now))
    .flatMap((e, i) => {
      const place = placeOf(e.placeId);
      if (typeof place?.lat !== 'number' || typeof place?.lng !== 'number') return [];
      const org = orgs.find((o) => o.id === e.orgId);
      return [
        {
          id: e.id,
          kind: 'event',
          chip: 'events',
          name: e.name,
          category: `${e.category} · ${(org?.name ?? '').replace(/\s*\(demo\)/, '')}`,
          status: 'upcoming',
          start: e.start,
          end: e.end,
          lat: (place.lat as number) - 0.00007 * (i + 1),
          lng: (place.lng as number) + 0.00005 * (i + 1),
          placeId: e.placeId,
          orgId: e.orgId,
          description: e.description,
          illustrative: true,
        } as MapItem,
      ];
    });
}

/** Current service changes from organizations with a place on the map, as public update pins. */
function servicePins(now: Date): MapItem[] {
  const orgs = data.organizations ?? [];
  return [...(data.orgPosts ?? []), ...sessionPosts]
    .filter((p) => postIsActive(p, now))
    .flatMap((p) => {
      const org = orgs.find((o) => o.id === p.orgId);
      if (!org?.location) return [];
      return [
        {
          id: p.id,
          kind: 'update',
          chip: 'updates',
          name: p.title,
          category: 'Service change',
          status: 'published',
          description: `${(org.name ?? '').replace(/\s*\(demo\)/, '')}: ${p.message || p.title} Shown until ${new Date(`${p.until}T12:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}.`,
          lat: org.location.lat,
          lng: org.location.lng,
          placeId: null,
          orgId: p.orgId,
          visibility: 'public',
          updatedAt: p.from,
          illustrative: true,
        } as MapItem,
      ];
    });
}

function resetCommunity() {
  sessionEvents.length = 0;
  approvedIds.clear();
  sessionPosts.length = 0;
}

// ---- Sprint 5 (Purab): requests, from the person who sends them to the organization and back ----
// Kept in memory for the demo (reset on refresh). With a real backend:
//   getRequests -> GET /requests (the server only returns what this person may see)
//   actOnRequest -> POST /requests/:id/actions (the server checks the same permissions again)

const seedRequests = (): ServiceRequest[] => JSON.parse(JSON.stringify(data.requests ?? []));
let requests: ServiceRequest[] = seedRequests();
/** Changes to map items caused by requests (status, visibility, published outcome). */
const issuePatch = new Map<string, Partial<MapItem>>();
/** Pins created when an outcome is published for a request that had no pin. */
const outcomePins: MapItem[] = [];
let clock = () => new Date();

function notify() {
  saveDemo();
  listeners.forEach((fn) => fn());
}

function allIssues(): MapItem[] {
  return [...data.updates, ...publicRequestPins(), ...submitted, ...outcomePins]
    .map((u) => (issuePatch.has(u.id) ? { ...u, ...issuePatch.get(u.id) } : u))
    .map(withRequestInfo);
}

/**
 * Sprint 6 (Devu, KAN-47): every pin that belongs to a request carries where that request is now, so the
 * map can show it. `requestState` is the request's own state in words ("Being handled", "Needs more info").
 * Only a PUBLISHED outcome carries the outcome text, who handled it and when. Nothing about who sent
 * the request, and never the sender's original message, so a published outcome stays anonymous.
 */
function withRequestInfo(u: MapItem): MapItem {
  const r = requests.find((x) => x.issueId === u.id || `issue-${x.id}` === u.id);
  if (!r) return u;
  const info: Partial<MapItem> = { requestState: STATE_LABEL[r.state], requestId: r.id };
  if (r.public && r.outcome && r.state === 'resolved') {
    // a reopened request is no longer "done", so its old outcome is not shown as one
    info.outcome = r.outcome;
    info.outcomeAt = (r.updatedAt ?? '').slice(0, 10);
    info.handledBy = (orgNames()[r.toProfile] ?? '').replace(/\s*\(demo\)/, '');
  }
  return { ...u, ...info };
}

/** Sprint 6: requests posted to the map that have no pin of their own (e.g. sample requests) get one. */
function publicRequestPins(): MapItem[] {
  return requests
    .filter((r) => r.public && !r.issueId)
    .map((r) => {
      const place = data.places.find((p) => p.id === r.placeId);
      if (!place) return null;
      return {
        id: `issue-${r.id}`,
        kind: 'issue',
        chip: 'issues',
        name: r.title,
        category: r.category,
        status: ringStatus(r.state),
        lat: r.point ? r.point[1] : (place.lat as number) + 0.00006,
        lng: r.point ? r.point[0] : (place.lng as number),
        placeId: r.placeId ?? null,
        reportedBy: r.requesterId,
        visibility: 'public',
        description: r.outcome ? `Outcome: ${r.outcome}` : r.description,
        updatedAt: r.updatedAt.slice(0, 10),
        illustrative: true,
      } as MapItem;
    })
    .filter((x): x is MapItem => x !== null);
}

function resetRequests() {
  requests = seedRequests();
  issuePatch.clear();
  outcomePins.length = 0;
  readNotes.clear();
  wardPolls = seedPolls();
  areaAlerts = seedAlerts();
  extraPosts.length = 0;
  resetCommunity();
  postedNotices.length = 0;
  try {
    localStorage.removeItem(DEMO_KEY);
  } catch {
    /* storage blocked: nothing to clear */
  }
}

/** Names of the organizations, for messages like "Only City of Windsor 311 can change this". */
export function orgNames(): OrgNames {
  return Object.fromEntries(data.profiles.map((p) => [p.id, p.name]));
}

/** Staff accounts at the City and the BIA (simulated). */
export async function getStaff(): Promise<StaffMember[]> {
  return data.staff ?? [];
}

/**
 * The requests this person is part of: ones they sent, ones their organization handles, and ones
 * they get a copy of. A published outcome is public, but it is seen on the map, not here, so other
 * organizations never get someone else's request (or the name of who sent it) in their queue.
 */
export async function getRequests(persona: Persona): Promise<ServiceRequest[]> {
  const staff = data.staff ?? [];
  return requests
    .filter((r) => !['none', 'public'].includes(accessOf(persona, r, staff)))
    // Only the record lines this person may read: internal notes and blocked attempts stay with staff.
    .map((r) => ({ ...r, history: historyFor(persona, r, staff) }));
}

/**
 * Take an action on a request (acknowledge, assign, reply, reopen...).
 * The rules are in features/requests/requests.ts. A refused attempt is written to the record
 * (staff only) and the error is passed on, so the screen can say why.
 */
export async function actOnRequest(id: string, persona: Persona, action: ActionId, input: ActionInput = {}): Promise<ServiceRequest> {
  const i = requests.findIndex((r) => r.id === id);
  if (i < 0) throw new Error(`Request ${id} not found`);
  const staff = data.staff ?? [];
  const now = clock();
  let next: ServiceRequest;
  try {
    next = applyAction(requests[i], persona, action, input, staff, orgNames(), now);
  } catch (e) {
    if (e instanceof PermissionError && canView(persona, requests[i], staff)) {
      requests[i] = { ...requests[i], history: [...requests[i].history, blockedEntry(persona, action, e.message, now)] };
      notify();
    }
    throw e;
  }
  if (action === 'publish' && !next.issueId) next = { ...next, issueId: addOutcomePin(next) };
  requests[i] = next;
  patchIssue(next);
  notify();
  return { ...next, history: [...next.history] };
}

function patchIssue(r: ServiceRequest) {
  if (!r.issueId) return;
  const patch: Partial<MapItem> = { status: ringStatus(r.state), updatedAt: r.updatedAt.slice(0, 10) };
  // Sprint 6: the sender chose "Post to the map" (public) or "Send privately".
  patch.visibility = r.public ? 'public' : 'private until approved';
  if (r.outcome) patch.description = `Outcome: ${r.outcome}`;
  issuePatch.set(r.issueId, patch);
}

function addOutcomePin(r: ServiceRequest): string {
  const place = data.places.find((p) => p.id === r.placeId);
  const id = `issue-${r.id}`;
  outcomePins.push({
    id,
    kind: 'issue',
    chip: 'issues',
    name: r.title,
    category: r.category,
    status: 'resolved',
    lat: typeof place?.lat === 'number' ? (place.lat as number) + 0.00006 : undefined,
    lng: place?.lng,
    placeId: r.placeId ?? null,
    reportedBy: r.requesterId,
    visibility: 'public',
    updatedAt: r.updatedAt.slice(0, 10),
    illustrative: true,
  } as MapItem);
  return id;
}

/** Tests only: fix "now" so dates in the record are predictable. */
export function setClockForTests(fn: (() => Date) | null): void {
  clock = fn ?? (() => new Date());
}

// ---- KAN-43 (Devu): school workspace ----
// Read-only for now. Notices staff post in the workspace are kept in the page's memory for the demo;
// with a real backend they become POST calls here.

/** Schools near the corridor: location, safe walking routes and crosswalks. */
export async function getSchools(): Promise<School[]> {
  return data.schools ?? [];
}

/** Notices and events a school has posted, each with the audience that may see it. */
export async function getSchoolNotices(): Promise<Notice[]> {
  return [...(data.schoolNotices ?? []), ...postedNotices];
}

// Sprint 6: notices school staff post are kept here (not in the page), so they are still there when
// "Viewing as" changes to a parent, and parents get a notification. Real backend: POST /schools/:id/notices.
const postedNotices: Notice[] = [];

/** School staff post a notice or event for an audience (public, all parents, one grade). */
export async function postSchoolNotice(persona: Persona | undefined, notice: Notice): Promise<Notice> {
  if (persona?.schoolRole !== 'staff') throw new PermissionError('Only school staff can post school notices.');
  if ([...(data.schoolNotices ?? []), ...postedNotices].some((n) => n.id === notice.id)) throw new Error(`Notice ${notice.id} already exists`);
  postedNotices.push(notice);
  notify();
  return notice;
}

/** Notices for parents (not the public ones) from the last two weeks, for a parent's notifications. */
function parentNotices(persona: Persona): Notice[] {
  if (persona.schoolRole !== 'parent') return [];
  const school = (data.schools ?? [])[0];
  if (!school) return [];
  const viewer = { role: 'parent' as const, grades: school.demo.parentGrades };
  const since = new Date(clock().getTime() - 14 * 86_400_000).toISOString().slice(0, 10);
  return [...(data.schoolNotices ?? []), ...postedNotices].filter((n) => n.schoolId === school.id && n.audience !== 'public' && canSeeNotice(n, viewer) && n.posted >= since);
}

// ---- Sprint 6 (Bhavana): notifications for the person who sent a request ----
// Built from the record: every update from the organization (or a comment from the councillor)
// on a request you sent. With a real backend these would be pushed, or sent by email.

export interface DemoNotification {
  id: string;
  requestId: string;
  /** Where clicking it goes. */
  href: string;
  title: string;
  text: string;
  at: string;
  read: boolean;
}

const readNotes = new Set<string>();

const NOTE_TEXT: Partial<Record<ActionId, (org: string, by: string) => string>> = {
  acknowledge: (org) => `${org} received your request`,
  assign: (org) => `${org} is working on it`,
  update: (org) => `${org} sent an update`,
  'ask-info': (org) => `${org} asked you a question`,
  resolve: (org) => `${org} marked it resolved`,
  decline: (org) => `${org} declined it`,
  publish: (org) => `${org} posted the outcome on the map`,
  'reopen-staff': (org) => `${org} reopened it`,
  comment: (_org, by) => `${by} commented`,
};

/** Notifications for this person, newest first. Only the person who sent a request gets them. */
export async function getNotifications(persona: Persona): Promise<DemoNotification[]> {
  const orgs = orgNames();
  const plain = (n: string) => n.replace(/\s*\(demo\)/, '');
  const out: DemoNotification[] = [];
  for (const r of requests) {
    const sender = r.requesterId === persona.profileId;
    const supporter = r.supporters?.includes(persona.profileId);
    if (!sender && !supporter) continue;
    // Supporters hear about what happens after they added their support.
    const since = supporter ? (r.history.find((h) => h.action === 'support' && h.byId === persona.profileId)?.at ?? '') : '';
    r.history.forEach((h, i) => {
      if (h.action === 'support' && sender) {
        const id = `${r.id}#${i}`;
        out.push({ id, requestId: r.id, href: `#/requests?id=${encodeURIComponent(r.id)}`, title: r.title, text: 'A neighbour added their support', at: h.at, read: readNotes.has(id) });
        return;
      }
      const make = NOTE_TEXT[h.action as ActionId];
      if (!make || h.internal || h.byId === r.requesterId || h.at < since) return;
      const id = `${r.id}#${i}`;
      const org = plain(orgs[r.toProfile] ?? 'They');
      let text = h.action === 'assign' && h.text?.startsWith('Moved from') ? `${org} passed it to another team` : make(org, plain(h.byName));
      if (!sender) text = text.replace(/ your request$/, ' the request') + ' (you support it)';
      out.push({ id, requestId: r.id, href: `#/requests?id=${encodeURIComponent(r.id)}`, title: r.title, text, at: h.at, read: readNotes.has(id) });
    });
  }
  // Sprint 6 (Bhavana): area alerts that reach this person.
  for (const a of areaAlerts) {
    if (!isCurrent(a, clock()) || !reaches(a, persona)) continue;
    const id = `alert:${a.id}`;
    out.push({ id, requestId: '', href: '#/updates', title: a.message, text: `${plain(a.fromName)}: ${a.title}`, at: a.createdAt, read: readNotes.has(id) });
  }
  // Sprint 6 (Devu's school section): notices for parents reach the parent's notifications.
  for (const n of parentNotices(persona)) {
    const id = `notice:${n.id}`;
    const school = plain((data.schools ?? [])[0]?.name ?? 'The school');
    out.push({ id, requestId: '', href: '#/community', title: n.title, text: `${school}: new ${n.type === 'event' ? 'event' : 'notice'} for parents`, at: `${n.posted}T08:00:00.000Z`, read: readNotes.has(id) });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/** Mark one notification as read (area alerts, when clicked). */
export function markNotificationRead(id: string): void {
  if (readNotes.has(id)) return;
  readNotes.add(id);
  notify();
}

/** Mark notifications as read (all of one request's, when it is opened). */
export function markRequestRead(persona: Persona, requestId: string): void {
  const r = requests.find((x) => x.id === requestId);
  if (!r) return;
  let changed = false;
  if (r.requesterId !== persona.profileId && !r.supporters?.includes(persona.profileId)) return;
  r.history.forEach((_h, i) => {
    const id = `${r.id}#${i}`;
    if (!readNotes.has(id)) {
      readNotes.add(id);
      changed = true;
    }
  });
  if (changed) notify();
}

// ---- Sprint 6 (Purab): keep the demo after a refresh, and Reset demo ----
// Saved in this browser only. A tester can refresh mid-journey and carry on; Reset demo goes back
// to the sample data. If storage is blocked, the demo still works (it just won't survive a refresh).

const DEMO_KEY = 'pinpoint-demo-v1';

function saveDemo() {
  try {
    localStorage.setItem(
      DEMO_KEY,
      JSON.stringify({ submitted, requests, patches: [...issuePatch], outcomePins, read: [...readNotes], wardPolls, areaAlerts, extraPosts, community: { events: sessionEvents, approved: [...approvedIds], posts: sessionPosts }, schoolNotices: postedNotices }),
    );
  } catch {
    /* storage full or blocked: keep going without saving */
  }
}

function loadDemo() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved.submitted)) submitted.push(...saved.submitted);
    if (Array.isArray(saved.requests)) requests = saved.requests;
    if (Array.isArray(saved.patches)) saved.patches.forEach(([k, v]: [string, Partial<MapItem>]) => issuePatch.set(k, v));
    if (Array.isArray(saved.outcomePins)) outcomePins.push(...saved.outcomePins);
    if (Array.isArray(saved.read)) saved.read.forEach((id: string) => readNotes.add(id));
    if (Array.isArray(saved.wardPolls)) wardPolls = saved.wardPolls;
    if (Array.isArray(saved.areaAlerts)) areaAlerts = saved.areaAlerts;
    if (Array.isArray(saved.extraPosts)) extraPosts.push(...saved.extraPosts);
    // KAN-48 (Mounika): events made and approved, and service changes posted, in this browser
    if (Array.isArray(saved.community?.events)) sessionEvents.push(...saved.community.events);
    if (Array.isArray(saved.community?.approved)) saved.community.approved.forEach((id: string) => approvedIds.add(id));
    if (Array.isArray(saved.community?.posts)) sessionPosts.push(...saved.community.posts);
    if (Array.isArray(saved.schoolNotices)) postedNotices.push(...saved.schoolNotices);
  } catch {
    /* nothing saved, or saved data from an older version: start from the sample data */
  }
}

/** Reset demo: forget everything done in this browser and go back to the sample data. */
export function resetDemo(): void {
  submitted.length = 0;
  resetRequests();
  listeners.forEach((fn) => fn());
}

// ---- Sprint 6: the Updates section (area alerts, ward polls, "We're open" notices) and "Me too" ----

const seedPolls = (): WardPoll[] => JSON.parse(JSON.stringify(data.wardPolls ?? []));
const seedAlerts = (): AreaAlert[] => JSON.parse(JSON.stringify(data.areaAlerts ?? []));
let wardPolls: WardPoll[] = seedPolls();
let areaAlerts: AreaAlert[] = seedAlerts();
const extraPosts: MapItem[] = [];
let idCounter = 0;
const newId = (prefix: string) => `${prefix}-${clock().getTime().toString(36)}-${++idCounter}`;

/** Bhavana: alerts this person received, and the ones their organization sent. */
export async function getAlerts(persona: Persona): Promise<{ received: AreaAlert[]; sent: AreaAlert[] }> {
  const now = clock();
  const byNewest = (a: AreaAlert, b: AreaAlert) => b.createdAt.localeCompare(a.createdAt);
  return {
    received: areaAlerts.filter((a) => isCurrent(a, now) && reaches(a, persona)).sort(byNewest),
    sent: areaAlerts.filter((a) => a.fromProfile === persona.profileId).sort(byNewest),
  };
}

/** Bhavana: send an alert to everyone in a circle around a place. Only the City lead, the BIA coordinator and the councillor. */
export async function sendAreaAlert(persona: Persona, draft: AlertDraft): Promise<AreaAlert> {
  if (!canSendAlerts(persona)) throw new PermissionError('Only the City, the BIA coordinator and the ward councillor can send area alerts.');
  const errors = validateAlert(draft);
  const first = Object.values(errors)[0];
  if (first) throw new Error(first);
  const place = data.places.find((p) => p.id === draft.placeId)!;
  const alert: AreaAlert = {
    id: newId('alert'),
    fromProfile: persona.profileId,
    fromName: orgNames()[persona.profileId] ?? persona.label,
    title: draft.title.trim(),
    message: draft.message.trim(),
    placeId: draft.placeId,
    center: [place.lng as number, place.lat as number],
    radiusM: draft.radiusM,
    audience: draft.audience,
    until: draft.until || undefined,
    createdAt: clock().toISOString(),
    illustrative: true,
  };
  areaAlerts.push(alert);
  notify();
  return alert;
}

/** The people (demo accounts) an alert reaches, for "Reaches 4 people" before sending. */
export function alertReach(alert: Pick<AreaAlert, 'center' | 'radiusM' | 'audience' | 'fromProfile'>): number {
  return PERSONAS.filter((p) => reaches({ ...alert, id: '', fromName: '', title: '', message: '', placeId: '', createdAt: '' }, p)).length;
}

/** Mounika: the ward's polls. */
export async function getWardPolls(): Promise<WardPoll[]> {
  return wardPolls.map((p) => ({ ...p, options: p.options.map((o) => ({ ...o })), votedBy: [...p.votedBy] }));
}

/** Mounika: the councillor asks the ward a question. */
export async function createWardPoll(persona: Persona, draft: PollDraft): Promise<WardPoll> {
  if (!canAskWard(persona)) throw new PermissionError('Only the ward councillor can ask the ward.');
  const errors = validatePoll(draft, clock());
  const first = Object.values(errors)[0];
  if (first) throw new Error(first);
  const poll: WardPoll = {
    id: newId('wpoll'),
    wardId: 'ward-demo',
    question: draft.question.trim(),
    options: draft.options.map((o) => o.trim()).filter(Boolean).map((label, i) => ({ id: String.fromCharCode(97 + i), label, votes: 0 })),
    closesOn: draft.closesOn,
    nextStep: draft.nextStep.trim() || undefined,
    createdBy: persona.profileId,
    votedBy: [],
    createdAt: clock().toISOString(),
    illustrative: true,
  };
  wardPolls.unshift(poll);
  notify();
  return poll;
}

/** Mounika: vote once, residents of the ward only. */
export async function voteWardPoll(persona: Persona, pollId: string, optionId: string): Promise<WardPoll> {
  const poll = wardPolls.find((p) => p.id === pollId);
  if (!poll) throw new Error('Poll not found');
  const check = canVote(poll, persona, clock());
  if (!check.ok) throw new PermissionError(check.reason!);
  const option = poll.options.find((o) => o.id === optionId);
  if (!option) throw new Error('Choose one of the options.');
  option.votes += 1;
  poll.votedBy.push(persona.profileId);
  notify();
  return poll;
}

/** Devu: a business near roadwork posts "We're open" to the map (Business posts layer). */
export async function postOpenNotice(persona: Persona, placeId: string, text: string): Promise<MapItem> {
  const me = data.profiles.find((p) => p.id === persona.profileId);
  if (persona.reportMode !== 'business' || me?.placeId !== placeId) throw new PermissionError('Only the business itself can post for its shop.');
  const clean = text.trim();
  if (clean.length < 10) throw new Error('Write a short notice for your customers.');
  if (clean.length > OPEN_NOTICE_MAX) throw new Error(`Keep it under ${OPEN_NOTICE_MAX} characters.`);
  const post = {
    id: newId('post'),
    kind: 'post',
    name: "We're open during the roadwork",
    category: 'Business post',
    status: 'published',
    placeId,
    reportedBy: persona.profileId,
    visibility: 'public',
    description: clean,
    updatedAt: clock().toISOString().slice(0, 10),
    illustrative: true,
  } as unknown as MapItem;
  extraPosts.push(post);
  notify();
  return post;
}

/** Purab ("Me too"): public, open requests near a spot, to support instead of sending a duplicate. */
export async function getSupportable(persona: Persona): Promise<{ id: string; title: string; category: string; lng: number; lat: number; count: number; supported: boolean }[]> {
  return requests
    .filter((r) => r.public && ['new', 'acknowledged', 'assigned', 'needs-info', 'reopened'].includes(r.state) && r.requesterId !== persona.profileId)
    .map((r) => {
      const place = data.places.find((p) => p.id === r.placeId);
      const at = r.point ?? (place ? ([place.lng, place.lat] as [number, number]) : null);
      return at
        ? { id: r.id, title: r.title, category: r.category, lng: at[0], lat: at[1], count: 1 + (r.supporters?.length ?? 0), supported: !!r.supporters?.includes(persona.profileId) }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

/** "Recently fixed": requests posted to the map and resolved, with what was done and the sender's rating. */
export async function getRecentlyFixed(): Promise<{ id: string; title: string; placeId?: string; done?: string; outcome?: string; rating?: 'fixed' | 'not-fixed'; at: string; neighbours: number }[]> {
  return requests
    .filter((r) => r.public && r.state === 'resolved')
    .map((r) => ({
      id: r.id,
      title: r.title,
      placeId: r.placeId,
      done: [...r.history].reverse().find((h) => h.action === 'resolve')?.text,
      outcome: r.outcome,
      rating: r.rating?.value,
      at: r.resolvedAt ?? r.updatedAt,
      neighbours: 1 + (r.supporters?.length ?? 0),
    }))
    .sort((a, b) => b.at.localeCompare(a.at));
}

loadDemo();
