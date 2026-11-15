// Logic for the community organization workspace (KAN-42, Mounika).
// No UI in here, so every rule can be tested on its own:
//   - who can see an event (public, or still waiting for an organizer to approve it)
//   - making a new event from the form (always starts private)
//   - volunteer sign-ups (spots left, no double sign-up)
//   - the members list, which reuses the map search (every typed word must match)
// KAN-48 adds: who you are comes from the app's "Viewing as", approved events with a place go on the
// shared map until they are over, and libraries post service changes that show on the map.
import { matchesWords } from '../search/filters';

export type OrgType = 'community' | 'foodbank' | 'school' | 'institution';
export type MemberRole = 'organizer' | 'coordinator' | 'volunteer' | 'member';

export interface Organization {
  id: string;
  kind: 'organization';
  type: OrgType;
  typeLabel: string;
  name: string;
  profileId: string | null; // the matching map profile, if there is one (e.g. profile-ngo)
  placeId: string | null;
  area: string;
  about: string;
  location?: { lat: number; lng: number }; // where its service changes go on the map (KAN-48)
  public: string[];
  private: string[];
  illustrative: boolean;
}

export interface OrgMember {
  id: string;
  kind: 'member';
  orgId: string;
  profileId: string | null; // set when the member is also a profile in the app (the demo resident, Rosa)
  name: string;
  role: MemberRole;
  skills: string[];
  joined: string;
  public: string[];
  private: string[];
  illustrative: boolean;
}

export interface VolunteerRole {
  id: string;
  kind: 'volunteer-role';
  orgId: string;
  title: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string;
  placeId: string | null;
  spots: number;
  signedUp: string[]; // member ids
  description: string;
  illustrative: boolean;
}

export interface OrgEvent {
  id: string;
  kind: 'org-event';
  orgId: string;
  name: string;
  category: string;
  start: string; // YYYY-MM-DDTHH:MM
  end?: string;
  placeId: string | null;
  createdBy: string | null; // member id
  visibility: 'public' | 'private until approved';
  status: 'upcoming' | 'past' | 'pending';
  onMap?: boolean; // already a pin on the shared map
  description?: string;
  illustrative: boolean;
}

export interface CommunityData {
  organizations: Organization[];
  members: OrgMember[];
  roles: VolunteerRole[];
  events: OrgEvent[];
  posts: OrgPost[];
}

/** A service change an organization posts, e.g. "Closed Wednesday" (KAN-48). */
export interface OrgPost {
  id: string;
  kind: 'org-post';
  orgId: string;
  title: string;
  message: string;
  from: string; // YYYY-MM-DD, first day it shows
  until: string; // YYYY-MM-DD, last day it shows; after that it leaves the map
  postedBy: string; // member id
  visibility: 'public';
  illustrative: boolean;
}

/** Who is signed in, from "Viewing as": a profile, or a community group member (organizers). */
export interface Signer {
  profileId: string;
  memberId?: string;
}

export const ROLE_LABEL: Record<MemberRole, string> = {
  organizer: 'Organizer',
  coordinator: 'Coordinator',
  volunteer: 'Volunteer',
  member: 'Member',
};

export type RoleChip = 'all' | MemberRole;
export const ROLE_CHIPS: { id: RoleChip; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'organizer', label: 'Organizers' },
  { id: 'coordinator', label: 'Coordinators' },
  { id: 'volunteer', label: 'Volunteers' },
  { id: 'member', label: 'Members' },
];

// ---------- organizations and members ----------

export function orgById(data: CommunityData, id: string): Organization | undefined {
  return data.organizations.find((o) => o.id === id);
}

export function membersOf(data: CommunityData, orgId: string): OrgMember[] {
  return data.members.filter((m) => m.orgId === orgId);
}

/** The signed-in person's membership in this organization, if they have one. */
export function myMembership(data: CommunityData, orgId: string, profileId: string): OrgMember | undefined {
  return data.members.find((m) => m.orgId === orgId && m.profileId === profileId);
}

/**
 * The member the screen acts as in this organization, from "Viewing as" (KAN-48).
 * A group organizer persona is that member; everyone else is matched by their profile.
 * Undefined means "not a member here" (staff, the business, or a group you haven't joined).
 */
export function memberFor(data: CommunityData, orgId: string, who: Signer): OrgMember | undefined {
  if (who.memberId) return data.members.find((m) => m.id === who.memberId && m.orgId === orgId);
  return myMembership(data, orgId, who.profileId);
}

