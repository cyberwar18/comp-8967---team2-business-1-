// The voting part of a BIA poll popup (plain DOM, because MapLibre popups are plain DOM).
// Open poll: one button per option. After voting, or when the poll is closed: results with
// numbers and bars, so the answer never depends on colour alone. Votes are demo only.
import type { MapItem } from './types';
import { canVote, castVote, initialPollState, pollResults, type PollLike, type PollOption, type PollState } from './polls';

export function pollOf(item: MapItem): PollLike {
  return { id: item.id, status: item.status, options: Array.isArray(item.options) ? (item.options as PollOption[]) : [] };
}

/** `store` keeps each poll's demo votes while the page is open, so reopening a poll shows the same results. */
export function buildPollSection(item: MapItem, store: Map<string, PollState>): HTMLElement {
  const poll = pollOf(item);
  const root = document.createElement('div');
  root.className = 'cm-poll';

  const render = (focusNote: boolean) => {
    root.replaceChildren();
    const state = store.get(poll.id) ?? initialPollState(poll);

    if (canVote(poll, state)) {
      const group = document.createElement('div');
      group.className = 'cm-vote-group';
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', `Vote: ${item.name}`);
      for (const o of poll.options) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cm-vote';
        b.textContent = o.label;
        b.addEventListener('click', () => {
          store.set(poll.id, castVote(poll, state, o.id));
          render(true);
        });
        group.append(b);
      }
      root.append(group);
      return;
    }

    const { total, rows } = pollResults(poll, state);
    const note = document.createElement('p');
    note.className = 'cm-poll__note';
    note.tabIndex = -1;
    note.setAttribute('role', 'status');
    note.textContent = state.myVote ? 'Thanks! Your demo vote is counted here only.' : 'Poll closed. Final results.';
    const list = document.createElement('ul');
    list.className = 'cm-results';
    list.setAttribute('aria-label', 'Results');
    for (const r of rows) {
      const li = document.createElement('li');
      const label = document.createElement('span');
      label.className = 'cm-results__label';
      label.textContent = r.mine ? `✓ ${r.label} (your vote)` : r.label;
      const num = document.createElement('span');
      num.className = 'cm-results__num';
      num.textContent = `${r.percent}% (${r.votes})`;
      const bar = document.createElement('span');
      bar.className = 'cm-bar';
      bar.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('span');
      fill.className = 'cm-bar__fill';
      fill.style.width = `${r.percent}%`;
      bar.append(fill);
      li.append(label, num, bar);
      list.append(li);
    }
    const count = document.createElement('p');
    count.className = 'cm-poll__total';
    count.textContent = `${total} votes`;
    root.append(note, list, count);
    if (focusNote) note.focus({ preventScroll: true });
  };

  render(false);
  return root;
}
