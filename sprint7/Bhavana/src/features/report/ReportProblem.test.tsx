// KAN-35 (Purab): the Report a problem form, and sending a report through the data adapter.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import raw from '../../data/mock-data.json';
import { DEMO_BUSINESS_ID, DEMO_USER_ID, type CardData, type Item } from '../cards/cardData';
import { ReportProblem } from './ReportProblem';
import { clearSubmittedReports, getMapData, onDataChange, submitReport } from '../../data/api';

const data = raw as unknown as CardData;
const pharmacy = data.places.find((p) => p.id === 'place-10')!;
const here: [number, number] = [pharmacy.lng as number, pharmacy.lat as number];

afterEach(() => {
  cleanup();
  clearSubmittedReports();
});

function open(mode: 'me' | 'business' = 'me') {
  const onSubmit = vi.fn(async (_r: Item) => {});
  const onShow = vi.fn();
  const onClose = vi.fn();
  render(
    <ReportProblem
      data={data}
      mode={mode}
      viewerId={mode === 'business' ? DEMO_BUSINESS_ID : DEMO_USER_ID}
      from={here}
      onSubmit={onSubmit}
      onShow={onShow}
      onClose={onClose}
    />,
  );
  return { onSubmit, onShow, onClose };
}

const send = (name = /Send report/) => fireEvent.click(screen.getByRole('button', { name }));

describe('Report a problem (resident)', () => {
  it('opens as a dialog with the title focused', () => {
    open();
    const dialog = screen.getByRole('dialog', { name: 'Report a problem' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement?.textContent).toBe('Report a problem');
  });

  it('shows resident problems only, not business ones', () => {
    open();
    expect(screen.getByRole('radio', { name: 'Street light out' })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: /blocking my shop/ })).toBeNull();
  });

  it('says who it goes to before sending, and never the BIA', () => {
    open();
    expect(screen.getByText('Choose a problem to see who it goes to.')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Street light out' }));
    expect(screen.getByText('City of Windsor 311')).toBeTruthy();
    expect(screen.getByText('Ward Councillor')).toBeTruthy();
    expect(screen.getByText(/Private: only you and City of Windsor 311/)).toBeTruthy();
    // The "Goes to" box never names the BIA (the place list may still include the BIA's office as a location).
    const routeBox = screen.getByText(/Private: only you and/).closest('.rp-route')!;
    expect(routeBox.textContent).not.toMatch(/BIA/);
  });

  it('lists the nearest place first', () => {
    open();
    const options = screen.getAllByRole('option');
    expect(options[0].textContent).toBe('Choose the nearest place');
    expect(options[1].textContent).toMatch(/^Wyandotte Pharmacy/);
  });

  it('explains what is missing and does not send', () => {
    const { onSubmit } = open();
    send();
    expect(screen.getByText('Choose what the problem is.')).toBeTruthy();
    expect(screen.getByText('Choose where it is, from the list or on the map.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    expect((document.activeElement as HTMLInputElement).type).toBe('radio'); // focus moves to the first problem
  });

  it('needs details for "Something else"', () => {
    const { onSubmit } = open();
    fireEvent.click(screen.getByRole('radio', { name: 'Something else' }));
    fireEvent.change(screen.getByLabelText('Where is it?'), { target: { value: 'place-10' } });
    send();
    expect(screen.getByText('Describe the problem in a few words.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sends a private report to the City and confirms it', async () => {
    const { onSubmit, onShow } = open();
    fireEvent.click(screen.getByRole('radio', { name: 'Street light out' }));
    fireEvent.change(screen.getByLabelText('Where is it?'), { target: { value: 'place-10' } });
    fireEvent.change(screen.getByLabelText('Details (optional)'), { target: { value: 'Off for three nights.' } });
    send();
    await screen.findByRole('heading', { name: 'Report sent' });
    const report = onSubmit.mock.calls[0][0];
    expect(report).toMatchObject({
      kind: 'issue',
      status: 'reported',
      visibility: 'private until approved',
      reportedBy: DEMO_USER_ID,
      routedToProfile: 'profile-city',
      ccProfile: 'profile-councillor',
      placeId: 'place-10',
      description: 'Off for three nights.',
    });
    expect(screen.getByText(/went to City of Windsor 311, with a copy to Ward Councillor/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'See it on the map' }));
    expect(onShow).toHaveBeenCalledWith(report.id);
  });

  it('shows an error and keeps the form if sending fails', async () => {
    const onSubmit = vi.fn(async () => {
      throw new Error('offline');
    });
    render(<ReportProblem data={data} mode="me" viewerId={DEMO_USER_ID} from={here} onSubmit={onSubmit} onShow={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Pothole or road damage' }));
    fireEvent.change(screen.getByLabelText('Where is it?'), { target: { value: 'place-10' } });
    send();
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Report a problem' })).toBeTruthy();
  });

  it('closes with Escape, Cancel or ×', () => {
    const { onClose } = open();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});

describe('Request help from the BIA (My business)', () => {
  it('offers business requests and sends them to the BIA', async () => {
    const { onSubmit } = open('business');
    expect(screen.getByRole('dialog', { name: 'Request help from the BIA' })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: 'Street light out' })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Roadwork or access blocking my shop' }));
    expect(screen.getByText('Olde Riverside BIA')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Where is it?'), { target: { value: 'place-01' } });
    send(/Send to the BIA/);
    await screen.findByRole('heading', { name: 'Sent to your BIA' });
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ reportedBy: DEMO_BUSINESS_ID, routedToProfile: 'profile-bia' });
  });
});

describe('submitReport (data adapter)', () => {
  const report = { id: 'report-test-1', kind: 'issue', chip: 'issues', name: 'Test', category: 'Roads', status: 'reported', lat: 42.33, lng: -82.97, illustrative: true } as never;

  it('stores the report, includes it in the map data and tells listeners', async () => {
    const listener = vi.fn();
    const off = onDataChange(listener);
    const before = (await getMapData()).updates.length;
    await submitReport(report);
    const after = await getMapData();
    expect(after.updates).toHaveLength(before + 1);
    expect(after.updates.at(-1)?.id).toBe('report-test-1');
    expect(listener).toHaveBeenCalledTimes(1);
    off();
  });

  it('refuses a duplicate id', async () => {
    await submitReport(report);
    await expect(submitReport(report)).rejects.toThrow(/already exists/);
  });

  it('starts empty again after clearing (tests only)', async () => {
    const base = (await getMapData()).updates.length;
    await submitReport(report);
    clearSubmittedReports();
    await waitFor(async () => expect((await getMapData()).updates).toHaveLength(base));
  });
});
