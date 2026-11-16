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
  ValidationError,
  isOpen,
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
import { applySettings, keepNotice, validateSettings, withDefaults, type HomePlace, type NoticeKind, type UserSettings } from '../features/profile/settings';
import {
  answer as answerPermitRule,
  canAnswer,
  decide as decidePermitRule,
  decisionNotice,
  isNeighbrStaff,
  needsPermit,
  sendToStaff,
  validatePermitFile,
  type Permit,
  type PermitDecision,
  type PermitFile,
} from '../features/moderation/permits';
import {
  canReportPost,
  fromListings,
  fromMessages,
  fromPosts,
  hiddenNotice,
  reporterNotice,
  sortQueue,
  validatePostReport,
  type PostReport,
  type PostReportReason,
  type QueueItem,
  type ReportKind,
} from '../features/moderation/reports';
import {
  block as blockIn,
  canBlock,
  canReport,
  canSend,
  canStart,
  chatsFor,
  contactsFor,
  isOrganization,
  nameOf,
  unblock as unblockIn,
  validateMessage,
  viewFor,
  type ChatContext,
  type ChatView,
  type Conversation,
  type MessageReport,
  type MessageSetting,
  type ReportReason,
} from '../features/chats/chats';
import {
  LISTING_REPORT_REASONS,
  NOTE_MAX,
  addDays,
  buildListing,
  canMessageSeller,
  canPost as canPostListing,
  canReportListing,
  endedRecently,
  firstMessage,
  isLive,
  isoDay,
  listingPins,
  sellerNameFor,
  validateListing,
  type Area,
  type Listing,
  type ListingDraft,
  type ListingPin,
  type ListingReport,
  type ListingReportReason,
} from '../features/marketplace/marketplace';

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
  // KAN-51 (Bhavana): chats
  chats?: Conversation[];
  orgChatMembers?: Record<string, string[]>;
  messageSettings?: Record<string, MessageSetting>;
  // KAN-53 (Devu): Marketplace listings
  listings?: Listing[];
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
  return [...(data.posts ?? []), ...extraPosts].filter((p) => !hiddenPosts.includes(p.id)); // KAN-52: staff can hide a reported post
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
/** KAN-52: permits that moved on (sent to staff, asked, answered, approved, declined) during this visit. */
const permitPatch = new Map<string, Permit>();
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
  const made = [...(data.orgEvents ?? []), ...sessionEvents].map((e) => {
    // KAN-52: an event with a permit is public only once Neighbr staff approve the permit.
    const permit = permitPatch.get(e.id) ?? e.permit;
    if (permit) {
      const withPermit = { ...e, permit };
      return permit.status === 'approved' ? { ...withPermit, visibility: 'public' as const, status: 'upcoming' as const } : withPermit;
    }
    return approvedIds.has(e.id) ? { ...e, visibility: 'public' as const, status: 'upcoming' as const } : e;
  });
  return [...fromMap, ...made];
}

/** A member creates an event. It always starts private until an organizer approves it. */
export async function submitOrgEvent(ev: OrgEvent): Promise<OrgEvent> {
  if (ev.visibility !== 'private until approved') throw new Error('New events start private until approved');
  if (allOrgEvents().some((e) => e.id === ev.id)) throw new Error(`Event ${ev.id} already exists`);
  // KAN-52 (Nigel, Nov 2): an event in a public space (a park, a street) needs a permit.
  if (needsPermit(ev.placeId, data.places as never)) {
    if (!ev.permit) throw new Error('An event in a park or on a street needs a permit. Upload it with the event.');
    const bad = validatePermitFile(ev.permit.file);
    if (bad) throw new Error(bad);
  }
  sessionEvents.push(ev);
  notify();
  return ev;
}

