// Sprint 5 (Purab): one request, followed from the person who sends it, through the organization
// that handles it, and back. No UI here, so every rule can be tested on its own.
//
//   Resident  -> City of Windsor 311 (copy to the ward councillor) -> assigned staff -> resident
//   Business  -> Olde Riverside BIA                                -> coordinator    -> business
//
// For every request the system knows: who can see it, who can change it, its current state,
// and a record of everything that happened (including blocked attempts).
//
// Sprint 6 (after Nigel's Nov 2 feedback):
//   - any user can send a request, organizations too (a BIA, school or community group acts as an individual)
//   - the sender chooses: post it on the map, or send it privately
//   - the ward councillor (copy) can comment; senders see the organization, never staff names
//   - due dates and overdue warnings (Bhavana); moving a request to another team needs a reason
// Sprint 6 additions for the demo:
//   - "Me too": neighbours support a public request instead of sending a duplicate (Purab)
//   - "Was it fixed?": the sender rates the result once it is resolved (Purab)

export type RequestState =
  | 'new'
  | 'acknowledged'
  | 'assigned'
  | 'needs-info'
  | 'resolved'
  | 'declined'
  | 'reopened'
  | 'withdrawn';

export const STATE_LABEL: Record<RequestState, string> = {
  new: 'New',
  acknowledged: 'Received',
  assigned: 'Assigned',
  'needs-info': 'Needs more info',
  resolved: 'Resolved',
  declined: 'Declined',
  reopened: 'Reopened',
  withdrawn: 'Withdrawn',
};

/** States where the organization still has work to do. */
export const OPEN_STATES: RequestState[] = ['new', 'acknowledged', 'assigned', 'needs-info', 'reopened'];
export const isOpen = (s: RequestState) => OPEN_STATES.includes(s);

/** Days after "resolved" during which the person who sent it can reopen it. */
export const REOPEN_DAYS = 14;
export const DECLINE_MIN = 10; // a decline needs a real reason

export type ActionId =
  | 'acknowledge'
  | 'assign'
  | 'update'
  | 'ask-info'
  | 'resolve'
  | 'decline'
  | 'note'
  | 'comment'
  | 'publish'
  | 'reopen-staff'
  | 'reply'
  | 'follow-up'
  | 'reopen'
  | 'withdraw'
  | 'support'
  | 'rate';

export const ACTION_LABEL: Record<ActionId, string> = {
  acknowledge: 'Acknowledge',
  assign: 'Assign',
  update: 'Send update',
  'ask-info': 'Ask for more information',
  resolve: 'Mark resolved',
  decline: 'Decline',
  note: 'Add internal note',
  comment: 'Add a comment',
  publish: 'Publish outcome on the map',
  'reopen-staff': 'Reopen',
  reply: 'Send reply',
  'follow-up': 'Send follow-up',
  reopen: 'Still a problem? Reopen',
  withdraw: 'Withdraw request',
  support: 'Support this request',
  rate: 'Send rating',
};

/** Staff actions and requester actions, in the order the screens show them. */
export const STAFF_ACTIONS: ActionId[] = ['acknowledge', 'assign', 'update', 'ask-info', 'resolve', 'decline', 'note', 'comment', 'publish', 'reopen-staff'];
export const REQUESTER_ACTIONS: ActionId[] = ['reply', 'follow-up', 'reopen', 'withdraw', 'rate'];

export interface HistoryEntry {
  at: string; // ISO date-time
  byId: string; // persona or staff id
  byName: string;
  action: ActionId | 'created' | 'blocked';
  text?: string;
  /** Staff-only entries (internal notes, blocked attempts). The requester never sees them. */
  internal?: boolean;
}

export interface ServiceRequest {
  id: string;
  issueId?: string; // the map item (pin) for this request, if it has one
  title: string;
  category: string;
  placeId?: string;
  description?: string;
  requesterId: string; // profile id of the person or business that sent it
  requesterName: string;
  requesterKind: RequesterKind;
  /** KAN-48 (Mounika): the group a member sent it for. It still comes from the person (Nigel, Nov 2). */
  onBehalfOf?: string;
  toProfile: string; // organization responsible (profile-city, profile-bia)
  ccProfile?: string; // copy for information only (profile-councillor)
  state: RequestState;
  /** State to return to when the requester answers a question. */
  stateBeforeInfo?: RequestState;
  assigneeId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  /** The sender chose "Post to the map": everyone sees it and its status. Otherwise it's private. */
  public: boolean;
  /** What was done, written by the organization's lead; shown on the map if the request is public. */
  outcome?: string;
  /** Photo sent with the report (a data URL in the demo). */
  photo?: string;
  /** Exact spot picked on the map ([lng, lat]), if the sender chose one. */
  point?: [number, number];
  /** "Me too": profiles of neighbours who support this request (they get its updates). */
  supporters?: string[];
  /** "Was it fixed?": the sender's rating once it was resolved. */
  rating?: { value: 'fixed' | 'not-fixed'; text?: string; at: string };
  history: HistoryEntry[];
  illustrative?: boolean;
}

