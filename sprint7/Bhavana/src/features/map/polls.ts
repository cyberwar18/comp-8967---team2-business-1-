// Demo voting for BIA polls. Votes are kept in memory only (nothing is saved or sent),
// and each person can vote once per poll per visit.
export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface PollLike {
  id: string;
  status: string; // "open" or "closed" in the data; the pin's status text starts with "open" while it is open
  options: PollOption[];
}

export interface PollState {
  counts: Record<string, number>; // votes per option, starting from the demo numbers
  myVote: string | null;
}

export function isOpen(poll: Pick<PollLike, 'status'>): boolean {
  return poll.status.startsWith('open');
}

export function initialPollState(poll: PollLike): PollState {
  return { counts: Object.fromEntries(poll.options.map((o) => [o.id, o.votes])), myVote: null };
}

export function canVote(poll: PollLike, state: PollState): boolean {
  return isOpen(poll) && state.myVote === null;
}

/** Counts one vote. Ignored when the poll is closed, the person already voted, or the option is unknown. */
export function castVote(poll: PollLike, state: PollState, optionId: string): PollState {
  if (!canVote(poll, state) || !(optionId in state.counts)) return state;
  return { counts: { ...state.counts, [optionId]: state.counts[optionId] + 1 }, myVote: optionId };
}

export interface PollResult {
  id: string;
  label: string;
  votes: number;
  percent: number; // whole number, 0-100
  mine: boolean;
}

export function pollResults(poll: PollLike, state: PollState): { total: number; rows: PollResult[] } {
  const total = poll.options.reduce((t, o) => t + (state.counts[o.id] ?? 0), 0);
  const rows = poll.options.map((o) => {
    const votes = state.counts[o.id] ?? 0;
    return { id: o.id, label: o.label, votes, percent: total === 0 ? 0 : Math.round((votes / total) * 100), mine: state.myVote === o.id };
  });
  return { total, rows };
}