/** An organizer approves a pending event; it becomes public and, if it has a place, a pin on the map. */
export async function approveOrgEvent(id: string, viewer: OrgMember | undefined): Promise<OrgEvent> {
  const ev = allOrgEvents().find((e) => e.id === id);
  if (!ev) throw new Error(`Event ${id} not found`);
  if (!canApprove(ev, viewer)) throw new Error('Only an organizer of this group can approve its events');
  if (ev.permit) {
    // KAN-52: with a permit, the organizer's approval sends it on to Neighbr staff. It is not public yet.
    const org = (data.organizations ?? []).find((o) => o.id === ev.orgId);
    const creator = (data.orgMembers ?? []).find((m) => m.id === ev.createdBy);
    const creatorProfile = creator?.profileId ?? (creator?.role === 'organizer' ? org?.profileId : null);
    const approverProfile = viewer?.profileId ?? org?.profileId;
    const sent = sendToStaff({ ...ev.permit, notify: [...ev.permit.notify, ...(creatorProfile ? [creatorProfile] : [])] }, clock().toISOString(), approverProfile);
    permitPatch.set(id, sent);
    if (creatorProfile && creatorProfile !== approverProfile) {
      addDecision([creatorProfile], ev.name, 'An organizer approved your event. Its permit is now with Neighbr staff.', '#/community');
    }
    notify();
    return { ...ev, permit: sent };
  }
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
  permitPatch.clear();
  sessionPosts.length = 0;
  modDecisions = [];
  postReports = [];
  hiddenPosts = [];
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
  resetChats();
  resetMarketplace();
  userSettings = {};
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
  // KAN-50 (Purab): the person's settings decide which kinds reach the bell, and where "home" is.
  const prefs = withDefaults(userSettings[persona.id]);
  persona = effectivePersona(persona);
  const kinds: [NoticeKind, number][] = [];
  const mark = (kind: NoticeKind) => kinds.push([kind, out.length]);
  const orgs = orgNames();
  const plain = (n: string) => n.replace(/\s*\(demo\)/, '');
  const out: DemoNotification[] = [];
  mark('requests');
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
  // KAN-51 (Bhavana): new chat messages for this person (one line per chat).
  mark('chats');
  out.push(...chatNotifications(persona));
  // KAN-53 (Devu): posts of yours that ended ("This post has ended").
  mark('marketplace');
  out.push(...endedPostNotifications(persona));
  // KAN-52 (Mounika): decisions by Neighbr staff on permits and reports.
  mark('community');
  out.push(...decisionNotifications(persona));
  // Sprint 6 (Bhavana): area alerts that reach this person.
  mark('alerts');
  for (const a of areaAlerts) {
    if (!isCurrent(a, clock()) || !reaches(a, persona)) continue;
    const id = `alert:${a.id}`;
    out.push({ id, requestId: '', href: '#/updates', title: a.message, text: `${plain(a.fromName)}: ${a.title}`, at: a.createdAt, read: readNotes.has(id) });
  }
  // Sprint 6 (Devu's school section): notices for parents reach the parent's notifications.
  mark('community');
  for (const n of parentNotices(persona)) {
    const id = `notice:${n.id}`;
    const school = plain((data.schools ?? [])[0]?.name ?? 'The school');
    out.push({ id, requestId: '', href: '#/community', title: n.title, text: `${school}: new ${n.type === 'event' ? 'event' : 'notice'} for parents`, at: `${n.posted}T08:00:00.000Z`, read: readNotes.has(id) });
  }
  // each notification belongs to the section it was added in; drop the kinds turned off in Settings
  const kindAt = (i: number) => [...kinds].reverse().find(([, start]) => start <= i)?.[0] ?? 'requests';
  return out.filter((_, i) => keepNotice(prefs, kindAt(i))).sort((a, b) => b.at.localeCompare(a.at));
}

// ---------------------------------------------------------------------------------------------
// KAN-50 (Purab): profile and settings. Kept per person in "Viewing as" (two City staff share one
// organization profile, but each has their own settings). Real backend: GET/PUT /me/settings.
let userSettings: Record<string, UserSettings> = {};

function homePlaces(): HomePlace[] {
  return data.places.map((p) => ({ id: p.id, name: p.name, lat: p.lat as number, lng: p.lng as number }));
}

/** Places someone can choose as their home area (public places on the corridor, never a home address). */
export async function getHomePlaces(): Promise<HomePlace[]> {
  return homePlaces();
}

export async function getSettings(persona: Persona): Promise<UserSettings> {
  return withDefaults(userSettings[persona.id]);
}

/** Save settings. Throws with a plain-language reason if a choice isn't allowed. */
export async function saveSettings(persona: Persona, next: UserSettings): Promise<UserSettings> {
  const clean = withDefaults(next);
  const problem = validateSettings(persona, clean, homePlaces());
  if (problem) throw new ValidationError(problem);
  userSettings = { ...userSettings, [persona.id]: clean };
  notify();
  return clean;
}

/** The person with their settings applied (home area). App.tsx passes this to every page. */
export function effectivePersona(persona: Persona): Persona {
  return applySettings(persona, withDefaults(userSettings[persona.id]), homePlaces());
}

export interface ProfileSummary {
  profile?: Profile;
  /** For a business owner: the owner's own profile next to the shop's. */
  owner?: Profile;
  sent: number;
  open: number;
  supporting: number;
  listings: number;
  unreadChats: number;
  notifications: number;
}

/** Counts for the profile page. Each one links to the page where the person can act on it. */
export async function getProfileSummary(persona: Persona): Promise<ProfileSummary> {
  const profile = data.profiles.find((p) => p.id === persona.profileId);
  const owner = profile?.ownerProfileId ? data.profiles.find((p) => p.id === profile.ownerProfileId) : undefined;
  const mine = requests.filter((r) => r.requesterId === persona.profileId);
  const now = clock();
  const chats = await getChats(persona);
  const notes = await getNotifications(persona);
  return {
    profile,
    owner,
    sent: mine.length,
    open: mine.filter((r) => isOpen(r.state)).length,
    supporting: requests.filter((r) => r.supporters?.includes(persona.profileId)).length,
    listings: listings.filter((l) => l.sellerId === persona.profileId && isLive(l, now)).length,
    unreadChats: chats.reduce((n, c) => n + c.unread, 0),
    notifications: notes.filter((n) => !n.read).length,
  };
}

