// Sprint 6 (Devu): where a request is, shown on its map pin and in the "You said, we did" list.
// No UI here, so every rule can be tested on its own.
//
// A pin that belongs to a request shows a short word under it ("Reported", "Being handled",
// "Resolved"), and its ring changes: green for resolved, grey for declined or withdrawn.
// The word is always there, so the status never depends on colour alone.
//
// Privacy: a request is private until the City or the BIA publishes the outcome. So the public map
// only ever shows resolved requests with their outcome; the person who sent a request also sees
// its progress on their own (private) pin. That is decided by the map's existing viewer rule, not here.
import type { MapItem } from './types';

export type RequestPhase = 'reported' | 'received' | 'handling' | 'needs-info' | 'reopened' | 'resolved' | 'declined' | 'withdrawn';

export interface PhaseStyle {
  phase: RequestPhase;
  label: string; // the word under the pin
  ring: string; // pin ring colour (white = still open)
}

const OPEN_RING = '#FFFFFF';
export const PHASES: Record<RequestPhase, PhaseStyle> = {
  reported: { phase: 'reported', label: 'Reported', ring: OPEN_RING },
  received: { phase: 'received', label: 'Received', ring: OPEN_RING },
  handling: { phase: 'handling', label: 'Being handled', ring: OPEN_RING },
  'needs-info': { phase: 'needs-info', label: 'Needs more info', ring: OPEN_RING },
  reopened: { phase: 'reopened', label: 'Reopened', ring: OPEN_RING },
  resolved: { phase: 'resolved', label: 'Resolved', ring: '#1B7F3B' },
  declined: { phase: 'declined', label: 'Declined', ring: '#4B5563' },
  withdrawn: { phase: 'withdrawn', label: 'Withdrawn', ring: '#4B5563' },
};

/** Words used by the request's own state (see STATE_LABEL in requests.ts). */
const BY_STATE: Record<string, RequestPhase> = {
  New: 'reported',
  Received: 'received',
  Assigned: 'handling',
  'Needs more info': 'needs-info',
  Reopened: 'reopened',
  Resolved: 'resolved',
  Declined: 'declined',
  Withdrawn: 'withdrawn',
};
/** The three step words on the pin's own status field. */
const BY_STATUS: Record<string, RequestPhase> = {
  reported: 'reported',
  acknowledged: 'received',
  resolved: 'resolved',
  declined: 'declined',
  withdrawn: 'withdrawn',
};

/** The phase of a request pin, or null if this item is not a request (a shop, an event, a poll...). */
export function phaseOf(item: Pick<MapItem, 'kind' | 'status'> & { requestState?: unknown }): PhaseStyle | null {
  if (item.kind !== 'issue') return null;
  const fromState = typeof item.requestState === 'string' ? BY_STATE[item.requestState] : undefined;
  const key = fromState ?? BY_STATUS[item.status];
  return key ? PHASES[key] : null;
}

export const isDone = (p: PhaseStyle) => p.phase === 'resolved';
export const isClosedWithoutFix = (p: PhaseStyle) => p.phase === 'declined' || p.phase === 'withdrawn';
export const isOpenPhase = (p: PhaseStyle) => !isDone(p) && !isClosedWithoutFix(p);

// ---- the filter on the map -----------------------------------------------------

export type StatusFilter = 'all' | 'open' | 'resolved' | 'declined';
export const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'In progress' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'declined', label: 'Declined' },
];

/** Other pins (shops, events, polls...) always stay; the filter only decides which request pins show. */
export function matchesStatusFilter(item: MapItem, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  const p = phaseOf(item);
  if (!p) return true;
  if (filter === 'open') return isOpenPhase(p);
  if (filter === 'resolved') return isDone(p);
  return isClosedWithoutFix(p);
}

/** How many request pins each filter would show (shown beside the chip). */
export function filterCounts(items: MapItem[]): Record<StatusFilter, number> {
  const out: Record<StatusFilter, number> = { all: 0, open: 0, resolved: 0, declined: 0 };
  for (const i of items) {
    const p = phaseOf(i);
    if (!p) continue;
    out.all += 1;
    if (isOpenPhase(p)) out.open += 1;
    else if (isDone(p)) out.resolved += 1;
    else out.declined += 1;
  }
  return out;
}

// ---- "You said, we did" ---------------------------------------------------------

export interface OutcomeCard {
  id: string; // the pin's id
  youSaid: string; // the public title of the request, e.g. "Street light out near Glidden Grocer"
  weDid: string;
  handledBy?: string;
  when?: string; // YYYY-MM-DD
  category: string;
}

const textOf = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/**
 * The published outcomes, newest first. Only a PUBLIC, resolved request counts, and only its public
 * title and the outcome text are used: never the sender's name or their original message.
 */
export function outcomeCards(items: MapItem[]): OutcomeCard[] {
  return items
    .filter((i) => i.kind === 'issue' && i.status === 'resolved' && (i.visibility === undefined || i.visibility === 'public'))
    .map((i) => {
      const weDid = textOf(i.outcome) ?? textOf(i.description)?.replace(/^Outcome:\s*/, '');
      return weDid
        ? ({ id: i.id, youSaid: i.name, weDid, handledBy: textOf(i.handledBy), when: textOf(i.outcomeAt) ?? textOf(i.updatedAt), category: i.category } as OutcomeCard)
        : null;
    })
    .filter((c): c is OutcomeCard => c !== null)
    .sort((a, b) => (b.when ?? '').localeCompare(a.when ?? ''));
}