/** Only members see who else belongs; everyone else sees the count. Contact details are never shown. */
export function canSeeMembers(viewer: OrgMember | undefined): boolean {
  return viewer !== undefined;
}

/** Members list search: reuses the map search rule on name, role and skills, plus the role chips. */
export function filterMembers(members: OrgMember[], query: string, chip: RoleChip): OrgMember[] {
  return members.filter(
    (m) => (chip === 'all' || m.role === chip) && matchesWords(`${m.name} ${ROLE_LABEL[m.role]} ${m.skills.join(' ')}`, query),
  );
}

/** How many members each chip would show for the current search (shown beside the chip). */
export function roleCounts(members: OrgMember[], query: string): Record<RoleChip, number> {
  const out = {} as Record<RoleChip, number>;
  for (const c of ROLE_CHIPS) out[c.id] = filterMembers(members, query, c.id).length;
  return out;
}

// ---------- events ----------

export function isPending(e: OrgEvent): boolean {
  return e.visibility !== 'public';
}

/**
 * Who can see an event: public events are for everyone; a pending event only for the person who
 * made it and the organization's organizers (same rule as private reports on the map).
 */
export function canSeeEvent(e: OrgEvent, viewer: OrgMember | undefined): boolean {
  if (!isPending(e)) return true;
  if (!viewer || viewer.orgId !== e.orgId) return false;
  return viewer.role === 'organizer' || viewer.id === e.createdBy;
}

export function canApprove(e: OrgEvent, viewer: OrgMember | undefined): boolean {
  return isPending(e) && viewer?.orgId === e.orgId && viewer.role === 'organizer';
}