/** Mark one notification as read (area alerts, when clicked). */
export function markNotificationRead(id: string): void {
  if (id.startsWith('chat:')) {
    // "chat:<chat id>:<profile id>": opening it marks the chat read for that person.
    const [, chatId, profileId] = id.split(':');
    markChatReadFor(profileId, chatId);
    return;
  }
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
      JSON.stringify({ submitted, requests, patches: [...issuePatch], outcomePins, read: [...readNotes], wardPolls, areaAlerts, extraPosts, community: { events: sessionEvents, approved: [...approvedIds], posts: sessionPosts }, moderation: { permits: [...permitPatch], decisions: modDecisions, postReports, hiddenPosts }, schoolNotices: postedNotices, chats: { conversations, blocks, settings, reports: messageReports }, marketplace: { listings, reports: listingReports }, profile: { settings: userSettings } }),
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
    // KAN-52 (Mounika): permits moved on, decisions, post reports and hidden posts in this browser
    if (Array.isArray(saved.moderation?.permits)) saved.moderation.permits.forEach(([k, v]: [string, Permit]) => permitPatch.set(k, v));
    if (Array.isArray(saved.moderation?.decisions)) modDecisions = saved.moderation.decisions;
    if (Array.isArray(saved.moderation?.postReports)) postReports = saved.moderation.postReports;
    if (Array.isArray(saved.moderation?.hiddenPosts)) hiddenPosts = saved.moderation.hiddenPosts;
    if (Array.isArray(saved.schoolNotices)) postedNotices.push(...saved.schoolNotices);
    // KAN-51 (Bhavana): chats, blocks, message settings and reports made in this browser
    if (Array.isArray(saved.chats?.conversations)) conversations = saved.chats.conversations;
    if (saved.chats?.blocks && typeof saved.chats.blocks === 'object') blocks = saved.chats.blocks;
    if (saved.chats?.settings && typeof saved.chats.settings === 'object') settings = saved.chats.settings;
    if (Array.isArray(saved.chats?.reports)) messageReports = saved.chats.reports;
    // KAN-53 (Devu): listings made, ended or reported in this browser
    if (Array.isArray(saved.marketplace?.listings)) listings = saved.marketplace.listings;
    if (Array.isArray(saved.marketplace?.reports)) listingReports = saved.marketplace.reports;
    // KAN-50 (Purab): settings chosen in this browser
    if (saved.profile?.settings && typeof saved.profile.settings === 'object') userSettings = saved.profile.settings;
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

/**
 * Devu: a business near roadwork posts "We're open" to the map (Business posts layer).
 * KAN-53: like every map post it has an end date (default 14 days). After it, the post leaves the map
 * and the business gets a "This post has ended" notification.
 */
export async function postOpenNotice(persona: Persona, placeId: string, text: string, endsOn?: string): Promise<MapItem> {
  const me = data.profiles.find((p) => p.id === persona.profileId);
  if (persona.reportMode !== 'business' || me?.placeId !== placeId) throw new PermissionError('Only the business itself can post for its shop.');
  const clean = text.trim();
  if (clean.length < 10) throw new Error('Write a short notice for your customers.');
  if (clean.length > OPEN_NOTICE_MAX) throw new Error(`Keep it under ${OPEN_NOTICE_MAX} characters.`);
  const today = isoDay(clock());
  const end = endsOn || addDays(clock(), 14);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end) || end < today) throw new Error('Choose an end date that is today or later.');
  if (end > addDays(clock(), 90)) throw new Error('A post can stay up for 90 days at most. Choose an earlier end date.');
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
    updatedAt: today,
    endsOn: end,
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

// ---- KAN-51 (Bhavana): chats between people and organizations ----
// Kept in this browser for the demo, like the rest (Reset demo clears it). With a real backend:
//   getChats -> GET /chats (the server returns only the chats this person is in, already as their view)
//   sendMessage -> POST /chats/:id/messages (the server checks canSend again)
//   reportMessage -> POST /reports (lands in the Neighbr staff queue, KAN-52)
// Every function here returns a ChatView: staff names and ids never reach someone outside the organization.

const seedChats = (): Conversation[] => JSON.parse(JSON.stringify(data.chats ?? []));
let conversations: Conversation[] = seedChats();
let blocks: Record<string, string[]> = {};
let settings: Record<string, MessageSetting> = { ...(data.messageSettings ?? {}) };
let messageReports: MessageReport[] = [];

function resetChats() {
  conversations = seedChats();
  blocks = {};
  settings = { ...(data.messageSettings ?? {}) };
  messageReports = [];
}

function chatContext(): ChatContext {
  // Names of people known only from a chat (e.g. a seller from the Marketplace) are added too.
  const known = Object.assign({}, ...conversations.map((c) => c.names ?? {}));
  return { names: { ...known, ...orgNames() }, orgMembers: data.orgChatMembers ?? {}, blocks, settings };
}

