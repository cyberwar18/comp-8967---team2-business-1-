// KAN-52 (Mounika): the reported content queue for Neighbr staff.
// Chats (Bhavana, KAN-51), Marketplace listings (Devu, KAN-53) and business posts that users report all
// land in one list. Staff choose Hide or Keep. No UI in here, so every rule can be tested on its own.
//
// Privacy:
//   - Neighbr staff see who reported something. The person it is about never does.
//   - The person who reported hears the outcome, and so does the person it is about (if it was hidden).
import type { MessageReport } from '../chats/chats';
import type { ListingReport } from '../marketplace/marketplace';

export type ReportKind = 'chat' | 'listing' | 'post';
export type ReportStatus = 'open' | 'hidden' | 'kept';

export const KIND_LABEL: Record<ReportKind, string> = { chat: 'Chat message', listing: 'Marketplace listing', post: 'Business post' };

export const POST_REPORT_REASONS = ['Spam or scam', 'Misleading or false', 'Offensive', 'Something else'] as const;
export type PostReportReason = (typeof POST_REPORT_REASONS)[number];

/** A report on a business post (the same shape as the other two, so the queue can treat them alike). */
export interface PostReport {
  id: string;
  postId: string;
  /** A copy of the post when it was reported, so staff can judge it even if it changes. */
  title: string;
  description: string;
  posterId: string; // profile id
  reportedBy: string; // profile id
  reason: PostReportReason;
  note: string;
  at: string;
  status: ReportStatus;
}

/** One line in the staff queue, whatever it is about. */
export interface QueueItem {
  /** Unique across kinds: "chat:report-1". */
  key: string;
  id: string; // the report's own id
  kind: ReportKind;
  reason: string;
  note: string;
  /** A copy of what was reported. */
  title: string;
  text: string;
  /** Who wrote or posted it, and who reported it (staff see both). */
  aboutName: string;
  reportedByName: string;
  at: string;
  status: ReportStatus;
}

export type NameOf = (profileId: string) => string;

export function fromMessages(reports: MessageReport[], nameOf: NameOf): QueueItem[] {
  return reports.map((r) => ({
    key: `chat:${r.id}`,
    id: r.id,
    kind: 'chat',
    reason: r.reason,
    note: r.note,
    title: 'Message in a chat',
    text: r.text,
    aboutName: nameOf(r.reportedProfile),
    reportedByName: nameOf(r.reportedBy),
    at: r.at,
    status: r.status,
  }));
}

export function fromListings(reports: ListingReport[], nameOf: NameOf): QueueItem[] {
  return reports.map((r) => ({
    key: `listing:${r.id}`,
    id: r.id,
    kind: 'listing',
    reason: r.reason,
    note: r.note,
    title: r.title,
    text: r.description,
    aboutName: r.sellerName || nameOf(r.sellerId),
    reportedByName: nameOf(r.reportedBy),
    at: r.at,
    status: r.status,
  }));
}

export function fromPosts(reports: PostReport[], nameOf: NameOf): QueueItem[] {
  return reports.map((r) => ({
    key: `post:${r.id}`,
    id: r.id,
    kind: 'post',
    reason: r.reason,
    note: r.note,
    title: r.title,
    text: r.description,
    aboutName: nameOf(r.posterId),
    reportedByName: nameOf(r.reportedBy),
    at: r.at,
    status: r.status,
  }));
}

/** Open reports first (newest first), then the ones already decided (newest first). */
export function sortQueue(items: QueueItem[]): QueueItem[] {
  const rank = (s: ReportStatus) => (s === 'open' ? 0 : 1);
  return [...items].sort((a, b) => rank(a.status) - rank(b.status) || b.at.localeCompare(a.at));
}

export type KindFilter = 'all' | ReportKind;
export type StatusFilter = 'open' | 'decided' | 'all';

export function filterQueue(items: QueueItem[], kind: KindFilter, status: StatusFilter): QueueItem[] {
  return items.filter((i) => (kind === 'all' || i.kind === kind) && (status === 'all' || (status === 'open' ? i.status === 'open' : i.status !== 'open')));
}

export function countByKind(items: QueueItem[], status: StatusFilter = 'open'): Record<KindFilter, number> {
  const open = filterQueue(items, 'all', status);
  return { all: open.length, chat: open.filter((i) => i.kind === 'chat').length, listing: open.filter((i) => i.kind === 'listing').length, post: open.filter((i) => i.kind === 'post').length };
}

export const STATUS_LABEL: Record<ReportStatus, string> = { open: 'Needs a decision', hidden: 'Hidden', kept: 'Kept up' };

/** Staff can only decide on a report once. */
export const canDecide = (item: Pick<QueueItem, 'status'>): boolean => item.status === 'open';

/** What the person who wrote or posted it hears when it is hidden. They are never told who reported it. */
export function hiddenNotice(kind: ReportKind, title: string): { title: string; text: string } {
  if (kind === 'chat') return { title: 'A message you sent', text: 'Neighbr staff removed this message because it broke the community rules.' };
  if (kind === 'listing') return { title, text: 'Neighbr staff removed your listing because it broke the community rules. It cannot be posted again.' };
  return { title, text: 'Neighbr staff removed your post because it broke the community rules.' };
}

/** What the person who reported hears. */
export function reporterNotice(kind: ReportKind, title: string, status: Exclude<ReportStatus, 'open'>): { title: string; text: string } {
  const what = kind === 'chat' ? 'the message you reported' : kind === 'listing' ? `the listing you reported` : 'the post you reported';
  return {
    title: kind === 'chat' ? 'Your report' : title,
    text: status === 'hidden' ? `Thank you. Neighbr staff reviewed ${what} and removed it.` : `Thank you. Neighbr staff reviewed ${what} and decided to keep it up.`,
  };
}

export const NOTE_MAX = 300;

/** Plain-words problem with a post report, or null. */
export function validatePostReport(reason: string, note: string): string | null {
  if (!(POST_REPORT_REASONS as readonly string[]).includes(reason)) return 'Choose a reason.';
  if (note.trim().length > NOTE_MAX) return `Keep your note under ${NOTE_MAX} characters.`;
  return null;
}

/** Who may report a post: anyone signed in, but not the person who posted it, and only once. */
export function canReportPost(
  reporterProfile: string,
  post: { reportedBy?: string; visibility?: string },
  existing: PostReport[],
  postId: string,
): { ok: boolean; reason?: string } {
  if (post.visibility !== 'public') return { ok: false, reason: 'Post not found.' };
  if (post.reportedBy === reporterProfile) return { ok: false, reason: 'You cannot report your own post.' };
  if (existing.some((r) => r.postId === postId && r.reportedBy === reporterProfile)) return { ok: false, reason: 'You already reported this post.' };
  return { ok: true };
}