export type RequesterKind = 'resident' | 'business' | 'organization';

/** A staff member of an organization (simulated accounts). */
export interface StaffMember {
  id: string;
  name: string;
  orgProfileId: string; // profile-city or profile-bia
  title: string;
  lead: boolean; // a lead can acknowledge, assign, decline and publish
  illustrative?: boolean;
}

/** Who the demo is "viewing as". Sign-in is simulated. */
export interface Persona {
  id: string;
  label: string; // "Jordan Lee (demo)"
  title: string; // "City 311 intake lead"
  kind: 'requester' | 'staff' | 'copy';
  profileId: string; // requester: their profile; staff: their organization's profile; copy: the copy holder's profile
  staffId?: string;
  /** Sprint 6: which group the person belongs to, for "Viewing as" and onboarding. */
  group?: 'people' | 'organizations' | 'staff';
  /** The page they land on after signing in (a section of the app, e.g. "map", "requests", "community"). */
  landing?: string;
  /** In the Community section: which organization opens first, and whether they act as its organizer. */
  community?: { orgId: string; as: 'me' | 'organizer' };
  /** In the school section: what they see. */
  /** What they see in the School section (Devu): public, parent or staff. */
  schoolRole?: 'public' | 'parent' | 'staff';
  /** KAN-48 (Mounika): their member record in their own community group (Community page). */
  memberId?: string;
  /** Can they send reports from the map? (City staff and copy holders handle requests instead.) */
  canReport?: boolean;
  /** Which report form: business owners ask the BIA; everyone else reports to the City. */
  reportMode?: 'me' | 'business';
  /** Roughly where they live or work ([lng, lat]), so area alerts can reach them (illustrative). */
  home?: [number, number];
}

export interface OrgNames {
  [profileId: string]: string;
}

// ---- Errors ----------------------------------------------------------------
export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ---- Who can see it ----------------------------------------------------------
export type Access = 'requester' | 'lead' | 'staff' | 'copy' | 'supporter' | 'public' | 'none';

export function accessOf(p: Persona, r: ServiceRequest, staff: StaffMember[]): Access {
  // Anyone who sent it is the requester: a resident, a business, or an organization (BIA, school, group).
  if (p.profileId === r.requesterId) return 'requester';
  if (p.kind === 'staff' && p.profileId === r.toProfile) {
    const me = staff.find((s) => s.id === p.staffId);
    return me?.lead ? 'lead' : 'staff';
  }
  if (p.kind === 'copy' && p.profileId === r.ccProfile) return 'copy';
  if (r.supporters?.includes(p.profileId)) return 'supporter';
  if (r.public) return 'public';
  return 'none';
}

export const canView = (p: Persona, r: ServiceRequest, staff: StaffMember[]) => accessOf(p, r, staff) !== 'none';

/** The entries this person may read in the record. */
export function historyFor(p: Persona, r: ServiceRequest, staff: StaffMember[]): HistoryEntry[] {
  const a = accessOf(p, r, staff);
  if (a === 'lead' || a === 'staff') return r.history;
  if (a === 'requester' || a === 'copy' || a === 'supporter') return r.history.filter((h) => !h.internal);
  if (a === 'public') return r.history.filter((h) => h.action === 'created' || h.action === 'publish');
  return [];
}

// ---- Who can change it -------------------------------------------------------
export interface Check {
  ok: boolean;
  reason?: string;
}
const yes: Check = { ok: true };
const no = (reason: string): Check => ({ ok: false, reason });

const plain = (name: string) => name.replace(/\s*\(demo\)/, '');