const findChat = (id: string) => conversations.find((c) => c.id === id);

/** The chats this person is in, newest first, each with what they may see. */
export async function getChats(persona: Persona): Promise<ChatView[]> {
  return chatsFor(persona, conversations, chatContext(), messageReports);
}

/** One chat, or null if it doesn't exist or this person isn't in it. */
export async function getChat(persona: Persona, chatId: string): Promise<ChatView | null> {
  const c = findChat(chatId);
  if (!c || !c.members.includes(persona.profileId) || persona.kind === 'copy') return null;
  return viewFor(persona, c, chatContext(), messageReports);
}

/** Total unread messages for this person (for a badge). */
export async function getUnreadChatCount(persona: Persona): Promise<number> {
  return (await getChats(persona)).reduce((n, c) => n + c.unread, 0);
}

/** Who this person can start a chat with (an organization's members, or a person's organizations). */
export async function getChatContacts(persona: Persona): Promise<{ id: string; name: string }[]> {
  return contactsFor(persona, chatContext());
}

/**
 * The chat about a request, between its sender and the organization handling it. Created the first
 * time either side opens it. Throws if this person is neither.
 */
export async function openRequestChat(persona: Persona, requestId: string): Promise<string> {
  const r = requests.find((x) => x.id === requestId);
  if (!r) throw new Error('Request not found.');
  const sender = persona.profileId === r.requesterId;
  const handler = persona.kind === 'staff' && persona.profileId === r.toProfile;
  if (!sender && !handler) throw new Error('Only the sender and the organization handling it can message about this request.');
  const existing = conversations.find((c) => c.kind === 'request' && c.requestId === requestId);
  if (existing) return existing.id;
  const c: Conversation = {
    id: `chat-req-${requestId}`,
    kind: 'request',
    members: [r.requesterId, r.toProfile],
    requestId,
    title: r.title,
    names: { [r.requesterId]: r.requesterName },
    messages: [],
    readCount: {},
    illustrative: true,
  };
  conversations.push(c);
  notify();
  return c.id;
}

/**
 * Start (or continue) a chat with someone, outside a request. Devu's "Message the seller" (KAN-53)
 * calls this. Throws with a reason if it isn't allowed (blocked, their "who can message me" setting).
 */
export async function startChat(persona: Persona, to: string, text?: string, toName?: string): Promise<string> {
  const ctx = chatContext();
  if (toName && !ctx.names[to]) ctx.names[to] = toName;
  const check = canStart(persona, to, ctx);
  if (!check.ok) throw new Error(check.reason);
  let c = conversations.find((x) => x.kind !== 'request' && x.members.includes(persona.profileId) && x.members.includes(to));
  if (!c) {
    const org = isOrganization(persona.profileId, ctx) || isOrganization(to, ctx);
    c = {
      id: newId('chat'),
      kind: org ? 'organization' : 'direct',
      members: isOrganization(to, ctx) ? [to, persona.profileId] : [persona.profileId, to],
      names: toName ? { [to]: toName } : undefined,
      messages: [],
      readCount: {},
      illustrative: true,
    };
    conversations.push(c);
  }
  if (text && text.trim()) await sendMessage(persona, c.id, text);
  else notify();
  return c.id;
}

/** Send a message. Throws with a reason (shown on screen) if it isn't allowed or is empty. */
export async function sendMessage(persona: Persona, chatId: string, text: string): Promise<void> {
  const c = findChat(chatId);
  if (!c) throw new Error('Chat not found.');
  const check = canSend(persona, c, chatContext());
  if (!check.ok) throw new Error(check.reason);
  const problem = validateMessage(text);
  if (problem) throw new Error(problem);
  c.messages.push({
    id: newId('msg'),
    from: persona.profileId,
    ...(persona.staffId ? { byStaffId: persona.staffId } : {}),
    byName: persona.label,
    text: text.trim(),
    at: clock().toISOString(),
  });
  c.readCount[persona.profileId] = c.messages.length;
  notify();
}

function markChatReadFor(profileId: string, chatId: string) {
  const c = findChat(chatId);
  if (!c || !c.members.includes(profileId)) return;
  if ((c.readCount[profileId] ?? 0) === c.messages.length) return;
  c.readCount[profileId] = c.messages.length;
  notify();
}

/** Opening a chat marks it read for this person. */
export function markChatRead(persona: Persona, chatId: string): void {
  markChatReadFor(persona.profileId, chatId);
}

/** Block the other side of a chat. Not possible in a chat about a request. */
export async function blockInChat(persona: Persona, chatId: string): Promise<void> {
  const c = findChat(chatId);
  if (!c) throw new Error('Chat not found.');
  const check = canBlock(persona, c);
  if (!check.ok) throw new Error(check.reason);
  const other = c.members[0] === persona.profileId ? c.members[1] : c.members[0];
  blocks = blockIn(blocks, persona.profileId, other);
  notify();
}

