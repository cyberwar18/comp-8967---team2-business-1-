// Sprint 6: the new screens (onboarding, report form choices, work queue, comments, notifications).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import raw from '../../data/mock-data.json';
import { Welcome } from '../../app/Welcome';
import { NotificationBell } from '../../app/Notifications';
import { ReportProblem } from '../report/ReportProblem';
import RequestsPage from './RequestsPage';
import { personaById } from './personas';
import { actOnRequest, clearSubmittedReports, setClockForTests } from '../../data/api';
import { DEMO_USER_ID, type CardData, type Item } from '../cards/cardData';

const cards = raw as unknown as CardData;
const resident = personaById('resident');
const lead = personaById('city-lead');
const councillor = personaById('councillor');
const bia = personaById('bia-lead');

beforeEach(() => {
  setClockForTests(() => new Date('2026-11-04T15:00:00Z'));
  window.location.hash = '#/requests';
});
afterEach(() => {
  cleanup();
  clearSubmittedReports();
  setClockForTests(null);
});

describe('onboarding', () => {
  it('lists people, organizations and staff, and joins as the chosen type', () => {
    const onJoin = vi.fn();
    render(<Welcome current={resident} onJoin={onJoin} />);
    expect(screen.getByRole('heading', { name: 'Who are you joining as?' })).toBeTruthy();
    for (const g of ['Residents and businesses', 'Organizations', 'Staff who handle requests']) expect(screen.getByRole('heading', { name: g })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /School staff/ }));
    expect(screen.getByText('your workspace in Community')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onJoin).toHaveBeenCalledWith(expect.objectContaining({ id: 'school-staff', landing: 'community' }));
  });
});

describe('report form: who can see it', () => {
  it('sends privately by default, or posts to the map when chosen', async () => {
    const onSubmit = vi.fn(async (_r: Item) => {});
    render(<ReportProblem data={cards} mode="me" viewerId={DEMO_USER_ID} from={[-82.9683, 42.3289]} onSubmit={onSubmit} onShow={vi.fn()} onClose={vi.fn()} />);
    expect((screen.getByRole('radio', { name: /Send privately/ }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: 'Street light out' }));
    fireEvent.change(screen.getByLabelText('Where is it?'), { target: { value: 'place-08' } });
    fireEvent.click(screen.getByRole('radio', { name: /Post to the map/ }));
    expect(screen.getByText(/appears on the map for everyone/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    await screen.findByRole('heading', { name: 'Report sent' });
    expect(onSubmit.mock.calls[0][0].visibility).toBe('public');
  });

  it('offers to pick the spot on the map when the map is ready', () => {
    const onPick = vi.fn();
    render(<ReportProblem data={cards} mode="me" viewerId={DEMO_USER_ID} from={[-82.9683, 42.3289]} onSubmit={vi.fn()} onShow={vi.fn()} onClose={vi.fn()} onPickOnMap={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Or pick the spot on the map' }));
    expect(onPick).toHaveBeenCalled();
    expect(screen.getByLabelText('Photo (optional)')).toBeTruthy();
  });
});

describe('work queue (Bhavana)', () => {
  it('shows overdue requests in words, with a count', async () => {
    render(<RequestsPage persona={lead} />);
    await screen.findByRole('heading', { name: 'City of Windsor 311: work queue' });
    const tiles = screen.getByRole('list', { name: 'Summary' });
    expect(within(tiles).getByText('Overdue')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Overdue' }));
    expect(screen.getAllByText(/^Overdue by \d+ days?$/).length).toBeGreaterThan(0);
  });

  it('the councillor can comment, and the comment reaches the resident', async () => {
    window.location.hash = '#/requests?id=req-issue-05';
    render(<RequestsPage persona={councillor} />);
    await screen.findByRole('heading', { name: 'Ward Councillor: copies' });
    fireEvent.change(screen.getByLabelText(/Your comment/), { target: { value: 'I have asked for this to be prioritised.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add a comment' }));
    await screen.findByText('Done: Add a comment.');
    cleanup();
    render(<RequestsPage persona={resident} />);
    const record = await screen.findByRole('region', { name: 'Record' });
    expect(within(record).getByText('I have asked for this to be prioritised.')).toBeTruthy();
  });

  it('the sender sees the organization, never staff names', async () => {
    await actOnRequest('req-issue-05', lead, 'acknowledge');
    await actOnRequest('req-issue-05', lead, 'assign', { assigneeId: 'staff-311-roads' });
    window.location.hash = '#/requests?id=req-issue-05';
    render(<RequestsPage persona={resident} />);
    const record = await screen.findByRole('region', { name: 'Record' });
    expect(record.textContent).not.toMatch(/Jordan|Sam|intake lead|crew/);
    expect(record.textContent).toMatch(/City of Windsor 311/);
  });

  it('the BIA has a work queue and a "Sent by us" tab for its own requests', async () => {
    const { submitReport } = await import('../../data/api');
    await submitReport({
      id: 'report-bia', kind: 'issue', chip: 'issues', name: 'Street light out near the BIA office', category: 'Street lights', status: 'reported',
      lat: 42.3289, lng: -82.9661, placeId: 'place-15', reportedBy: 'profile-bia', routedToProfile: 'profile-city', illustrative: true,
    } as never);
    render(<RequestsPage persona={bia} />);
    fireEvent.click(await screen.findByRole('tab', { name: /Sent by us \(1\)/ }));
    expect(screen.getByRole('heading', { name: 'Requests we sent' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Street light out near the BIA office/ })).toBeTruthy();
  });
});

describe('notifications (Bhavana)', () => {
  it('shows how many are new, and lists them', async () => {
    await actOnRequest('req-issue-05', lead, 'acknowledge');
    await actOnRequest('req-issue-05', lead, 'ask-info', { text: 'Which side?' });
    render(<NotificationBell persona={resident} />);
    // 2 about the request, plus the sample hydrant-flushing area alert for the resident's street.
    const bell = await screen.findByRole('button', { name: 'Notifications, 3 new' });
    fireEvent.click(bell);
    await waitFor(() => expect(screen.getByText('City of Windsor 311 asked you a question')).toBeTruthy());
  });
});