/** Whether this person may take this action now, and if not, why (shown on screen). */
export function can(
  p: Persona,
  r: ServiceRequest,
  action: ActionId,
  staff: StaffMember[],
  orgs: OrgNames,
  now: Date = new Date(),
): Check {
  const a = accessOf(p, r, staff);
  const org = plain(orgs[r.toProfile] ?? 'the organization');
  const label = STATE_LABEL[r.state].toLowerCase();

  // "Me too" (Sprint 6): anyone who didn't send it and doesn't handle it can add their support.
  if (action === 'support') {
    if (r.requesterId === p.profileId) return no('You sent this one.');
    if (a === 'lead' || a === 'staff') return no(`${org} handles this request.`);
    if (a === 'copy') return no('You get a copy. You can comment instead.');
    if (!r.public) return no('Only requests posted to the map can be supported.');
    if (!isOpen(r.state)) return no('This request is closed.');
    if (a === 'supporter') return no('You already support this request.');
    return yes;
  }
  if (a === 'none' || a === 'public') return no(`Only the person who sent it and ${org} can change this request.`);
  if (a === 'supporter') return no(`You support this request and get its updates. Only the person who sent it and ${org} can change it.`);
  if (action === 'comment') {
    if (a !== 'copy') return no('Comments are for people who get a copy, such as the ward councillor. Use Send update or Send follow-up.');
    return r.state === 'withdrawn' ? no('The request was withdrawn.') : yes;
  }
  if (a === 'copy') return no(`You get a copy to stay informed and can comment. Only ${org} can change this request.`);

  const requesterAction = REQUESTER_ACTIONS.includes(action);
  if (a === 'requester' && !requesterAction) return no(`Only ${org} can do this.`);
  if ((a === 'lead' || a === 'staff') && requesterAction) return no('Only the person who sent the request can do this.');

  const leadOnly: ActionId[] = ['acknowledge', 'assign', 'decline', 'publish', 'reopen-staff'];
  if (a === 'staff' && leadOnly.includes(action)) return no(`Only the ${org} lead can acknowledge, assign, decline, reopen or publish.`);
  if (a === 'staff' && action !== 'note' && r.assigneeId !== p.staffId) return no('Only the person this request is assigned to can update or resolve it.');

  switch (action) {
    case 'acknowledge':
      return r.state === 'new' || r.state === 'reopened' ? yes : no(`Already ${label}.`);
    case 'assign':
    case 'update':
    case 'ask-info':
    case 'resolve':
    case 'decline':
      return isOpen(r.state) ? yes : no(`Not possible while the request is ${label}.`);
    case 'note':
      return yes;
    case 'publish':
      if (!r.public) return no('The sender chose to send this privately, so it stays off the map.');
      if (r.state !== 'resolved') return no('Resolve the request before publishing the outcome.');
      return r.outcome ? no('The outcome is already on the map.') : yes;
    case 'reopen-staff':
      return r.state === 'declined' || r.state === 'resolved' ? yes : no('Only a declined or resolved request can be reopened.');
    case 'reply':
      return r.state === 'needs-info' ? yes : no('Nobody has asked you a question.');
    case 'follow-up':
      return isOpen(r.state) || r.state === 'declined' ? yes : no(`Not possible while the request is ${label}.`);
    case 'reopen': {
      if (r.state !== 'resolved') return no('Only a resolved request can be reopened.');
      const since = r.resolvedAt ? (now.getTime() - new Date(r.resolvedAt).getTime()) / 86400000 : 0;
      return since <= REOPEN_DAYS ? yes : no(`You can reopen for ${REOPEN_DAYS} days after a request is resolved. Please send a new report.`);
    }
    case 'withdraw':
      return isOpen(r.state) ? yes : no(`Not possible while the request is ${label}.`);
    case 'rate':
      if (r.state !== 'resolved') return no('You can rate it once it is resolved.');
      return r.rating ? no('You already rated it.') : yes;
  }
  return no('Unknown action.');
}

// ---- Doing it ----------------------------------------------------------------
export interface ActionInput {
  text?: string;
  assigneeId?: string;
  /** "Was it fixed?" */
  rating?: 'fixed' | 'not-fixed';
}

const needsText: Partial<Record<ActionId, string>> = {
  update: 'Write the update for the person who sent it.',
  'ask-info': 'Write the question you need answered.',
  resolve: 'Say what was done, so the person knows.',
  decline: 'Explain why, so the person knows what to do next.',
  note: 'Write the note.',
  publish: 'Write the outcome the neighbourhood will see.',
  reply: 'Write your answer.',
  'follow-up': 'Write your message.',
  reopen: 'Say what is still wrong.',
};