export async function unblockInChat(persona: Persona, chatId: string): Promise<void> {
  const c = findChat(chatId);
  if (!c) throw new Error('Chat not found.');
  const other = c.members[0] === persona.profileId ? c.members[1] : c.members[0];
  blocks = unblockIn(blocks, persona.profileId, other);
  notify();
}

/** "Who can message me" (Purab's settings page, KAN-50, can use these too). */
export async function getMessageSetting(persona: Persona): Promise<MessageSetting> {
  return settings[persona.profileId] ?? 'anyone';
}

export async function setMessageSetting(persona: Persona, value: MessageSetting): Promise<void> {
  settings = { ...settings, [persona.profileId]: value };
  notify();
}

/** Report a message to Neighbr staff. The person who wrote it is not told who reported it. */
export async function reportMessage(persona: Persona, chatId: string, messageId: string, reason: ReportReason, note = ''): Promise<void> {
  const c = findChat(chatId);
  if (!c) throw new Error('Chat not found.');
  const check = canReport(persona, c, messageId, messageReports);
  if (!check.ok) throw new Error(check.reason);
  const m = c.messages.find((x) => x.id === messageId)!;
  messageReports = [
    ...messageReports,
    { id: newId('report'), chatId, messageId, reportedBy: persona.profileId, reportedProfile: m.from, reason, note: note.trim(), text: m.text, at: clock().toISOString(), status: 'open' },
  ];
  notify();
}

/** Reported messages, for the Neighbr staff queue (Mounika, KAN-52). */
export async function getMessageReports(): Promise<MessageReport[]> {
  return [...messageReports].sort((a, b) => b.at.localeCompare(a.at));
}

/** New messages in the bell: one line per chat with unread messages. */
function chatNotifications(persona: Persona): DemoNotification[] {
  const ctx = chatContext();
  return chatsFor(persona, conversations, ctx, messageReports)
    .filter((c) => c.unread > 0)
    .map((c) => {
      const last = c.messages.filter((m) => !m.mine).at(-1)!;
      const from = c.kind === 'request' ? nameOf(c.other, ctx, findChat(c.id)) : c.otherName;
      return {
        id: `chat:${c.id}:${persona.profileId}`,
        requestId: '',
        href: `#/chats?c=${encodeURIComponent(c.id)}`,
        title: c.title,
        text: c.unread === 1 ? `New message from ${from}` : `${c.unread} new messages from ${from}`,
        at: last.at,
        read: false,
      };
    });
}

// ---- KAN-53 (Devu): Marketplace and expiring posts ----
// Listings are kept in memory for the demo (and saved in this browser like everything else; Reset demo
// brings back the sample listings). With a real backend:
//   getListings -> GET /listings, createListing -> POST /listings, endListing / relistListing -> PATCH,
//   reportListing -> POST /listing-reports (lands in the Neighbr staff queue, KAN-52)
// The server must check the same rules again (who may post, who may end it, one report per person).

const seedListings = (): Listing[] => JSON.parse(JSON.stringify(data.listings ?? []));
let listings: Listing[] = seedListings();
let listingReports: ListingReport[] = [];

function resetMarketplace() {
  listings = seedListings();
  listingReports = [];
}

const findListing = (id: string) => listings.find((l) => l.id === id);
const MAX_PHOTO_CHARS = 400_000; // a small JPEG; the page shrinks photos before sending them

/** Public meeting spots a seller can choose: the shops and public places on the corridor (never a home). */
export async function getMarketAreas(): Promise<Area[]> {
  return data.places.filter((p) => p.status !== 'vacant').map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng }));
}

/**
 * The listings this person may see: every live one, plus their own (ended ones too, so they can post
 * them again). Listings removed by staff are only ever shown to their own seller.
 */
export async function getListings(persona: Persona): Promise<Listing[]> {
  const now = clock();
  return listings.filter((l) => isLive(l, now) || l.sellerId === persona.profileId).map((l) => ({ ...l }));
}

/** Post a listing. Throws with a reason (shown on screen) if it is not allowed or not complete. */
export async function createListing(persona: Persona, draft: ListingDraft): Promise<Listing> {
  const base = canPostListing(persona);
  if (!base.ok) throw new PermissionError(base.reason ?? 'You cannot post here.');
  const areas = await getMarketAreas();
  const errors = validateListing(draft, persona, areas.map((a) => a.id));
  const first = Object.values(errors)[0];
  if (first) throw new Error(first);
  if (draft.photo && draft.photo.length > MAX_PHOTO_CHARS) throw new Error('That photo is too big. Choose a smaller one.');
  const area = areas.find((a) => a.id === draft.areaId)!;
  const listing = buildListing(draft, persona, sellerNameFor(persona), area, newId('mk'), clock());
  listings = [...listings, listing];
  notify();
  return { ...listing };
}

/** The seller ends a listing early ("Mark as sold or done", "Take down"). It leaves the Marketplace and the map. */
export async function endListing(persona: Persona, id: string, how: 'sold' | 'removed'): Promise<void> {
  const l = findListing(id);
  if (!l) throw new Error('Listing not found.');
  if (l.sellerId !== persona.profileId) throw new PermissionError('Only the person who posted this can end it.');
  if (!isLive(l, clock())) throw new Error('This post has already ended.');
  listings = listings.map((x) => (x.id === id ? { ...x, status: 'ended', endedBy: how, endedOn: isoDay(clock()) } : x));
  notify();
}

