// Sprint 6 (Devu): request status on map pins, the filter, and the "You said, we did" cards.
import { afterEach, describe, expect, it } from 'vitest';
import { PHASES, filterCounts, matchesStatusFilter, outcomeCards, phaseOf } from './requestStatus';
import type { MapItem } from './types';
import { actOnRequest, clearSubmittedReports, getMapData } from '../../data/api';
import { personaById } from '../requests/personas';

afterEach(clearSubmittedReports);

const pin = (over: Partial<MapItem> & Record<string, unknown>): MapItem =>
  ({ id: 'i', kind: 'issue', name: 'Pothole near the diner', category: 'Roads', status: 'reported', lat: 1, lng: 1, ...over }) as MapItem;

describe('phaseOf', () => {
  it('names where a request is, in words', () => {
    expect(phaseOf(pin({ status: 'reported' }))?.label).toBe('Reported');
    expect(phaseOf(pin({ status: 'acknowledged' }))?.label).toBe('Received');
    expect(phaseOf(pin({ status: 'acknowledged', requestState: 'Assigned' }))?.label).toBe('Being handled');
    expect(phaseOf(pin({ status: 'acknowledged', requestState: 'Needs more info' }))?.label).toBe('Needs more info');
    expect(phaseOf(pin({ status: 'resolved' }))?.label).toBe('Resolved');
    expect(phaseOf(pin({ status: 'declined' }))?.label).toBe('Declined');
    expect(phaseOf(pin({ status: 'withdrawn' }))?.label).toBe('Withdrawn');
  });

  it('is nothing for a shop, an event or a poll', () => {
    expect(phaseOf(pin({ kind: 'place', status: 'open' }))).toBeNull();
    expect(phaseOf(pin({ kind: 'poll', status: 'open' }))).toBeNull();
    expect(phaseOf(pin({ kind: 'event', status: 'upcoming' }))).toBeNull();
  });

  it('never relies on the ring colour: every phase has a word, and open ones keep the plain white ring', () => {
    for (const p of Object.values(PHASES)) expect(p.label.length).toBeGreaterThan(3);
    expect(PHASES.reported.ring).toBe('#FFFFFF');
    expect(PHASES.handling.ring).toBe('#FFFFFF');
    expect(PHASES.resolved.ring).not.toBe('#FFFFFF');
    expect(PHASES.declined.ring).not.toBe(PHASES.resolved.ring);
  });
});

describe('the status filter', () => {
  const items = [
    pin({ id: 'a', status: 'reported' }),
    pin({ id: 'b', status: 'acknowledged', requestState: 'Assigned' }),
    pin({ id: 'c', status: 'resolved' }),
    pin({ id: 'd', status: 'declined' }),
    pin({ id: 'e', status: 'withdrawn' }),
    pin({ id: 'shop', kind: 'place', status: 'open' }),
  ];
  const ids = (f: Parameters<typeof matchesStatusFilter>[1]) => items.filter((i) => matchesStatusFilter(i, f)).map((i) => i.id);

  it('keeps every other pin whatever you choose', () => {
    for (const f of ['all', 'open', 'resolved', 'declined'] as const) expect(ids(f)).toContain('shop');
  });
  it('filters only the request pins', () => {
    expect(ids('all')).toEqual(['a', 'b', 'c', 'd', 'e', 'shop']);
    expect(ids('open')).toEqual(['a', 'b', 'shop']);
    expect(ids('resolved')).toEqual(['c', 'shop']);
    expect(ids('declined')).toEqual(['d', 'e', 'shop']);
  });
  it('counts what each chip would show', () => {
    expect(filterCounts(items)).toEqual({ all: 5, open: 2, resolved: 1, declined: 2 });
  });
});