export function validate(action: ActionId, input: ActionInput, r: ServiceRequest, staff: StaffMember[]): string | null {
  const text = (input.text ?? '').trim();
  if (needsText[action] && !text) return needsText[action]!;
  if (action === 'decline' && text.length < DECLINE_MIN) return `Give a reason of at least ${DECLINE_MIN} characters.`;
  if (action === 'rate' && input.rating !== 'fixed' && input.rating !== 'not-fixed') return 'Choose whether it was fixed.';
  if (action === 'rate' && input.rating === 'not-fixed' && !text) return 'Say what is still wrong.';
  if (action === 'assign') {
    const who = staff.find((s) => s.id === input.assigneeId);
    if (!who) return 'Choose who to assign it to.';
    if (who.orgProfileId !== r.toProfile) return 'You can only assign to your own team.';
    if (who.id === r.assigneeId) return `Already assigned to ${plain(who.name)}.`;
    if (r.assigneeId && !text) return 'Say why you are moving it to another team.';
  }
  return null;
}

/**
 * Apply an action. Returns a new request (the old one is not changed).
 * Throws PermissionError if the person may not do it, ValidationError if the input is incomplete.
 */
export function applyAction(
  r: ServiceRequest,
  p: Persona,
  action: ActionId,
  input: ActionInput,
  staff: StaffMember[],
  orgs: OrgNames,
  now: Date = new Date(),
): ServiceRequest {
  const check = can(p, r, action, staff, orgs, now);
  if (!check.ok) throw new PermissionError(check.reason!);
  const problem = validate(action, input, r, staff);
  if (problem) throw new ValidationError(problem);

  const at = now.toISOString();
  const text = input.text?.trim() || undefined;
  const next: ServiceRequest = { ...r, history: [...r.history], updatedAt: at };
  const log = (entry: Partial<HistoryEntry>) =>
    next.history.push({ at, byId: p.staffId ?? p.profileId, byName: p.label, action, text, ...entry });

  switch (action) {
    case 'acknowledge':
      next.state = r.assigneeId ? 'assigned' : 'acknowledged';
      log({});
      break;
    case 'assign': {
      const who = staff.find((s) => s.id === input.assigneeId)!;
      const before = staff.find((s) => s.id === r.assigneeId);
      next.assigneeId = who.id;
      if (r.state !== 'needs-info') next.state = 'assigned';
      log({
        text: before
          ? `Moved from ${plain(before.name)}, ${before.title} to ${plain(who.name)}, ${who.title}. ${text}`
          : `Assigned to ${plain(who.name)}, ${who.title}${text ? `. ${text}` : ''}`,
      });
      break;
    }
    case 'update':
      log({});
      break;
    case 'ask-info':
      next.stateBeforeInfo = r.state === 'needs-info' ? r.stateBeforeInfo : r.state;
      next.state = 'needs-info';
      log({});
      break;
    case 'resolve':
      next.state = 'resolved';
      next.resolvedAt = at;
      log({});
      break;
    case 'decline':
      next.state = 'declined';
      log({});
      break;
    case 'note':
      log({ internal: true });
      break;
    case 'comment':
      log({});
      break;
    case 'publish':
      next.outcome = text;
      log({});
      break;
    case 'reopen-staff':
      next.state = 'reopened';
      next.resolvedAt = undefined;
      log({});
      break;
    case 'reply':
      next.state = r.stateBeforeInfo && r.stateBeforeInfo !== 'needs-info' ? r.stateBeforeInfo : r.assigneeId ? 'assigned' : 'acknowledged';
      next.stateBeforeInfo = undefined;
      log({});
      break;
    case 'follow-up':
      log({});
      break;
    case 'reopen':
      next.state = 'reopened';
      next.resolvedAt = undefined;
      next.outcome = undefined; // the published outcome is no longer true
      log({});
      break;
    case 'withdraw':
      next.state = 'withdrawn';
      log({});
      break;
    case 'support':
      next.supporters = [...(r.supporters ?? []), p.profileId];
      log({});
      break;
    case 'rate':
      next.rating = { value: input.rating!, text, at };
      log({ text: input.rating === 'fixed' ? `Yes, it's fixed.${text ? ` ${text}` : ''}` : `Not fixed: ${text}` });
      break;
  }
  return next;
}