/** Post an ended listing again for 7, 14 or 30 days. */
export async function relistListing(persona: Persona, id: string, days: number): Promise<void> {
  const l = findListing(id);
  if (!l) throw new Error('Listing not found.');
  if (l.sellerId !== persona.profileId) throw new PermissionError('Only the person who posted this can post it again.');
  if (l.status === 'hidden') throw new PermissionError('Neighbr staff removed this listing, so it cannot be posted again.');
  if (isLive(l, clock())) throw new Error('This post is still up.');
  if (![7, 14, 30].includes(days)) throw new Error('Choose how long it stays up.');
  listings = listings.map((x) => {
    if (x.id !== id) return x;
    const { endedBy: _a, endedOn: _b, ...rest } = x;
    return { ...rest, status: 'active', posted: isoDay(clock()), endsOn: addDays(clock(), days) };
  });
  notify();
}

/**
 * "Message the seller": opens a chat with the seller (Bhavana's Chats) and sends a first line that says
 * which listing it is about. Returns the chat id, so the page can go to #/chats?c=<id>.
 * Throws with a reason if the chat rules say no (blocked, the seller's "Who can message me" setting).
 */
export async function messageSeller(persona: Persona, listingId: string): Promise<string> {
  const l = findListing(listingId);
  if (!l) throw new Error('Listing not found.');
  const check = canMessageSeller(persona, l, clock());
  if (!check.ok) throw new Error(check.reason);
  const chatId = await startChat(persona, l.sellerId, undefined, l.sellerName);
  const c = findChat(chatId);
  if (c && !c.messages.some((m) => m.text === firstMessage(l))) await sendMessage(persona, chatId, firstMessage(l));
  return chatId;
}

/** Report a listing to Neighbr staff. The seller is not told who reported it. */
export async function reportListing(persona: Persona, listingId: string, reason: ListingReportReason, note = ''): Promise<void> {
  const l = findListing(listingId);
  if (!l) throw new Error('Listing not found.');
  if (!(LISTING_REPORT_REASONS as readonly string[]).includes(reason)) throw new Error('Choose a reason.');
  if (note.trim().length > NOTE_MAX) throw new Error(`Keep your note under ${NOTE_MAX} characters.`);
  const check = canReportListing(persona, l, listingReports);
  if (!check.ok) throw new Error(check.reason);
  listingReports = [
    ...listingReports,
    {
      id: newId('lreport'),
      listingId: l.id,
      title: l.title,
      description: l.description,
      category: l.category,
      sellerId: l.sellerId,
      sellerName: l.sellerName,
      reportedBy: persona.profileId,
      reason,
      note: note.trim(),
      at: clock().toISOString(),
      status: 'open',
    },
  ];
  notify();
}

/** Reported listings, newest first, for the Neighbr staff queue (Mounika, KAN-52). */
export async function getListingReports(): Promise<ListingReport[]> {
  return [...listingReports].sort((a, b) => b.at.localeCompare(a.at));
}

/** Staff decision on a reported listing: "hidden" takes it off the Marketplace and the map, "kept" leaves it up. */
export async function resolveListingReport(reportId: string, status: 'hidden' | 'kept'): Promise<void> {
  const r = listingReports.find((x) => x.id === reportId);
  if (!r) throw new Error('Report not found.');
  listingReports = listingReports.map((x) => (x.id === reportId ? { ...x, status } : x));
  if (status === 'hidden') listings = listings.map((l) => (l.id === r.listingId ? { ...l, status: 'hidden' } : l));
  notify();
}

/** The pins for the map: live listings whose seller chose "Show on the map" (see listingPins). */
export async function getListingPins(): Promise<ListingPin[]> {
  return listingPins(listings, clock());
}

/**
 * "This post has ended": a notification for the person who posted a listing, a business post (such as
 * "We're open") or an offer, once it is past its end date or they ended it. Shown for 30 days.
 */
function endedPostNotifications(persona: Persona): DemoNotification[] {
  const now = clock();
  const out: DemoNotification[] = [];
  const dayEnd = (day: string) => new Date(`${day}T23:59:59`).toISOString();
  const push = (id: string, href: string, title: string, day: string) =>
    out.push({ id: `ended:${id}`, requestId: '', href, title, text: 'This post has ended', at: dayEnd(day), read: readNotes.has(`ended:${id}`) });
  for (const l of listings) {
    if (l.sellerId !== persona.profileId || l.status === 'hidden') continue;
    if (endedRecently(l.endsOn, l.status, now, l.endedOn)) push(l.id, `#/marketplace?l=${encodeURIComponent(l.id)}`, l.title, l.endedOn ?? l.endsOn);
  }
  for (const p of [...(data.posts ?? []), ...extraPosts]) {
    const end = (p as { endsOn?: unknown }).endsOn;
    if (p.reportedBy !== persona.profileId || p.visibility !== 'public' || typeof end !== 'string' || hiddenPosts.includes(p.id)) continue;
    if (endedRecently(end, 'active', now)) push(p.id, '#/updates', p.name, end);
  }
  for (const o of data.offers ?? []) {
    const owner = data.profiles.find((x) => x.role === 'business' && x.placeId === o.placeId);
    if (owner?.id !== persona.profileId) continue;
    if (endedRecently(o.validUntil, 'active', now)) push(o.id, '#/map', o.name, o.validUntil);
  }
  return out;
}


