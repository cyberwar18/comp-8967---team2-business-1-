import { describe, expect, it } from 'vitest';
import { buildPollSection } from './pollPopup';
import type { PollState } from './polls';
import type { MapItem } from './types';

const item = (status: string): MapItem => ({
  id: 'poll-t',
  kind: 'poll',
  name: 'Test poll',
  category: 'BIA poll',
  status,
  lat: 0,
  lng: 0,
  options: [
    { id: 'a', label: 'Yes', votes: 3 },
    { id: 'b', label: 'No', votes: 1 },
  ],
});

describe('poll popup', () => {
  it('shows a button per option while the poll is open, then the results after a vote', () => {
    const store = new Map<string, PollState>();
    const el = buildPollSection(item('open until Nov 6'), store);
    const buttons = el.querySelectorAll<HTMLButtonElement>('button.cm-vote');
    expect([...buttons].map((b) => b.textContent)).toEqual(['Yes', 'No']);
    buttons[0].click();
    expect(el.querySelectorAll('button')).toHaveLength(0); // one vote each
    expect(el.textContent).toContain('✓ Yes (your vote)');
    expect(el.textContent).toContain('80% (4)');
    expect(el.querySelector('[role="status"]')?.textContent).toMatch(/demo vote/i);
    expect(el.textContent).toContain('5 votes');
  });
  it('remembers the vote when the popup is opened again', () => {
    const store = new Map<string, PollState>();
    buildPollSection(item('open until Nov 6'), store).querySelector<HTMLButtonElement>('button.cm-vote')!.click();
    const again = buildPollSection(item('open until Nov 6'), store);
    expect(again.querySelectorAll('button')).toHaveLength(0);
    expect(again.textContent).toContain('(your vote)');
  });
  it('shows final results with no buttons for a closed poll', () => {
    const el = buildPollSection(item('closed'), new Map());
    expect(el.querySelectorAll('button')).toHaveLength(0);
    expect(el.textContent).toContain('Poll closed');
    expect(el.textContent).toContain('75% (3)');
  });
});
