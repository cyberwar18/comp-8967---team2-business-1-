import { describe, expect, it } from 'vitest';
import { canVote, castVote, initialPollState, pollResults, type PollLike } from './polls';

const poll: PollLike = {
  id: 'p',
  status: 'open until Nov 6',
  options: [
    { id: 'a', label: 'Fri', votes: 12 },
    { id: 'b', label: 'Sat', votes: 21 },
    { id: 'c', label: 'Sun', votes: 9 },
  ],
};

describe('demo voting', () => {
  it('starts from the demo numbers', () => {
    const r = pollResults(poll, initialPollState(poll));
    expect(r.total).toBe(42);
    expect(r.rows.map((x) => x.percent)).toEqual([29, 50, 21]);
  });
  it('counts one vote and then stops', () => {
    const s1 = castVote(poll, initialPollState(poll), 'a');
    expect(s1.myVote).toBe('a');
    expect(pollResults(poll, s1).rows[0].votes).toBe(13);
    expect(canVote(poll, s1)).toBe(false);
    expect(castVote(poll, s1, 'b')).toBe(s1); // a second vote changes nothing
  });
  it('ignores votes on a closed poll or an unknown option', () => {
    const closed = { ...poll, status: 'closed' };
    expect(castVote(closed, initialPollState(closed), 'a').myVote).toBeNull();
    expect(castVote(poll, initialPollState(poll), 'zzz').myVote).toBeNull();
  });
  it('does not change the demo data it started from', () => {
    castVote(poll, initialPollState(poll), 'a');
    expect(poll.options[0].votes).toBe(12);
  });
  it('shows 0% for an empty poll instead of dividing by zero', () => {
    const empty = { ...poll, options: [{ id: 'a', label: 'x', votes: 0 }] };
    expect(pollResults(empty, initialPollState(empty)).rows[0].percent).toBe(0);
  });
});