/** A record line for an attempt that was refused, so staff can see it happened. */
export function blockedEntry(p: Persona, action: ActionId, reason: string, now: Date = new Date()): HistoryEntry {
  return {
    at: now.toISOString(),
    byId: p.staffId ?? p.profileId,
    byName: p.label,
    action: 'blocked',
    text: `Tried to "${ACTION_LABEL[action]}". Not allowed: ${reason}`,
    internal: true,
  };
}

// ---- Helpers for the screens -------------------------------------------------

/** The 3-step progress ring and map popup use reported / acknowledged / resolved. */
export function ringStatus(s: RequestState): string {
  if (s === 'new') return 'reported';
  if (s === 'resolved') return 'resolved';
  if (s === 'declined' || s === 'withdrawn') return s;
  return 'acknowledged';
}

/** The four steps shown on the request: Sent, Received, Being handled (assigned), Resolved. */
export function stepsOf(r: ServiceRequest): { label: string; state: 'done' | 'current' | 'todo' }[] {
  const order = ['Sent', 'Received', 'Being handled', 'Resolved'];
  let at = 0;
  if (r.state === 'acknowledged' || r.state === 'reopened') at = 1;
  if (r.state === 'assigned') at = 2;
  if (r.state === 'needs-info') at = r.assigneeId ? 2 : 1;
  if (r.state === 'resolved') at = 3;
  if (r.state === 'declined' || r.state === 'withdrawn') at = 1;
  return order.map((label, i) => ({ label, state: i < at ? 'done' : i === at ? 'current' : 'todo' }));
}

/** "Who can see and change this", in plain words, for the access box. */
export function accessSummary(
  r: ServiceRequest,
  staff: StaffMember[],
  orgs: OrgNames,
  forRequester = false,
): { who: string; can: string }[] {
  const org = plain(orgs[r.toProfile] ?? 'The organization');
  const lead = staff.find((s) => s.orgProfileId === r.toProfile && s.lead);
  const assignee = staff.find((s) => s.id === r.assigneeId);
  // The person who sent it sees the organization only: no staff names or job titles (Nigel, Nov 2).
  const rows = [
    { who: forRequester ? 'You (you sent it)' : `${plain(r.requesterName)} (sent it)`, can: 'Sees updates and the record, answers questions, follows up, reopens or withdraws' },
    {
      who: forRequester ? org : `${org}${lead ? `: ${plain(lead.name)}, ${lead.title}` : ''}`,
      can: forRequester ? 'Handles it: sends you updates, may ask you questions, resolves it' : 'Sees everything; acknowledges, assigns, asks, declines, resolves, publishes',
    },
  ];
  if (assignee && !forRequester) rows.push({ who: `Assigned: ${plain(assignee.name)}, ${assignee.title}`, can: 'Sees everything; sends updates, asks questions, resolves' });
  if (r.ccProfile) rows.push({ who: `${plain(orgs[r.ccProfile] ?? 'Copy holder')} (copy)`, can: 'Reads it and its updates, and can comment; cannot change it' });
  const n = r.supporters?.length ?? 0;
  if (n) rows.push({ who: `${n} ${n === 1 ? 'neighbour' : 'neighbours'} (support it)`, can: 'Get its updates; cannot change it' });
  rows.push({ who: 'Everyone else', can: r.public ? 'Sees it on the map, with its status and outcome' : 'Cannot see it (sent privately)' });
  return rows;
}

// ---- Due dates (Sprint 6, Bhavana) -------------------------------------------

/** Target days to finish a request, by category. Illustrative: the real targets would come from the City and the BIA. */
export const TARGET_DAYS: Record<string, number> = {
  'Street lights': 5,
  Maintenance: 5,
  Roads: 7,
  'Roads and sidewalks': 7,
  Sidewalks: 7,
  'Garbage and recycling': 3,
  'Parks and trees': 10,
  'Roadworks and access': 5,
  'Business update': 5,
  'Corridor problem': 5,
};
export const DEFAULT_TARGET_DAYS = 7;

export const targetDays = (r: ServiceRequest) => TARGET_DAYS[r.category] ?? DEFAULT_TARGET_DAYS;

export function dueDate(r: ServiceRequest): Date {
  return new Date(new Date(r.createdAt).getTime() + targetDays(r) * 86400000);
}

