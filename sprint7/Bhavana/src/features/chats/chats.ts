// KAN-51 (Bhavana): people and organizations can message each other safely.
// No UI in here, so every rule can be tested on its own. The data layer (src/data/api.ts) uses these
// rules and only ever hands a screen a "view" of a chat: what that person is allowed to see.
//
// Three kinds of chat:
//   - request:      the person who sent a request <-> the organization handling it (from the request page)
//   - organization: a community group, school, library or the BIA <-> one of its members
//   - direct:       person <-> person (for example "Message the seller" in the Marketplace, KAN-53)
//
// Safety:
//   - "Who can message me" (KAN-50 settings): anyone / only my organizations / nobody new
//   - block a person or organization (not in a request chat: there you report, or withdraw the request)
//   - report a message: it goes to Neighbr staff (reported content queue, KAN-52)
//   - people outside an organization see the organization's name, never staff names (Nigel, Nov 2)
import type { Persona } from '../requests/requests';

export type ChatKind = 'request' | 'organization' | 'direct';

export interface ChatMessage {
  id: string;
  /** Profile of the side that wrote it: a person, or the organization a staff member wrote for. */
  from: string;
  /** Who at the organization wrote it. Only colleagues ever see this. */
  byStaffId?: string;
  byName: string;
  text: string;
  at: string; // ISO date-time
}

export interface Conversation {
  id: string;
  kind: ChatKind;
  /** The two sides, as profile ids. For a request chat: [sender, organization handling it]. */
  members: [string, string];
  requestId?: string;
  /** Title of a request chat (the request's title). */
  title?: string;
  /** Names of people who are not in the main profile list (illustrative). */
  names?: Record<string, string>;
  messages: ChatMessage[];
  /** How many messages each side has read (by profile id). */
  readCount: Record<string, number>;
  illustrative?: boolean;
}

export type MessageSetting = 'anyone' | 'organizations' | 'nobody';
export const SETTING_LABEL: Record<MessageSetting, string> = {
  anyone: 'Anyone on Neighbr',
  organizations: 'Only organizations I belong to',
  nobody: 'Nobody new (chats about my requests still work)',
};

