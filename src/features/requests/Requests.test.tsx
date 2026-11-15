// Sprint 5: the whole journey through the screens and the data adapter.
// Resident sends a report -> City 311 lead acknowledges and assigns -> crew asks a question ->
// resident answers -> crew resolves -> lead publishes the outcome, which everyone sees on the map.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import RequestsPage from './RequestsPage';
import { personaById } from './personas';
import { actOnRequest, clearSubmittedReports, getMapData, getRequests, setClockForTests, submitReport } from '../../data/api';
import { isVisibleTo } from '../cards/cardData';
import type { MapItem } from '../search/filters';

const resident = personaById('resident');
const lead = personaById('city-lead');
const crew = personaById('city-crew');
const bia = personaById('bia-lead');
const councillor = personaById('councillor');

const report = {
  id: 'report-test',
  kind: 'issue',
  chip: 'issues',
  name: 'Street light out near Second Spin Cycles',
  category: 'Street lights',
  status: 'reported',
  lat: 42.3289,
  lng: -82.968,
  placeId: 'place-08',
  description: 'Off since Friday.',
  reportedBy: 'profile-resident',
  routedToProfile: 'profile-city',
  ccProfile: 'profile-councillor',
  visibility: 'private until approved',
  illustrative: true,
} as unknown as MapItem;

beforeEach(() => {
  setClockForTests(() => new Date('2026-11-01T15:00:00Z'));
  window.location.hash = '#/requests';
});
afterEach(() => {
  cleanup();
  clearSubmittedReports();
  setClockForTests(null);
});

const issue = async () => (await getMapData()).updates.find((u) => u.id === 'report-test')!;

describe('data adapter: one request, end to end', () => {
  it('a sent report becomes a request for the City (and the councillor copy), not the BIA', async () => {
    await submitReport(report);
    expect((await getRequests(resident)).some((r) => r.id === 'req-report-test')).toBe(true);
    expect((await getRequests(lead)).some((r) => r.id === 'req-report-test')).toBe(true);
    expect((await getRequests(councillor)).some((r) => r.id === 'req-report-test')).toBe(true);
    expect((await getRequests(bia)).some((r) => r.id === 'req-report-test')).toBe(false);
  });

  it('status changes reach the map; a private report stays private and its outcome cannot be published', async () => {
    await submitReport(report);
    await actOnRequest('req-report-test', lead, 'acknowledge');
    expect((await issue()).status).toBe('acknowledged');
    await actOnRequest('req-report-test', lead, 'assign', { assigneeId: 'staff-311-roads' });
    await actOnRequest('req-report-test', crew, 'ask-info', { text: 'Which pole?' });
    await actOnRequest('req-report-test', resident, 'reply', { text: 'By the door.' });
    await actOnRequest('req-report-test', crew, 'resolve', { text: 'Lamp replaced.' });
    expect(isVisibleTo(await issue(), 'profile-business')).toBe(false); // the sender chose "Send privately"
    await expect(actOnRequest('req-report-test', lead, 'publish', { text: 'Street light repaired.' })).rejects.toThrow(/send this privately/);
  });

  it('a report posted to the map is public from the start, and its outcome appears on the pin', async () => {
    await submitReport({ ...report, visibility: 'public' } as MapItem);
    expect(isVisibleTo(await issue(), 'profile-business')).toBe(true);
    await actOnRequest('req-report-test', lead, 'acknowledge');
    await actOnRequest('req-report-test', lead, 'resolve', { text: 'Lamp replaced.' });
    await actOnRequest('req-report-test', lead, 'publish', { text: 'Street light repaired.' });
    const pin = await issue();
    expect(pin.status).toBe('resolved');
    expect(pin.description).toBe('Outcome: Street light repaired.');
  });

  it('a refused action is written to the record for staff, and the error is passed on', async () => {
    await submitReport(report);
    await expect(actOnRequest('req-report-test', crew, 'decline', { text: 'Not ours to fix here.' })).rejects.toThrow(/Only the City of Windsor 311 lead/);
    const [r] = (await getRequests(lead)).filter((x) => x.id === 'req-report-test');
    expect(r.history.at(-1)).toMatchObject({ action: 'blocked', internal: true });
    const [mine] = (await getRequests(resident)).filter((x) => x.id === 'req-report-test');
    expect(mine.history.some((h) => h.action === 'blocked')).toBe(false);
  });

  it('starts again from the demo data after clearing (tests only)', async () => {
    await actOnRequest('req-issue-05', lead, 'acknowledge');
    clearSubmittedReports();
    expect((await getRequests(lead)).find((r) => r.id === 'req-issue-05')?.state).toBe('new');
  });
});

describe('Requests page', () => {
  it('a resident sees My requests and who each one went to', async () => {
    render(<RequestsPage persona={resident} />);
    expect(await screen.findByRole('heading', { name: 'My requests' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Streetlight out near the pharmacy/ }));
    expect(screen.getByText('City of Windsor 311, copy to Ward Councillor')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send follow-up' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Assign' })).toBeNull();
  });

  it('the City lead acknowledges and assigns from the work queue', async () => {
    render(<RequestsPage persona={lead} />);
    expect(await screen.findByRole('heading', { name: 'City of Windsor 311: work queue' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Streetlight out near the pharmacy/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    await screen.findByText('Done: Acknowledge.');
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));
    await screen.findByText('Done: Assign.');
    const record = screen.getByRole('region', { name: 'Record' });
    expect(within(record).getByText(/Assigned to Sam Patel/)).toBeTruthy();
  });

  it('a locked action says why, and nothing changes', async () => {
    await actOnRequest('req-issue-05', lead, 'acknowledge');
    await actOnRequest('req-issue-05', lead, 'assign', { assigneeId: 'staff-311-roads' });
    window.location.hash = '#/requests?id=req-issue-05';
    render(<RequestsPage persona={crew} />);
    const decline = await screen.findByRole('button', { name: 'Decline' });
    expect(decline.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText('Locked for you')).toBeTruthy();
    fireEvent.click(decline);
    expect((await screen.findByRole('alert')).textContent).toMatch(/Not allowed\. Only the City of Windsor 311 lead/);
    expect((await getRequests(lead)).find((r) => r.id === 'req-issue-05')?.state).toBe('assigned');
  });

  it('the resident sees a question and answers it', async () => {
    await actOnRequest('req-issue-05', lead, 'acknowledge');
    await actOnRequest('req-issue-05', lead, 'ask-info', { text: 'Is it the light on the pharmacy side?' });
    window.location.hash = '#/requests?id=req-issue-05';
    render(<RequestsPage persona={resident} />);
    expect((await screen.findAllByText('Is it the light on the pharmacy side?')).length).toBeGreaterThan(0);
    expect(screen.getByText('Question for you')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'Yes, the pharmacy side.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    await screen.findByText('Done: Send reply.');
    expect((await getRequests(lead)).find((r) => r.id === 'req-issue-05')?.state).toBe('acknowledged');
  });

  it('another organization opening the link gets "no access"', async () => {
    window.location.hash = '#/requests?id=req-issue-05';
    render(<RequestsPage persona={bia} />);
    expect(await screen.findByRole('heading', { name: "You don't have access to this request" })).toBeTruthy();
  });

  it('the councillor sees copies read-only', async () => {
    window.location.hash = '#/requests?id=req-issue-05';
    render(<RequestsPage persona={councillor} />);
    expect(await screen.findByRole('heading', { name: 'Ward Councillor: copies' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Acknowledge' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText(/You get a copy to stay informed/)).toBeTruthy();
  });
});