/** Whole days past the due date (0 if not overdue, or if the request is closed). */
export function overdueDays(r: ServiceRequest, now: Date = new Date()): number {
  if (!isOpen(r.state)) return 0;
  const late = (now.getTime() - dueDate(r).getTime()) / 86400000;
  return late > 0 ? Math.ceil(late) : 0;
}

/** "Overdue by 3 days" / "Due Nov 6", in words so it never depends on colour. */
export function dueText(r: ServiceRequest, now: Date = new Date()): string {
  if (!isOpen(r.state)) return '';
  const late = overdueDays(r, now);
  if (late > 0) return `Overdue by ${late} day${late === 1 ? '' : 's'}`;
  return `Due ${dueDate(r).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

/** Queue counts for the summary tiles. */
export function queueCounts(list: ServiceRequest[], now: Date = new Date()) {
  return {
    new: list.filter((r) => r.state === 'new' || r.state === 'reopened').length,
    working: list.filter((r) => r.state === 'acknowledged' || r.state === 'assigned').length,
    waiting: list.filter((r) => r.state === 'needs-info').length,
    overdue: list.filter((r) => overdueDays(r, now) > 0).length,
    closed: list.filter((r) => !isOpen(r.state)).length,
  };
}

export type QueueFilter = 'open' | 'new' | 'mine' | 'waiting' | 'overdue' | 'closed' | 'all';
export type QueueSort = 'recent' | 'oldest' | 'supported';

export function filterQueue(list: ServiceRequest[], f: QueueFilter, p: Persona, now: Date = new Date(), sort: QueueSort = 'recent'): ServiceRequest[] {
  const sorted = [...list].sort((a, b) =>
    sort === 'oldest'
      ? a.createdAt.localeCompare(b.createdAt)
      : sort === 'supported'
        ? (b.supporters?.length ?? 0) - (a.supporters?.length ?? 0) || b.updatedAt.localeCompare(a.updatedAt)
        : b.updatedAt.localeCompare(a.updatedAt),
  );
  switch (f) {
    case 'overdue':
      return sorted.filter((r) => overdueDays(r, now) > 0);
    case 'open':
      return sorted.filter((r) => isOpen(r.state));
    case 'new':
      return sorted.filter((r) => r.state === 'new' || r.state === 'reopened');
    case 'mine':
      return sorted.filter((r) => r.assigneeId && r.assigneeId === p.staffId);
    case 'waiting':
      return sorted.filter((r) => r.state === 'needs-info');
    case 'closed':
      return sorted.filter((r) => !isOpen(r.state));
    default:
      return sorted;
  }
}

/** Build the request record for a report sent from "Report a problem". */
export function requestFromReport(
  report: {
    id: string;
    name: string;
    category?: string;
    placeId?: string | null;
    description?: string;
    reportedBy?: string;
    routedToProfile?: string;
    ccProfile?: string;
    updatedAt?: string;
    visibility?: unknown;
    photo?: unknown;
    point?: unknown;
  },
  requesterName: string,
  requesterKind: RequesterKind,
  now: Date = new Date(),
): ServiceRequest {
  if (!report.reportedBy || !report.routedToProfile) throw new ValidationError('A report needs a sender and a receiver.');
  if (report.reportedBy === report.routedToProfile) throw new ValidationError('An organization cannot send a request to itself.');
  const at = now.toISOString();
  return {
    id: `req-${report.id}`,
    issueId: report.id,
    title: report.name,
    category: report.category ?? 'Other',
    placeId: report.placeId ?? undefined,
    description: report.description,
    requesterId: report.reportedBy,
    requesterName,
    requesterKind,
    toProfile: report.routedToProfile,
    ccProfile: report.ccProfile,
    state: 'new',
    createdAt: at,
    updatedAt: at,
    public: report.visibility === 'public',
    photo: typeof report.photo === 'string' ? report.photo : undefined,
    point: Array.isArray(report.point) ? (report.point as [number, number]) : undefined,
    history: [{ at, byId: report.reportedBy, byName: requesterName, action: 'created', text: report.description }],
    illustrative: true,
  };
}

export function formatAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** "Reported by 4 neighbours": the sender plus everyone who supports it. */
export function neighboursText(r: ServiceRequest): string {
  const n = 1 + (r.supporters?.length ?? 0);
  return n === 1 ? '' : `Reported by ${n} neighbours`;
}