describe('"You said, we did" cards', () => {
  it('uses only public, resolved requests, with the public title and the outcome', () => {
    const cards = outcomeCards([
      pin({ id: 'ok', status: 'resolved', visibility: 'public', outcome: 'New bulb fitted.', outcomeAt: '2026-11-02', handledBy: 'City of Windsor 311' }),
      pin({ id: 'private', status: 'resolved', visibility: 'private until approved', outcome: 'secret' }),
      pin({ id: 'open', status: 'acknowledged', visibility: 'public', outcome: 'not done yet' }),
      pin({ id: 'noText', status: 'resolved', visibility: 'public' }),
    ]);
    expect(cards.map((c) => c.id)).toEqual(['ok']);
    expect(cards[0]).toMatchObject({ youSaid: 'Pothole near the diner', weDid: 'New bulb fitted.', handledBy: 'City of Windsor 311', when: '2026-11-02' });
  });

  it('puts the newest first', () => {
    const cards = outcomeCards([
      pin({ id: 'old', status: 'resolved', outcome: 'a', outcomeAt: '2026-10-01' }),
      pin({ id: 'new', status: 'resolved', outcome: 'b', outcomeAt: '2026-11-03' }),
    ]);
    expect(cards.map((c) => c.id)).toEqual(['new', 'old']);
  });

  it('has the demo data’s two published outcomes and the BIA’s resolved update', async () => {
    const { updates } = await getMapData();
    const ids = outcomeCards(updates).map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['issue-07', 'issue-08', 'issue-06']));
    expect(ids).not.toContain('issue-05'); // the resident's own report is still private
  });
});

describe('a request’s progress reaches its map pin', () => {
  it('shows each step in words, and only the outcome becomes public', async () => {
    const lead = personaById('city-lead');
    const crew = personaById('city-crew');
    const stateOf = async () => (await getMapData()).updates.find((u) => u.id === 'issue-05')!;

    expect(phaseOf(await stateOf())?.label).toBe('Reported');
    await actOnRequest('req-issue-05', lead, 'acknowledge');
    expect(phaseOf(await stateOf())?.label).toBe('Received');
    await actOnRequest('req-issue-05', lead, 'assign', { assigneeId: 'staff-311-roads' });
    expect(phaseOf(await stateOf())?.label).toBe('Being handled');
    await actOnRequest('req-issue-05', crew, 'ask-info', { text: 'Which pole is it?' });
    expect(phaseOf(await stateOf())?.label).toBe('Needs more info');

    // still private all the way: not a card, no outcome text
    let p = await stateOf();
    expect(p.visibility).toBe('private until approved');
    expect(outcomeCards([p])).toEqual([]);
    expect(p.outcome).toBeUndefined();

    await actOnRequest('req-issue-05', personaById('resident'), 'reply', { text: 'The one by the pharmacy.' });
    await actOnRequest('req-issue-05', crew, 'resolve', { text: 'Bulb replaced.' });
    expect(phaseOf(await stateOf())?.label).toBe('Resolved');
    expect((await stateOf()).visibility).toBe('private until approved');
    // Nigel (Nov 2): the sender chose "Send privately", so the outcome never goes on the map
    await expect(actOnRequest('req-issue-05', lead, 'publish', { text: 'Bulb replaced on Nov 8.' })).rejects.toThrow(/privately/);
    expect(outcomeCards([await stateOf()])).toEqual([]);
  });

  it('a request the sender put on the map becomes a "You said, we did" card once published', async () => {
    const lead = personaById('city-lead');
    const crew = personaById('city-crew');
    const stateOf = async () => (await getMapData()).updates.find((u) => u.id === 'issue-req-07')!;
    expect(phaseOf(await stateOf())?.label).toBe('Being handled');
    await actOnRequest('req-07', crew, 'resolve', { text: 'Pothole filled.' });
    let p = await stateOf();
    expect(phaseOf(p)?.label).toBe('Resolved');
    expect(p.outcome).toBeUndefined(); // resolved is not yet published
    await actOnRequest('req-07', lead, 'publish', { text: 'Pothole filled on Nov 8.' });
    p = await stateOf();
    expect(p).toMatchObject({ visibility: 'public', outcome: 'Pothole filled on Nov 8.', handledBy: 'City of Windsor 311' });
    expect(outcomeCards([p])[0]).toMatchObject({ youSaid: 'Pothole on Wyandotte at Pierre Ave', weDid: 'Pothole filled on Nov 8.' });
    expect(JSON.stringify(outcomeCards([p]))).not.toMatch(/Chris|profile-resident/);
  });

  it('shows a reopened outcome as a request again, not as an outcome', async () => {
    const lead = personaById('city-lead');
    const stateOf = async () => (await getMapData()).updates.find((u) => u.id === 'issue-07')!;
    expect(outcomeCards([await stateOf()]).length).toBe(1);
    await actOnRequest('req-11', lead, 'reopen-staff');
    const p = await stateOf();
    expect(phaseOf(p)?.label).toBe('Reopened');
    expect(p.outcome).toBeUndefined();
    expect(outcomeCards([p])).toEqual([]); // no longer a "You said, we did" card
  });
});