// ---- KAN-52 (Mounika): event permits, Neighbr staff and the reported content queue ----
// Kept in memory for the demo (saved in this browser, gone after Reset demo). With a real backend:
//   decidePermit      -> POST /event-permits/:id/decision       (server checks the person is Neighbr staff)
//   answerPermit      -> POST /event-permits/:id/answer
//   getReportQueue    -> GET  /moderation/reports               (staff only)
//   resolveReport     -> POST /moderation/reports/:id/decision  { decision: 'hidden' | 'kept' }
//   reportPost        -> POST /post-reports

/** A decision that lands in someone's notification bell (never says who reported or which staff member decided). */
interface ModDecision {
  id: string;
  to: string[]; // profile ids
  title: string;
  text: string;
  href: string;
  at: string;
}
let modDecisions: ModDecision[] = [];
let postReports: PostReport[] = [];
let hiddenPosts: string[] = [];

function addDecision(to: (string | null | undefined)[], title: string, text: string, href: string) {
  const ids = [...new Set(to.filter((x): x is string => !!x))];
  if (ids.length === 0) return;
  modDecisions = [...modDecisions, { id: newId('mod'), to: ids, title, text, href, at: clock().toISOString() }];
}

function decisionNotifications(persona: Persona): DemoNotification[] {
  return modDecisions
    .filter((d) => d.to.includes(persona.profileId))
    .map((d) => {
      const id = `mod:${d.id}:${persona.profileId}`;
      return { id, requestId: '', href: d.href, title: d.title, text: d.text, at: d.at, read: readNotes.has(id) };
    });
}

function requireStaff(persona: Persona) {
  if (!isNeighbrStaff(persona)) throw new PermissionError('Only Neighbr staff can do this.');
}

/** A name for a profile id, for the staff queue (staff see who reported). */
function nameForProfile(id: string): string {
  const plain = (n: string) => n.replace(/\s*\(demo\)/, '');
  const person = PERSONAS.find((p) => p.profileId === id && p.group !== 'staff');
  if (person) return plain(person.label);
  const known = chatContext().names[id];
  if (known) return plain(known);
  return plain(data.profiles.find((p) => p.id === id)?.name ?? 'A neighbour');
}

// ---- event permits ----

export interface PermitItem {
  event: OrgEvent;
  permit: Permit;
  orgName: string;
  placeName: string;
}

/** Permits that Neighbr staff have to look at (and the ones they already decided), oldest request first. Staff only. */
export async function getPermitQueue(persona: Persona): Promise<PermitItem[]> {
  requireStaff(persona);
  const plain = (n: string) => n.replace(/\s*\(demo\)/, '');
  const rank: Record<string, number> = { 'with-staff': 0, 'more-info': 1, approved: 2, declined: 2 };
  return allOrgEvents()
    .filter((e): e is OrgEvent & { permit: Permit } => !!e.permit && e.permit.status !== 'with-organizer')
    .map((e) => ({
      event: e,
      permit: e.permit,
      orgName: plain((data.organizations ?? []).find((o) => o.id === e.orgId)?.name ?? 'A group'),
      placeName: plain(data.places.find((pl) => pl.id === e.placeId)?.name ?? 'a public place'),
    }))
    .sort((a, b) => rank[a.permit.status] - rank[b.permit.status] || (a.permit.steps.at(-1)?.at ?? '').localeCompare(b.permit.steps.at(-1)?.at ?? ''));
}

/** Neighbr staff approve a permit, decline it with a reason, or ask for more information. */
export async function decidePermit(persona: Persona, eventId: string, decision: PermitDecision, text = ''): Promise<OrgEvent> {
  requireStaff(persona);
  const ev = allOrgEvents().find((e) => e.id === eventId);
  if (!ev?.permit) throw new Error('Permit not found.');
  const next = decidePermitRule(ev.permit, decision, text, clock().toISOString());
  permitPatch.set(eventId, next);
  const after = allOrgEvents().find((e) => e.id === eventId)!;
  const onMap = eventOnMap(after, clock()) && !!after.placeId;
  const note = decisionNotice(decision, ev.name, text, onMap);
  addDecision(ev.permit.notify, note.title, note.text, '#/community');
  notify();
  return after;
}

