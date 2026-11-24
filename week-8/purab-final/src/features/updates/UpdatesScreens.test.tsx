// Sprint 6 demo features on screen: Updates page, Insights tab, "Me too" in the report form, "Was it fixed?".
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import raw from '../../data/mock-data.json';
import UpdatesPage from './UpdatesPage';
import RequestsPage from '../requests/RequestsPage';
import { ReportProblem } from '../report/ReportProblem';
import { personaById } from '../requests/personas';
import { actOnRequest, clearSubmittedReports, setClockForTests } from '../../data/api';
import { DEMO_USER_ID, type CardData } from '../cards/cardData';

const cards = raw as unknown as CardData;
const now = new Date('2026-11-04T15:00:00Z');

beforeEach(() => {
  setClockForTests(() => now);
  window.location.hash = '#/updates';
});
afterEach(() => {
  cleanup();
  clearSubmittedReports();
  setClockForTests(null);
});

describe('Updates page', () => {
  it('a business near roadwork posts "We’re open"', async () => {
    render(<UpdatesPage persona={personaById('business')} now={now} />);
    expect(await screen.findByText('Roadwork near your shop')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Post "We're open" to the map/ }));
    expect(await screen.findByText(/Your "We're open" notice is on the map/)).toBeTruthy();
  });

  it('the BIA sees every shop affected by roadwork', async () => {
    render(<UpdatesPage persona={personaById('bia-lead')} now={now} />);
    const section = (await screen.findByRole('heading', { name: /Shops affected by roadwork/ })).closest('section')!;
    expect(within(section).getByText("Rosa's Bakery")).toBeTruthy();
  });

  it('a resident sees the area alert and votes in the ward poll', async () => {
    render(<UpdatesPage persona={personaById('resident')} now={now} />);
    expect(await screen.findByText('Hydrant flushing on Wyandotte St E')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Wyandotte at Glidden' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vote' }));
    expect(await screen.findByText('You voted. Thank you.')).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Results' })).toBeTruthy();
  });

  it('a business owner cannot vote in the ward poll', async () => {
    render(<UpdatesPage persona={personaById('business')} now={now} />);
    expect(await screen.findByText(/Business owners can vote as themselves/)).toBeTruthy();
  });

  it('the City lead sends an area alert and sees how many it reaches', async () => {
    render(<UpdatesPage persona={personaById('city-lead')} now={now} />);
    await screen.findByRole('heading', { name: 'Send an area alert' });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Water shut-off' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'No water from 9 am to 2 pm for repairs.' } });
    fireEvent.change(screen.getByLabelText('Around'), { target: { value: 'place-08' } });
    expect(screen.getByText(/Reaches \d+ people in the demo/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Send alert' }));
    expect(await screen.findByText(/Alert sent: "Water shut-off"/)).toBeTruthy();
  });

  it('the councillor can ask the ward', async () => {
    render(<UpdatesPage persona={personaById('councillor')} now={now} />);
    expect(await screen.findByRole('heading', { name: 'Ask the ward' })).toBeTruthy();
  });
});

describe('Insights (Bhavana)', () => {
  it('the City lead sees the corridor pulse and opens the board report', async () => {
    window.location.hash = '#/requests';
    render(<RequestsPage persona={personaById('city-lead')} now={now} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Insights' }));
    expect(screen.getByRole('list', { name: 'Key numbers' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Board report' }));
    expect(screen.getByRole('heading', { name: /City of Windsor 311: .* report/ })).toBeTruthy();
    expect(screen.getByText(/You said, we did/)).toBeTruthy();
  });

  it('crew members (not leads) do not get Insights', async () => {
    window.location.hash = '#/requests';
    render(<RequestsPage persona={personaById('city-crew')} now={now} />);
    await screen.findByRole('heading', { name: 'City of Windsor 311: work queue' });
    expect(screen.queryByRole('tab', { name: 'Insights' })).toBeNull();
  });
});

describe('"Me too" in the report form (Purab)', () => {
  it('suggests the pothole already on the map nearby, and supports it instead', async () => {
    const onSupport = vi.fn(async () => {});
    const nearby = [{ id: 'req-07', title: 'Pothole on Wyandotte at Pierre Ave', category: 'Roads', lng: -82.968989, lat: 42.328347, count: 2, supported: false }];
    render(<ReportProblem data={cards} mode="me" viewerId={DEMO_USER_ID} from={[-82.9683, 42.3289]} onSubmit={vi.fn()} onShow={vi.fn()} onClose={vi.fn()} nearby={nearby} onSupport={onSupport} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Pothole or road damage' }));
    fireEvent.change(screen.getByLabelText('Where is it?'), { target: { value: 'place-05' } });
    expect(screen.getByRole('heading', { name: 'Already reported nearby' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Support this instead' }));
    expect(await screen.findByRole('heading', { name: "You're supporting it" })).toBeTruthy();
    expect(onSupport).toHaveBeenCalledWith('req-07');
  });

  it('does not suggest a different kind of problem', () => {
    const nearby = [{ id: 'req-07', title: 'Pothole', category: 'Roads', lng: -82.968989, lat: 42.328347, count: 2, supported: false }];
    render(<ReportProblem data={cards} mode="me" viewerId={DEMO_USER_ID} from={[-82.9683, 42.3289]} onSubmit={vi.fn()} onShow={vi.fn()} onClose={vi.fn()} nearby={nearby} onSupport={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Street light out' }));
    fireEvent.change(screen.getByLabelText('Where is it?'), { target: { value: 'place-05' } });
    expect(screen.queryByRole('heading', { name: 'Already reported nearby' })).toBeNull();
  });
});

describe('"Was it fixed?" (Purab)', () => {
  it('the sender rates a resolved request', async () => {
    const lead = personaById('city-lead');
    await actOnRequest('req-issue-05', lead, 'acknowledge');
    await actOnRequest('req-issue-05', lead, 'resolve', { text: 'Lamp replaced.' });
    window.location.hash = '#/requests?id=req-issue-05';
    render(<RequestsPage persona={personaById('resident')} now={now} />);
    fireEvent.click(await screen.findByRole('button', { name: "Yes, it's fixed" }));
    expect(await screen.findByText("You said: it's fixed")).toBeTruthy();
  });
});

describe('supporters stay anonymous (privacy)', () => {
  it('a neighbour who supports a request sees organizations, not the sender or staff names', async () => {
    const { actOnRequest: act } = await import('../../data/api');
    await act('req-07', personaById('resident'), 'support');
    window.location.hash = '#/requests?id=req-07';
    render(<RequestsPage persona={personaById('resident')} now={now} />);
    const record = await screen.findByRole('region', { name: 'Record' });
    expect(record.textContent).not.toMatch(/Maya|Jordan|Sam|Chris/);
    expect(screen.getByText('City of Windsor 311, copy to Ward Councillor')).toBeTruthy();
  });
});