/** An organization's events this viewer may see, soonest first. */
export function eventsFor(data: CommunityData, orgId: string, viewer: OrgMember | undefined): OrgEvent[] {
  return data.events
    .filter((e) => e.orgId === orgId && canSeeEvent(e, viewer))
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Organizer approves a pending event: it becomes public. Returns a new list (nothing is changed in place). */
export function approveEvent(events: OrgEvent[], eventId: string, viewer: OrgMember | undefined): OrgEvent[] {
  return events.map((e) => (e.id === eventId && canApprove(e, viewer) ? { ...e, visibility: 'public', status: 'upcoming' } : e));
}

// ---------- the "Create event" form ----------

export const EVENT_NAME_MAX = 80;
export const EVENT_NOTE_MAX = 300;

export interface EventDraft {
  name: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM or ''
  placeId: string; // '' = not on the corridor / online
  description: string;
}

export type EventErrors = Partial<Record<keyof EventDraft, string>>;

export const EMPTY_DRAFT: EventDraft = { name: '', date: '', start: '', end: '', placeId: '', description: '' };

function isoDay(d: Date): string {
  // Local date, so "today" matches the person's calendar, not UTC.
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Checks the form. Empty object = good to send. */
export function validateEvent(draft: EventDraft, today: Date = new Date()): EventErrors {
  const errors: EventErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = 'Give the event a name.';
  else if (name.length > EVENT_NAME_MAX) errors.name = `Keep the name under ${EVENT_NAME_MAX} characters.`;

  if (!draft.date) errors.date = 'Pick a date.';
  else if (draft.date < isoDay(today)) errors.date = 'The date has already passed.';

  if (!draft.start) errors.start = 'Pick a start time.';
  if (draft.start && draft.end && draft.end <= draft.start) errors.end = 'The end time must be after the start time.';

  if (draft.description.length > EVENT_NOTE_MAX) errors.description = `Keep the details under ${EVENT_NOTE_MAX} characters.`;
  return errors;
}

/**
 * Builds the new event. It always starts private: only the creator and the organizers see it
 * until an organizer approves it. Throws if the creator isn't a member of the organization.
 */
export function buildEvent(draft: EventDraft, orgId: string, creator: OrgMember | undefined, id: string): OrgEvent {
  if (!creator || creator.orgId !== orgId) throw new Error('Only members of the organization can create events');
  return {
    id,
    kind: 'org-event',
    orgId,
    name: draft.name.trim(),
    category: 'Community event',
    start: `${draft.date}T${draft.start}`,
    end: draft.end ? `${draft.date}T${draft.end}` : undefined,
    placeId: draft.placeId || null,
    createdBy: creator.id,
    visibility: 'private until approved',
    status: 'pending',
    description: draft.description.trim() || undefined,
    illustrative: true,
  };
}

// ---------- volunteer roles ----------

export function rolesFor(data: CommunityData, orgId: string): VolunteerRole[] {
  return data.roles.filter((r) => r.orgId === orgId).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
}

export function spotsLeft(role: VolunteerRole): number {
  return Math.max(0, role.spots - role.signedUp.length);
}

export function isSignedUp(role: VolunteerRole, member: OrgMember | undefined): boolean {
  return !!member && role.signedUp.includes(member.id);
}

/** Sign-up needs a membership, a free spot, and not being on the list already. */
export function canSignUp(role: VolunteerRole, member: OrgMember | undefined): boolean {
  return !!member && member.orgId === role.orgId && !isSignedUp(role, member) && spotsLeft(role) > 0;
}

export function signUp(roles: VolunteerRole[], roleId: string, member: OrgMember | undefined): VolunteerRole[] {
  return roles.map((r) => (r.id === roleId && canSignUp(r, member) ? { ...r, signedUp: [...r.signedUp, member!.id] } : r));
}

export function cancelSignUp(roles: VolunteerRole[], roleId: string, member: OrgMember | undefined): VolunteerRole[] {
  return roles.map((r) => (r.id === roleId && isSignedUp(r, member) ? { ...r, signedUp: r.signedUp.filter((id) => id !== member!.id) } : r));
}

// ---------- the shared map (KAN-48) ----------
// Nigel (Nov 2): things on the map stay for a while and then disappear. Community events leave the
// map when they are over; service changes leave after their last day.

const endOf = (e: OrgEvent) => e.end ?? e.start;

export function isOver(e: OrgEvent, now: Date): boolean {
  return new Date(endOf(e)) < now;
}

/** A public event with a place on the corridor shows as a pin until it ends. */
export function eventOnMap(e: OrgEvent, now: Date): boolean {
  return !isPending(e) && !!e.placeId && !isOver(e, now);
}

/** A service change shows from its first day to the end of its last day. */
export function postIsActive(p: OrgPost, today: Date): boolean {
  const day = isoDay(today);
  return p.from <= day && day <= p.until;
}

/** Current and coming service changes for an organization (finished ones drop off), soonest first. */
export function postsFor(data: CommunityData, orgId: string, today: Date): OrgPost[] {
  const day = isoDay(today);
  return data.posts.filter((p) => p.orgId === orgId && p.until >= day).sort((a, b) => a.from.localeCompare(b.from));
}

/** Only an organization with a place on the map can post service changes, and only its organizers or coordinators. */
export function canPost(org: Organization | undefined, viewer: OrgMember | undefined): boolean {
  return !!org?.location && viewer?.orgId === org.id && (viewer.role === 'organizer' || viewer.role === 'coordinator');
}

export const POST_TITLE_MAX = 80;
export const POST_MESSAGE_MAX = 300;

export interface PostDraft {
  title: string;
  message: string;
  from: string;
  until: string;
}

export type PostErrors = Partial<Record<keyof PostDraft, string>>;
export const EMPTY_POST: PostDraft = { title: '', message: '', from: '', until: '' };

export function validatePost(draft: PostDraft, today: Date = new Date()): PostErrors {
  const errors: PostErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = 'Say what is changing, for example "Closed Monday".';
  else if (title.length > POST_TITLE_MAX) errors.title = `Keep it under ${POST_TITLE_MAX} characters.`;
  if (draft.message.length > POST_MESSAGE_MAX) errors.message = `Keep the details under ${POST_MESSAGE_MAX} characters.`;
  if (!draft.from) errors.from = 'Pick the first day.';
  if (!draft.until) errors.until = 'Pick the last day.';
  else if (draft.until < isoDay(today)) errors.until = 'The last day has already passed.';
  else if (draft.from && draft.until < draft.from) errors.until = 'The last day must be on or after the first day.';
  return errors;
}

export function buildPost(draft: PostDraft, org: Organization, poster: OrgMember | undefined, id: string): OrgPost {
  if (!canPost(org, poster)) throw new Error('Only organizers of an organization with a place on the map can post service changes');
  return {
    id,
    kind: 'org-post',
    orgId: org.id,
    title: draft.title.trim(),
    message: draft.message.trim(),
    from: draft.from,
    until: draft.until,
    postedBy: poster!.id,
    visibility: 'public',
    illustrative: true,
  };
}

// ---------- formatting ----------

// Same date and time style as the event cards on the map (Bhavana's helper).
export { formatWhen } from '../cards/cardData';