/** The organizers answer a question from staff, or send a declined event again with a new permit. */
export async function answerPermit(viewer: OrgMember | undefined, eventId: string, reply: { note?: string; file?: PermitFile | null }): Promise<OrgEvent> {
  const ev = allOrgEvents().find((e) => e.id === eventId);
  if (!ev?.permit) throw new Error('Permit not found.');
  if (!canAnswer(ev.permit, viewer, ev.orgId)) throw new PermissionError('Only an organizer of this group can answer Neighbr staff.');
  permitPatch.set(eventId, answerPermitRule(ev.permit, reply, clock().toISOString()));
  notify();
  return allOrgEvents().find((e) => e.id === eventId)!;
}

// ---- reported content ----

/** Everything that was reported (chats, listings, business posts): open first, then decided. Staff only. */
export async function getReportQueue(persona: Persona): Promise<QueueItem[]> {
  requireStaff(persona);
  return sortQueue([...fromMessages(messageReports, nameForProfile), ...fromListings(listingReports, nameForProfile), ...fromPosts(postReports, nameForProfile)]);
}

/** Open reports waiting for a decision (for a badge). */
export async function getOpenReportCount(persona: Persona): Promise<number> {
  if (!isNeighbrStaff(persona)) return 0;
  return (await getReportQueue(persona)).filter((i) => i.status === 'open').length;
}

/** A business post can be reported, like a chat message or a listing. The poster is not told who reported it. */
export async function reportPost(persona: Persona, postId: string, reason: PostReportReason, note = ''): Promise<void> {
  const post = [...(data.posts ?? []), ...extraPosts].find((p) => p.id === postId && !hiddenPosts.includes(p.id));
  if (!post) throw new Error('Post not found.');
  if (isNeighbrStaff(persona)) throw new PermissionError('Neighbr staff review reports instead of making them.');
  const bad = validatePostReport(reason, note);
  if (bad) throw new Error(bad);
  const check = canReportPost(persona.profileId, post as never, postReports, postId);
  if (!check.ok) throw new Error(check.reason);
  postReports = [
    ...postReports,
    {
      id: newId('preport'),
      postId,
      title: post.name,
      description: String(post.description ?? ''),
      posterId: String(post.reportedBy ?? ''),
      reportedBy: persona.profileId,
      reason,
      note: note.trim(),
      at: clock().toISOString(),
      status: 'open',
    },
  ];
  notify();
}

/**
 * Neighbr staff decide on a report: "hidden" takes it down, "kept" leaves it up. Other open reports about
 * the same thing get the same decision. The reporters hear the outcome; if it was hidden, so does the
 * person it was about (who is never told who reported it).
 */
export async function resolveReport(persona: Persona, kind: ReportKind, reportId: string, status: 'hidden' | 'kept'): Promise<void> {
  requireStaff(persona);
  if (status !== 'hidden' && status !== 'kept') throw new Error('Choose Hide or Keep.');
  const queue = await getReportQueue(persona);
  const item = queue.find((i) => i.kind === kind && i.id === reportId);
  if (!item) throw new Error('Report not found.');
  if (item.status !== 'open') throw new Error('This report has already been decided.');

  const href = kind === 'chat' ? '#/chats' : kind === 'listing' ? '#/marketplace' : '#/updates';
  const decided = new Set<string>(); // reporters already told
  const tell = (reporter: string, title: string) => {
    if (decided.has(reporter)) return;
    decided.add(reporter);
    const n = reporterNotice(kind, title, status);
    addDecision([reporter], n.title, n.text, href);
  };

  if (kind === 'chat') {
    const r = messageReports.find((x) => x.id === reportId)!;
    const same = (x: MessageReport) => x.chatId === r.chatId && x.messageId === r.messageId && x.status === 'open';
    messageReports.filter(same).forEach((x) => tell(x.reportedBy, 'Your report'));
    messageReports = messageReports.map((x) => (same(x) ? { ...x, status } : x));
    if (status === 'hidden') {
      const n = hiddenNotice('chat', '');
      addDecision([r.reportedProfile], n.title, n.text, href);
    }
  } else if (kind === 'listing') {
    const r = listingReports.find((x) => x.id === reportId)!;
    const siblings = listingReports.filter((x) => x.listingId === r.listingId && x.status === 'open');
    siblings.forEach((x) => tell(x.reportedBy, x.title));
    for (const x of siblings) await resolveListingReport(x.id, status); // Devu's rule: hidden also takes it off the Marketplace and the map
    if (status === 'hidden') {
      const n = hiddenNotice('listing', r.title);
      addDecision([r.sellerId], n.title, n.text, href);
    }
  } else {
    const r = postReports.find((x) => x.id === reportId)!;
    const same = (x: PostReport) => x.postId === r.postId && x.status === 'open';
    postReports.filter(same).forEach((x) => tell(x.reportedBy, x.title));
    postReports = postReports.map((x) => (same(x) ? { ...x, status } : x));
    if (status === 'hidden') {
      hiddenPosts = [...hiddenPosts, r.postId];
      const n = hiddenNotice('post', r.title);
      addDecision([r.posterId], n.title, n.text, href);
    }
  }
  notify();
}


loadDemo();