export const REPORT_REASONS = ['Spam or scam', 'Harassment or abuse', 'Unsafe or threatening', 'Something else'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface MessageReport {
  id: string;
  chatId: string;
  messageId: string;
  /** Who reported it (profile id). Neighbr staff see this; the reported person never does. */
  reportedBy: string;
  /** Who wrote the reported message (profile id). */
  reportedProfile: string;
  reason: ReportReason;
  note: string;
  /** A copy of the message, so staff can judge it even if the chat changes. */
  text: string;
  at: string;
  status: 'open' | 'hidden' | 'kept';
}

/** Everything the rules need to know besides the chat itself. */
export interface ChatContext {
  /** Display names by profile id (organizations and people). */
  names: Record<string, string>;
  /** Organization profile -> the profiles of its members it may message. */
  orgMembers: Record<string, string[]>;
  /** Profile -> profiles they blocked. */
  blocks: Record<string, string[]>;
  /** Profile -> who can message them (default: anyone). */
  settings: Record<string, MessageSetting>;
}

export interface Check {
  ok: boolean;
  reason?: string;
}
const yes: Check = { ok: true };
const no = (reason: string): Check => ({ ok: false, reason });

export const MESSAGE_MAX = 1000;

export const plain = (name: string) => name.replace(/\s*\(demo\)/, '');

/** "Jamie K." + "." -> "Jamie K." (no double full stop). */
export const endSentence = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

export function nameOf(profileId: string, ctx: ChatContext, c?: Conversation): string {
  return plain(c?.names?.[profileId] ?? ctx.names[profileId] ?? 'Someone');
}

export const isOrganization = (profileId: string, ctx: ChatContext) => profileId in ctx.orgMembers;

/** The organizations this person belongs to (and so may message). */
export function organizationsOf(profileId: string, ctx: ChatContext): string[] {
  return Object.keys(ctx.orgMembers).filter((org) => ctx.orgMembers[org].includes(profileId));
}

export const otherSide = (c: Conversation, me: string): string => (c.members[0] === me ? c.members[1] : c.members[0]);

export const isMember = (p: Persona, c: Conversation) => c.members.includes(p.profileId);

const isBlocked = (by: string, who: string, ctx: ChatContext) => (ctx.blocks[by] ?? []).includes(who);

// ---- Starting and sending ----------------------------------------------------

/** May this person start a new chat with that profile? If not, why (shown on screen). */
export function canStart(p: Persona, to: string, ctx: ChatContext): Check {
  const me = p.profileId;
  const them = nameOf(to, ctx);
  if (to === me) return no('You cannot message yourself.');
  if (p.kind === 'copy') return no('The ward councillor comments on requests instead of starting chats.');
  if (p.kind === 'staff' && !isOrganization(me, ctx)) return no('City staff message people about their requests only. Open the request to message the sender.');
  if (isBlocked(me, to, ctx)) return no(`You blocked ${endSentence(them)} Unblock them to send a message.`);
  // Never say "they blocked you": that would tell the blocked person.
  if (isBlocked(to, me, ctx)) return no(`${them} isn't accepting messages from you.`);
  const setting = ctx.settings[to] ?? 'anyone';
  if (setting === 'nobody') return no(`${them} isn't accepting new messages.`);
  if (setting === 'organizations' && !(ctx.orgMembers[me] ?? []).includes(to)) return no(`${them} only accepts messages from organizations they belong to.`);
  return yes;
}

/** May this person send a message in this chat now? */
export function canSend(p: Persona, c: Conversation, ctx: ChatContext): Check {
  if (!isMember(p, c)) return no('You are not part of this chat.');
  if (p.kind === 'copy') return no('The ward councillor comments on requests instead.');
  // A chat about a request stays open between the sender and the organization handling it.
  if (c.kind === 'request') return yes;
  const other = otherSide(c, p.profileId);
  const them = nameOf(other, ctx, c);
  if (isBlocked(p.profileId, other, ctx)) return no(`You blocked ${endSentence(them)} Unblock them to send a message.`);
  if (isBlocked(other, p.profileId, ctx)) return no(`${them} isn't accepting messages from you.`);
  return yes;
}

export function validateMessage(text: string): string | null {
  const t = text.trim();
  if (!t) return 'Write a message first.';
  if (t.length > MESSAGE_MAX) return `Keep it under ${MESSAGE_MAX} characters.`;
  return null;
}

// ---- Blocking and reporting --------------------------------------------------

export function canBlock(p: Persona, c: Conversation): Check {
  if (!isMember(p, c)) return no('You are not part of this chat.');
  if (c.kind === 'request') return no("Chats about a request can't be blocked. Report a message if it's unsafe, or withdraw the request.");
  return yes;
}

export function block(blocks: Record<string, string[]>, me: string, who: string): Record<string, string[]> {
  const mine = blocks[me] ?? [];
  return mine.includes(who) ? blocks : { ...blocks, [me]: [...mine, who] };
}

export function unblock(blocks: Record<string, string[]>, me: string, who: string): Record<string, string[]> {
  return { ...blocks, [me]: (blocks[me] ?? []).filter((x) => x !== who) };
}

export function canReport(p: Persona, c: Conversation, messageId: string, reports: MessageReport[]): Check {
  const m = c.messages.find((x) => x.id === messageId);
  if (!m || !isMember(p, c)) return no('Message not found.');
  if (m.from === p.profileId) return no('You cannot report your own message.');
  if (reports.some((r) => r.chatId === c.id && r.messageId === messageId && r.reportedBy === p.profileId)) return no('You already reported this message.');
  return yes;
}

// ---- What a person sees ------------------------------------------------------

export interface MessageView {
  id: string;
  /** "You", a colleague's name (staff only), the organization's name, or the person's name. */
  who: string;
  mine: boolean;
  text: string;
  at: string;
  /** This viewer reported it. */
  reported: boolean;
}

export interface ChatView {
  id: string;
  kind: ChatKind;
  title: string;
  /** "About your request", "Your group", "Member", "Direct message". */
  label: string;
  /** The other side's profile id and name. */
  other: string;
  otherName: string;
  requestId?: string;
  messages: MessageView[];
  unread: number;
  lastAt: string;
  canSend: Check;
  canBlock: Check;
  blocked: boolean;
}

/** Who wrote a message, as this viewer may see it. Staff names stay inside their own organization. */
export function whoWrote(m: ChatMessage, p: Persona, c: Conversation, ctx: ChatContext): string {
  if (m.from === p.profileId) {
    // A colleague at the same organization: staff see who it was. Otherwise it was you.
    if (m.byStaffId && p.staffId && m.byStaffId !== p.staffId) return plain(m.byName);
    if (!m.byStaffId && p.staffId) return plain(m.byName);
    return 'You';
  }
  return nameOf(m.from, ctx, c);
}

export function unreadCount(p: Persona, c: Conversation): number {
  const read = c.readCount[p.profileId] ?? 0;
  return c.messages.slice(read).filter((m) => m.from !== p.profileId).length;
}

export function labelFor(p: Persona, c: Conversation, ctx: ChatContext): string {
  if (c.kind === 'request') return c.members[0] === p.profileId ? 'About your request' : 'About a request sent to you';
  if (c.kind === 'organization') return isOrganization(p.profileId, ctx) ? 'Member' : 'Your group';
  return 'Direct message';
}

/**
 * The only shape a screen ever gets. Staff ids and staff names are removed for anyone outside the
 * organization, so they never reach that person's browser (not just hidden on screen).
 */
export function viewFor(p: Persona, c: Conversation, ctx: ChatContext, reports: MessageReport[]): ChatView {
  const other = otherSide(c, p.profileId);
  const otherName = nameOf(other, ctx, c);
  return {
    id: c.id,
    kind: c.kind,
    title: c.kind === 'request' ? c.title ?? 'Request' : otherName,
    label: labelFor(p, c, ctx),
    other,
    otherName,
    requestId: c.requestId,
    messages: c.messages.map((m) => ({
      id: m.id,
      who: whoWrote(m, p, c, ctx),
      mine: m.from === p.profileId,
      text: m.text,
      at: m.at,
      reported: reports.some((r) => r.chatId === c.id && r.messageId === m.id && r.reportedBy === p.profileId),
    })),
    unread: unreadCount(p, c),
    lastAt: c.messages.at(-1)?.at ?? '',
    canSend: canSend(p, c, ctx),
    canBlock: canBlock(p, c),
    blocked: isBlocked(p.profileId, other, ctx),
  };
}

/** The chats this person can see, newest first. */
export function chatsFor(p: Persona, all: Conversation[], ctx: ChatContext, reports: MessageReport[]): ChatView[] {
  return all
    .filter((c) => isMember(p, c) && p.kind !== 'copy')
    .map((c) => viewFor(p, c, ctx, reports))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/** Who this person can start a chat with: an organization's members, or a person's organizations. */
export function contactsFor(p: Persona, ctx: ChatContext): { id: string; name: string }[] {
  if (p.kind === 'copy') return [];
  const ids = isOrganization(p.profileId, ctx) ? ctx.orgMembers[p.profileId] : p.kind === 'staff' ? [] : organizationsOf(p.profileId, ctx);
  return ids.map((id) => ({ id, name: nameOf(id, ctx) })).sort((a, b) => a.name.localeCompare(b.name));
}

/** "Nov 12, 3:05 PM" */
export function formatWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}
